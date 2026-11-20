use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    state::SharedState,
};
use axum::{
    extract::{Query, State},
    Json,
};
use chrono::Datelike;
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct DailyQuery {
    pub date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SalesReportQuery {
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TopQuery {
    pub limit: Option<i64>,
    pub days: Option<i64>,
}

pub async fn get_dashboard_stats(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let today = chrono::Local::now().date_naive();
    let start_of_day = today.and_hms_opt(0, 0, 0).unwrap();
    let end_of_day = today.and_hms_opt(23, 59, 59).unwrap();

    // 1. Today sales aggregate
    let today_sales = sqlx::query!(
        r#"
        SELECT COALESCE(SUM("finalPrice"), 0) as "sum_final_price!",
               COUNT(id) as "count_id!"
        FROM sales
        WHERE date >= $1 AND date <= $2 AND status = 'COMPLETED'
        "#,
        start_of_day,
        end_of_day
    )
    .fetch_one(&state.db)
    .await?;

    // 2. Counts
    let total_products: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM products WHERE "isActive" = true"#
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let total_customers: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM customers"#
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    let low_stock_count: i64 = sqlx::query_scalar!(
        r#"SELECT COUNT(*) FROM products WHERE "isActive" = true AND stock <= "minStock""#
    )
    .fetch_one(&state.db)
    .await?
    .unwrap_or(0);

    // 3. Recent sales
    let recent_sales_rows = sqlx::query(
        r#"
        SELECT s.id, s."receiptNumber", s.date, s."finalPrice", s.status::text,
               CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) ELSE NULL END as customer,
               CASE WHEN u.id IS NOT NULL THEN json_build_object('name', u.name) ELSE NULL END as "user"
        FROM sales s
        LEFT JOIN customers c ON s."customerId" = c.id
        LEFT JOIN users u ON s."userId" = u.id
        WHERE s.status = 'COMPLETED'
        ORDER BY s.id DESC
        LIMIT 5
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let mut recent_sales = Vec::new();
    for r in recent_sales_rows {
        recent_sales.push(json!({
            "id": r.get::<i32, _>("id"),
            "receiptNumber": r.get::<String, _>("receiptNumber"),
            "date": r.get::<chrono::NaiveDateTime, _>("date"),
            "finalPrice": r.get::<Decimal, _>("finalPrice"),
            "status": r.get::<String, _>("status"),
            "customer": r.get::<Option<Value>, _>("customer"),
            "user": r.get::<Option<Value>, _>("user")
        }));
    }

    Ok(Json(json!({
        "todayRevenue": today_sales.sum_final_price,
        "todayTransactions": today_sales.count_id,
        "totalProducts": total_products,
        "totalCustomers": total_customers,
        "lowStockCount": low_stock_count,
        "recentSales": recent_sales
    })))
}

pub async fn get_daily_sales(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Query(query): Query<DailyQuery>,
) -> Result<Json<Value>, AppError> {
    let target_date = match query.date {
        Some(d) => chrono::NaiveDate::parse_from_str(&d, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive()),
        None => chrono::Local::now().date_naive(),
    };

    let start_of_day = target_date.and_hms_opt(0, 0, 0).unwrap();
    let end_of_day = target_date.and_hms_opt(23, 59, 59).unwrap();

    let sales_rows = sqlx::query(
        r#"
        SELECT s.id, s."receiptNumber", s.date, s."totalPrice", s."discountAmount", s."finalPrice", s.status::text,
               CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) ELSE NULL END as customer,
               CASE WHEN u.id IS NOT NULL THEN json_build_object('name', u.name) ELSE NULL END as "user"
        FROM sales s
        LEFT JOIN customers c ON s."customerId" = c.id
        LEFT JOIN users u ON s."userId" = u.id
        WHERE s.date >= $1 AND s.date <= $2 AND s.status = 'COMPLETED'
        ORDER BY s.date DESC
        "#
    )
    .bind(start_of_day)
    .bind(end_of_day)
    .fetch_all(&state.db)
    .await?;

    let mut total_revenue = Decimal::ZERO;
    let mut sales_list = Vec::new();

    for r in &sales_rows {
        let final_price: Decimal = r.get("finalPrice");
        total_revenue += final_price;
        sales_list.push(json!({
            "id": r.get::<i32, _>("id"),
            "receiptNumber": r.get::<String, _>("receiptNumber"),
            "date": r.get::<chrono::NaiveDateTime, _>("date"),
            "totalPrice": r.get::<Decimal, _>("totalPrice"),
            "discountAmount": r.get::<Decimal, _>("discountAmount"),
            "finalPrice": final_price,
            "status": r.get::<String, _>("status"),
            "customer": r.get::<Option<Value>, _>("customer"),
            "user": r.get::<Option<Value>, _>("user")
        }));
    }

    let total_tx = sales_rows.len();
    let avg_value = if total_tx > 0 {
        total_revenue / Decimal::from(total_tx)
    } else {
        Decimal::ZERO
    };

    // Payment breakdown
    let payment_rows = sqlx::query(
        r#"
        SELECT p.method::text, SUM(p.amount - p.change) as total
        FROM payments p
        JOIN sales s ON p."saleId" = s.id
        WHERE s.date >= $1 AND s.date <= $2 AND s.status = 'COMPLETED'
        GROUP BY p.method
        "#
    )
    .bind(start_of_day)
    .bind(end_of_day)
    .fetch_all(&state.db)
    .await?;

    let mut payment_breakdown = serde_json::Map::new();
    for pr in payment_rows {
        let method: String = pr.get("method");
        let total: Decimal = pr.get("total");
        payment_breakdown.insert(method, json!(total));
    }

    Ok(Json(json!({
        "date": target_date.to_string(),
        "totalRevenue": total_revenue,
        "totalTransactions": total_tx,
        "avgTransactionValue": avg_value,
        "paymentBreakdown": payment_breakdown,
        "sales": sales_list
    })))
}

pub async fn get_sales_report(
    State(state): State<SharedState>,
    auth: AuthUser,
    Query(query): Query<SalesReportQuery>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["report.view"])?;

    let (start, end) = match (query.start_date, query.end_date) {
        (Some(s), Some(e)) => {
            let s_date = chrono::NaiveDate::parse_from_str(&s, "%Y-%m-%d")
                .unwrap_or_else(|_| chrono::Local::now().date_naive());
            let e_date = chrono::NaiveDate::parse_from_str(&e, "%Y-%m-%d")
                .unwrap_or_else(|_| chrono::Local::now().date_naive());
            (s_date.and_hms_opt(0, 0, 0).unwrap(), e_date.and_hms_opt(23, 59, 59).unwrap())
        }
        _ => {
            let now = chrono::Local::now().date_naive();
            let first_day = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1).unwrap();
            (first_day.and_hms_opt(0, 0, 0).unwrap(), now.and_hms_opt(23, 59, 59).unwrap())
        }
    };

    let summary = sqlx::query!(
        r#"
        SELECT COALESCE(SUM(s."finalPrice"), 0) as "total_revenue!",
               COUNT(s.id) as "total_sales!",
               COALESCE(SUM(s."finalPrice" - COALESCE(cost_sub.total_cost, 0)), 0) as "gross_profit!"
        FROM sales s
        LEFT JOIN (
            SELECT sd."saleId", SUM(COALESCE(p."costPrice", 0) * sd.quantity) as total_cost
            FROM sale_details sd
            JOIN products p ON sd."productId" = p.id
            GROUP BY sd."saleId"
        ) cost_sub ON s.id = cost_sub."saleId"
        WHERE s.date >= $1 AND s.date <= $2 AND s.status = 'COMPLETED'
        "#,
        start,
        end
    )
    .fetch_one(&state.db)
    .await?;

    // Chart daily grouping
    let chart_rows = sqlx::query(
        r#"
        SELECT TO_CHAR(s.date, 'YYYY-MM-DD') as day,
               COALESCE(SUM(s."finalPrice"), 0) as revenue,
               COUNT(DISTINCT s.id) as count,
               COALESCE(SUM(s."finalPrice" - COALESCE(cost_sub.total_cost, 0)), 0) as profit
        FROM sales s
        LEFT JOIN (
            SELECT sd."saleId", SUM(COALESCE(p."costPrice", 0) * sd.quantity) as total_cost
            FROM sale_details sd
            JOIN products p ON sd."productId" = p.id
            GROUP BY sd."saleId"
        ) cost_sub ON s.id = cost_sub."saleId"
        WHERE s.date >= $1 AND s.date <= $2 AND s.status = 'COMPLETED'
        GROUP BY TO_CHAR(s.date, 'YYYY-MM-DD')
        ORDER BY day ASC
        "#
    )
    .bind(start)
    .bind(end)
    .fetch_all(&state.db)
    .await?;

    let mut chart_data = Vec::new();
    for cr in chart_rows {
        let rev: Decimal = cr.get("revenue");
        let prof: Decimal = cr.get("profit");
        let rev_f64: f64 = rev.to_string().parse().unwrap_or(0.0);
        let prof_f64: f64 = prof.to_string().parse().unwrap_or(0.0);
        chart_data.push(json!({
            "date": cr.get::<String, _>("day"),
            "revenue": rev_f64,
            "transactions": cr.get::<i64, _>("count"),
            "profit": prof_f64
        }));
    }

    let tot_rev: f64 = summary.total_revenue.to_string().parse().unwrap_or(0.0);
    let gross_prof: f64 = summary.gross_profit.to_string().parse().unwrap_or(0.0);

    Ok(Json(json!({
        "summary": {
            "totalRevenue": tot_rev,
            "totalSales": summary.total_sales,
            "grossProfit": gross_prof
        },
        "chartData": chart_data
    })))
}

pub async fn get_top_products(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Query(query): Query<TopQuery>,
) -> Result<Json<Value>, AppError> {
    let limit = query.limit.unwrap_or(10);
    let days = query.days.unwrap_or(30);
    let since = chrono::Local::now().naive_local() - chrono::Duration::days(days);

    let rows = sqlx::query(
        r#"
        SELECT p.id, p.name, p.price, p.image,
               SUM(sd.quantity) as total_quantity,
               SUM(sd.subtotal) as total_revenue
        FROM sale_details sd
        JOIN sales s ON sd."saleId" = s.id
        JOIN products p ON sd."productId" = p.id
        WHERE s.date >= $1 AND s.status = 'COMPLETED'
        GROUP BY p.id
        ORDER BY total_quantity DESC
        LIMIT $2
        "#
    )
    .bind(since)
    .bind(limit)
    .fetch_all(&state.db)
    .await?;

    let mut result = Vec::new();
    for r in rows {
        result.push(json!({
            "product": {
                "id": r.get::<i32, _>("id"),
                "name": r.get::<String, _>("name"),
                "price": r.get::<Decimal, _>("price"),
                "image": r.get::<Option<String>, _>("image")
            },
            "totalQuantity": r.get::<i64, _>("total_quantity"),
            "totalRevenue": r.get::<Decimal, _>("total_revenue")
        }));
    }

    Ok(Json(json!(result)))
}

pub async fn get_peak_hours(
    State(state): State<SharedState>,
    auth: AuthUser,
    Query(query): Query<TopQuery>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["report.view"])?;

    let days = query.days.unwrap_or(30);
    let since = chrono::Local::now().naive_local() - chrono::Duration::days(days);

    let rows = sqlx::query(
        r#"
        SELECT EXTRACT(HOUR FROM date)::int as hour,
               COUNT(id) as count,
               COALESCE(SUM("finalPrice"), 0) as revenue
        FROM sales
        WHERE date >= $1 AND status = 'COMPLETED'
        GROUP BY hour
        ORDER BY hour ASC
        "#
    )
    .bind(since)
    .fetch_all(&state.db)
    .await?;

    let mut hourly_map = std::collections::HashMap::new();
    for r in rows {
        let hour: i32 = r.get("hour");
        let count: i64 = r.get("count");
        let revenue: Decimal = r.get("revenue");
        hourly_map.insert(hour, (count, revenue));
    }

    let mut result = Vec::new();
    for hour in 0..24 {
        let (count, revenue) = hourly_map.get(&hour).cloned().unwrap_or((0, Decimal::ZERO));
        result.push(json!({
            "hour": hour,
            "label": format!("{:02}:00", hour),
            "count": count,
            "revenue": revenue
        }));
    }

    Ok(Json(json!(result)))
}

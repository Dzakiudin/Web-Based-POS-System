use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{PaymentRequest, SaleItemRequest},
    state::SharedState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use rand::Rng;
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct CreateSalePayload {
    #[serde(rename = "totalPrice")]
    pub total_price: Option<Decimal>,
    #[serde(rename = "discountAmount")]
    pub discount_amount: Option<Decimal>,
    #[serde(rename = "finalPrice")]
    pub final_price: Option<Decimal>,
    pub notes: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<i32>,
    pub items: Option<Vec<SaleItemRequest>>,
    pub details: Option<Vec<SaleItemRequest>>,
    pub payments: Vec<PaymentRequest>,
}

#[derive(Debug, Deserialize)]
pub struct SalesFilter {
    pub status: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ReasonPayload {
    pub reason: String,
}

fn generate_receipt_number() -> String {
    let now = chrono::Local::now();
    let date_str = now.format("%Y%m%d").to_string();
    let mut rng = rand::thread_rng();
    let rand_num: u32 = rng.gen_range(100000..999999);
    format!("RCP-{}-{:X}", date_str, rand_num)
}

fn parse_decimal(v: &Value) -> Option<Decimal> {
    match v {
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Some(Decimal::from(i))
            } else if let Some(f) = n.as_f64() {
                let s = format!("{}", f);
                s.parse::<Decimal>().ok()
            } else {
                None
            }
        }
        Value::String(s) => s.parse::<Decimal>().ok(),
        _ => None,
    }
}

pub async fn create_sale(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(raw_val): Json<Value>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["transaction.create"])?;
    tracing::info!("CREATE_SALE RAW PAYLOAD: {}", raw_val);

    let raw_items = raw_val
        .get("details")
        .or_else(|| raw_val.get("items"))
        .and_then(|v| v.as_array())
        .ok_or_else(|| AppError::BadRequest("Item transaksi tidak ditemukan".to_string()))?;

    if raw_items.is_empty() {
        return Err(AppError::BadRequest("Keranjang belanja tidak boleh kosong".to_string()));
    }

    struct RawItemInput {
        product_id: i32,
        variant_id: Option<i32>,
        quantity: i32,
        discount_amount: Decimal,
    }

    let mut raw_parsed_items = Vec::with_capacity(raw_items.len());
    for it in raw_items {
        let product_id = it
            .get("productId")
            .or_else(|| it.get("id"))
            .and_then(|v| v.as_i64())
            .ok_or_else(|| AppError::BadRequest("ID produk tidak valid".to_string()))? as i32;

        let variant_id = it.get("variantId").and_then(|v| v.as_i64()).map(|x| x as i32);
        let quantity = it
            .get("quantity")
            .and_then(|v| v.as_i64())
            .ok_or_else(|| AppError::BadRequest("Jumlah item tidak valid".to_string()))? as i32;

        if quantity <= 0 || quantity > 10_000 {
            return Err(AppError::BadRequest(
                "Jumlah pembelian setiap produk harus lebih dari 0".to_string(),
            ));
        }

        let discount_amount = it
            .get("discountAmount")
            .or_else(|| it.get("discount"))
            .and_then(parse_decimal)
            .unwrap_or(Decimal::ZERO);

        if discount_amount < Decimal::ZERO {
            return Err(AppError::BadRequest(
                "Diskon item tidak boleh bernilai negatif".to_string(),
            ));
        }

        raw_parsed_items.push(RawItemInput {
            product_id,
            variant_id,
            quantity,
            discount_amount,
        });
    }

    let customer_id = raw_val.get("customerId").and_then(|v| v.as_i64()).map(|x| x as i32);
    let notes = raw_val
        .get("notes")
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if let Some(ref n) = notes {
        if n.len() > 500 {
            return Err(AppError::BadRequest(
                "Catatan transaksi maksimal 500 karakter".to_string(),
            ));
        }
    }

    let receipt_number = generate_receipt_number();

    // Fetch POS operational rules (requireOpenShift, taxRate, serviceChargeRate)
    let settings_row = sqlx::query(
        r#"SELECT "requireOpenShift", "taxRate", "serviceChargeRate" FROM store_settings WHERE id = 1"#,
    )
    .fetch_optional(&state.db)
    .await?;

    let (require_open_shift, tax_rate, service_charge_rate) = match settings_row {
        Some(r) => (
            r.get::<bool, _>("requireOpenShift"),
            r.get::<Decimal, _>("taxRate"),
            r.get::<Decimal, _>("serviceChargeRate"),
        ),
        None => (false, Decimal::ZERO, Decimal::ZERO),
    };

    // Check for open cash session (prefer user's own session, fallback to any active open session)
    let cash_session = sqlx::query!(
        r#"
        SELECT id FROM cash_sessions
        WHERE status = 'OPEN'
        ORDER BY CASE WHEN "userId" = $1 THEN 0 ELSE 1 END, "openedAt" DESC
        LIMIT 1
        "#,
        auth.id
    )
    .fetch_optional(&state.db)
    .await?;

    let cash_session_id = cash_session.map(|s| s.id);

    if require_open_shift && cash_session_id.is_none() {
        return Err(AppError::BadRequest(
            "Shift kasir wajib dibuka terlebih dahulu sebelum melakukan transaksi. Silakan buka shift di menu Arus Kas.".to_string(),
        ));
    }

    // Start SQL transaction (authoritative price resolution + stock deduction + voucher atomic)
    let mut tx = state.db.begin().await?;

    struct ItemData {
        product_id: i32,
        variant_id: Option<i32>,
        quantity: i32,
        unit_price: Decimal,
        discount_amount: Decimal,
        subtotal: Decimal,
    }

    let mut items = Vec::with_capacity(raw_parsed_items.len());
    for raw_it in raw_parsed_items {
        // Resolve authoritative unit price directly from DB (never trust client-submitted price)
        let db_price: Decimal = if let Some(vid) = raw_it.variant_id {
            sqlx::query_scalar::<_, Decimal>(
                r#"SELECT price FROM product_variants WHERE id = $1 AND "productId" = $2 AND "isActive" = true"#,
            )
            .bind(vid)
            .bind(raw_it.product_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| {
                AppError::BadRequest(format!("Varian produk #{} tidak ditemukan atau nonaktif", vid))
            })?
        } else {
            sqlx::query_scalar::<_, Decimal>(
                r#"SELECT price FROM products WHERE id = $1 AND "isActive" = true"#,
            )
            .bind(raw_it.product_id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(|| {
                AppError::BadRequest(format!(
                    "Produk #{} tidak ditemukan atau sudah dinonaktifkan",
                    raw_it.product_id
                ))
            })?
        };

        let line_gross = db_price * Decimal::from(raw_it.quantity);
        if raw_it.discount_amount > line_gross {
            return Err(AppError::BadRequest(
                "Diskon item melebihi subtotal item".to_string(),
            ));
        }

        items.push(ItemData {
            product_id: raw_it.product_id,
            variant_id: raw_it.variant_id,
            quantity: raw_it.quantity,
            unit_price: db_price,
            discount_amount: raw_it.discount_amount,
            subtotal: line_gross - raw_it.discount_amount,
        });
    }

    let calculated_total: Decimal = items.iter().map(|i| i.subtotal).sum();
    let discount_amount = raw_val
        .get("discountAmount")
        .and_then(parse_decimal)
        .unwrap_or(Decimal::ZERO);

    if discount_amount < Decimal::ZERO || discount_amount > calculated_total {
        return Err(AppError::BadRequest(
            "Nominal diskon transaksi tidak valid".to_string(),
        ));
    }

    let after_discount = calculated_total - discount_amount;
    let tax_amount = if tax_rate > Decimal::ZERO {
        ((after_discount * tax_rate) / Decimal::from(100)).round_dp(0)
    } else {
        Decimal::ZERO
    };
    let service_charge_amount = if service_charge_rate > Decimal::ZERO {
        ((after_discount * service_charge_rate) / Decimal::from(100)).round_dp(0)
    } else {
        Decimal::ZERO
    };
    let final_price = after_discount + tax_amount + service_charge_amount;

    struct PaymentData {
        method: String,
        amount: Decimal,
        change: Decimal,
        reference: Option<String>,
    }

    let mut payments = Vec::new();
    if let Some(p_arr) = raw_val.get("payments").and_then(|v| v.as_array()) {
        for p in p_arr {
            let mut method = p
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or("CASH")
                .to_uppercase();
            if method == "TRANSFER" {
                method = "EWALLET".to_string();
            }
            if !matches!(method.as_str(), "CASH" | "QRIS" | "CARD" | "EWALLET") {
                return Err(AppError::BadRequest(format!(
                    "Metode pembayaran '{}' tidak valid",
                    method
                )));
            }
            let amount = p.get("amount").and_then(parse_decimal).unwrap_or(final_price);
            let change = p.get("change").and_then(parse_decimal).unwrap_or(Decimal::ZERO);
            if amount < Decimal::ZERO || change < Decimal::ZERO {
                return Err(AppError::BadRequest(
                    "Nominal pembayaran dan kembalian tidak boleh negatif".to_string(),
                ));
            }
            let reference = p
                .get("reference")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            payments.push(PaymentData {
                method,
                amount,
                change,
                reference,
            });
        }
    } else if let Some(m) = raw_val.get("method").and_then(|v| v.as_str()) {
        let mut method = m.to_uppercase();
        if method == "TRANSFER" {
            method = "EWALLET".to_string();
        }
        if !matches!(method.as_str(), "CASH" | "QRIS" | "CARD" | "EWALLET") {
            return Err(AppError::BadRequest(format!(
                "Metode pembayaran '{}' tidak valid",
                method
            )));
        }
        let amount = raw_val
            .get("paid")
            .or_else(|| raw_val.get("amount"))
            .and_then(parse_decimal)
            .unwrap_or(final_price);
        let change = raw_val
            .get("change")
            .and_then(parse_decimal)
            .unwrap_or(Decimal::ZERO);
        if amount < Decimal::ZERO || change < Decimal::ZERO {
            return Err(AppError::BadRequest(
                "Nominal pembayaran dan kembalian tidak boleh negatif".to_string(),
            ));
        }
        payments.push(PaymentData {
            method,
            amount,
            change,
            reference: None,
        });
    }

    if payments.is_empty() {
        return Err(AppError::BadRequest(
            "Data pembayaran tidak boleh kosong".to_string(),
        ));
    }

    // Server-authoritative payment sufficiency check & change normalization
    let total_paid: Decimal = payments.iter().map(|p| p.amount).sum();
    if total_paid < final_price {
        return Err(AppError::BadRequest(format!(
            "Nominal pembayaran (Rp {}) kurang dari total tagihan (Rp {})",
            total_paid, final_price
        )));
    }
    if payments.len() == 1 {
        if payments[0].method == "CASH" {
            payments[0].change = payments[0].amount - final_price;
        } else {
            payments[0].amount = final_price;
            payments[0].change = Decimal::ZERO;
        }
    } else {
        let total_net: Decimal = payments.iter().map(|p| p.amount - p.change).sum();
        if total_net < final_price {
            return Err(AppError::BadRequest(
                "Total pembayaran bersih kurang dari total tagihan".to_string(),
            ));
        }
    }

    // 1. Insert Sale
    let sale_row = sqlx::query(
        r#"
        INSERT INTO sales (
            "receiptNumber", date, "totalPrice", "discountAmount", "finalPrice",
            status, notes, "customerId", "userId", "cashSessionId", "createdAt", "updatedAt"
        )
        VALUES ($1, NOW(), $2, $3, $4, 'COMPLETED', $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, "receiptNumber", "totalPrice", "discountAmount", "finalPrice", status, "createdAt"
        "#
    )
    .bind(&receipt_number)
    .bind(calculated_total)
    .bind(discount_amount)
    .bind(final_price)
    .bind(notes)
    .bind(customer_id)
    .bind(auth.id)
    .bind(cash_session_id)
    .fetch_one(&mut *tx)
    .await?;

    let sale_id: i32 = sale_row.get("id");

    // 2. Insert Sale Details & Deduct Stock
    for item in &items {
        sqlx::query(
            r#"
            INSERT INTO sale_details ("saleId", "productId", "variantId", quantity, "unitPrice", "discountAmount", subtotal)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#
        )
        .bind(sale_id)
        .bind(item.product_id)
        .bind(item.variant_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.discount_amount)
        .bind(item.subtotal)
        .execute(&mut *tx)
        .await?;

        // Decrement product stock with guard (prevent negative stock)
        let update_result = sqlx::query(
            r#"
            UPDATE products
            SET stock = stock - $1, "updatedAt" = NOW()
            WHERE id = $2 AND stock >= $1
            "#
        )
        .bind(item.quantity)
        .bind(item.product_id)
        .execute(&mut *tx)
        .await?;

        if update_result.rows_affected() == 0 {
            // Find product name and available stock to return clear error
            let prod_info = sqlx::query(
                r#"SELECT name, stock FROM products WHERE id = $1"#
            )
            .bind(item.product_id)
            .fetch_optional(&mut *tx)
            .await?;

            let err_msg = match prod_info {
                Some(p) => {
                    let p_name: String = p.get("name");
                    let p_stock: i32 = p.get("stock");
                    format!("Stok untuk '{}' tidak mencukupi (sisa: {}, diminta: {})", p_name, p_stock, item.quantity)
                }
                None => format!("Produk dengan ID {} tidak ditemukan", item.product_id),
            };
            return Err(AppError::BadRequest(err_msg));
        }

        // Stock movement record
        sqlx::query(
            r#"
            INSERT INTO stock_movements ("productId", type, quantity, reason, reference, "userId")
            VALUES ($1, 'SALE', $2, 'Sale checkout', $3, $4)
            "#
        )
        .bind(item.product_id)
        .bind(-item.quantity)
        .bind(&receipt_number)
        .bind(auth.id)
        .execute(&mut *tx)
        .await?;
    }

    // 3. Insert Payments
    for p in &payments {
        sqlx::query(
            r#"
            INSERT INTO payments ("saleId", method, amount, change, reference)
            VALUES ($1, $2::"PaymentMethod", $3, $4, $5)
            "#
        )
        .bind(sale_id)
        .bind(&p.method)
        .bind(p.amount)
        .bind(p.change)
        .bind(&p.reference)
        .execute(&mut *tx)
        .await?;
    }

    // 4. Update Customer Points & Total Spent if customer exists
    if let Some(cust_id) = customer_id {
        // Calculate points: 1 point per 10,000
        let added_points = (final_price / Decimal::from(10000)).to_string().parse::<f64>().unwrap_or(0.0) as i32;

        sqlx::query(
            r#"
            UPDATE customers
            SET "loyaltyPoints" = "loyaltyPoints" + $1,
                "totalSpent" = "totalSpent" + $2,
                "updatedAt" = NOW()
            WHERE id = $3
            "#
        )
        .bind(added_points)
        .bind(final_price)
        .bind(cust_id)
        .execute(&mut *tx)
        .await?;
    }

    // 5. Atomically redeem Voucher or increment Promo Discount usage inside transaction
    let voucher_id = raw_val.get("voucherId").and_then(|v| v.as_i64()).map(|x| x as i32);
    let voucher_code = raw_val
        .get("voucherCode")
        .and_then(|v| v.as_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    if let Some(vid) = voucher_id {
        let res = sqlx::query(
            r#"
            UPDATE vouchers
            SET "isUsed" = true, "usedAt" = NOW()
            WHERE id = $1 AND "isUsed" = false AND "expiresAt" > NOW()
            "#,
        )
        .bind(vid)
        .execute(&mut *tx)
        .await?;

        if res.rows_affected() == 0 {
            return Err(AppError::BadRequest(
                "Voucher sudah terpakai atau telah kedaluwarsa".to_string(),
            ));
        }
    } else if let Some(vcode) = voucher_code {
        // Check if code belongs to a single-use voucher first
        let is_voucher_exists = sqlx::query_scalar::<_, i32>(
            r#"SELECT id FROM vouchers WHERE UPPER(code) = UPPER($1) LIMIT 1"#,
        )
        .bind(vcode)
        .fetch_optional(&mut *tx)
        .await?;

        if is_voucher_exists.is_some() {
            let res = sqlx::query(
                r#"
                UPDATE vouchers
                SET "isUsed" = true, "usedAt" = NOW()
                WHERE UPPER(code) = UPPER($1) AND "isUsed" = false AND "expiresAt" > NOW()
                "#,
            )
            .bind(vcode)
            .execute(&mut *tx)
            .await?;

            if res.rows_affected() == 0 {
                return Err(AppError::BadRequest(
                    "Voucher sudah terpakai atau telah kedaluwarsa".to_string(),
                ));
            }
        } else {
            // Check if code belongs to a promo discount and enforce maxUses atomically
            let is_discount_exists = sqlx::query_scalar::<_, i32>(
                r#"SELECT id FROM discounts WHERE UPPER(code) = UPPER($1) LIMIT 1"#,
            )
            .bind(vcode)
            .fetch_optional(&mut *tx)
            .await?;

            if is_discount_exists.is_some() {
                let res = sqlx::query(
                    r#"
                    UPDATE discounts
                    SET "usedCount" = "usedCount" + 1, "updatedAt" = NOW()
                    WHERE UPPER(code) = UPPER($1)
                      AND "isActive" = true
                      AND ("maxUses" IS NULL OR "usedCount" < "maxUses")
                      AND ("endDate" IS NULL OR "endDate" >= NOW())
                    "#,
                )
                .bind(vcode)
                .execute(&mut *tx)
                .await?;

                if res.rows_affected() == 0 {
                    return Err(AppError::BadRequest(
                        "Promo sudah mencapai batas pemakaian atau tidak aktif".to_string(),
                    ));
                }
            }
        }
    }

    // 6. Audit Log
    sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'CREATE_SALE', 'Sale', $2, $3)
        "#
    )
    .bind(auth.id)
    .bind(sale_id)
    .bind(json!({ "receiptNumber": receipt_number, "finalPrice": final_price }).to_string())
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({
        "id": sale_id,
        "receiptNumber": receipt_number,
        "totalPrice": calculated_total,
        "discountAmount": discount_amount,
        "taxRate": tax_rate,
        "taxAmount": tax_amount,
        "serviceChargeRate": service_charge_rate,
        "serviceChargeAmount": service_charge_amount,
        "finalPrice": final_price,
        "status": "COMPLETED",
        "message": "Sale created successfully"
    })))
}

pub async fn get_sales(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Query(filter): Query<SalesFilter>,
) -> Result<Json<Value>, AppError> {
    let limit = filter.limit.unwrap_or(20);
    let offset = filter.offset.unwrap_or(0);

    let rows = sqlx::query(
        r#"
        SELECT s.id, s."receiptNumber", s.date, s."totalPrice", s."discountAmount",
               s."finalPrice", s.status::text, s.notes, s."createdAt",
               CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) ELSE NULL END as customer,
               CASE WHEN u.id IS NOT NULL THEN json_build_object('name', u.name) ELSE NULL END as "user",
               COALESCE(
                 json_agg(
                   json_build_object('id', p.id, 'method', p.method::text, 'amount', p.amount, 'change', p.change)
                 ) FILTER (WHERE p.id IS NOT NULL),
                 '[]'::json
               ) as payments,
               (SELECT COUNT(*)::int FROM sale_details sd WHERE sd."saleId" = s.id) as item_count
        FROM sales s
        LEFT JOIN customers c ON s."customerId" = c.id
        LEFT JOIN users u ON s."userId" = u.id
        LEFT JOIN payments p ON s.id = p."saleId"
        WHERE ($1::text IS NULL OR s.status = $1::"SaleStatus")
        GROUP BY s.id, c.id, u.id
        ORDER BY s.id DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(filter.status)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let total_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sales")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let mut sales_list = Vec::new();
    for row in rows {
        sales_list.push(json!({
            "id": row.get::<i32, _>("id"),
            "receiptNumber": row.get::<String, _>("receiptNumber"),
            "date": row.get::<chrono::NaiveDateTime, _>("date"),
            "totalPrice": row.get::<Decimal, _>("totalPrice"),
            "discountAmount": row.get::<Decimal, _>("discountAmount"),
            "finalPrice": row.get::<Decimal, _>("finalPrice"),
            "status": row.get::<String, _>("status"),
            "notes": row.get::<Option<String>, _>("notes"),
            "customer": row.get::<Option<Value>, _>("customer"),
            "user": row.get::<Option<Value>, _>("user"),
            "payments": row.get::<Value, _>("payments"),
            "_count": { "details": row.get::<i32, _>("item_count") }
        }));
    }

    Ok(Json(json!({
        "sales": sales_list,
        "total": total_count
    })))
}

pub async fn get_sale(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    let sale_row = sqlx::query(
        r#"
        SELECT s.id, s."receiptNumber", s.date, s."totalPrice", s."discountAmount",
               s."finalPrice", s.status::text, s.notes, s."refundReason", s."createdAt",
               CASE WHEN c.id IS NOT NULL THEN
                 json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'email', c.email, 'loyaltyPoints', c."loyaltyPoints")
               ELSE NULL END as customer,
               CASE WHEN u.id IS NOT NULL THEN
                 json_build_object('id', u.id, 'name', u.name)
               ELSE NULL END as "user"
        FROM sales s
        LEFT JOIN customers c ON s."customerId" = c.id
        LEFT JOIN users u ON s."userId" = u.id
        WHERE s.id = $1
        "#
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Sale not found".to_string()))?;

    // Details with product
    let details_rows = sqlx::query(
        r#"
        SELECT sd.id, sd."productId", sd."variantId", sd.quantity, sd."unitPrice", sd."discountAmount", sd.subtotal,
               json_build_object('id', p.id, 'name', p.name, 'sku', p.sku, 'price', p.price) as product,
               CASE WHEN v.id IS NOT NULL THEN
                 json_build_object('id', v.id, 'name', v.name, 'price', v.price)
               ELSE NULL END as variant
        FROM sale_details sd
        JOIN products p ON sd."productId" = p.id
        LEFT JOIN product_variants v ON sd."variantId" = v.id
        WHERE sd."saleId" = $1
        "#
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let mut details = Vec::new();
    for d in details_rows {
        details.push(json!({
            "id": d.get::<i32, _>("id"),
            "productId": d.get::<i32, _>("productId"),
            "variantId": d.get::<Option<i32>, _>("variantId"),
            "quantity": d.get::<i32, _>("quantity"),
            "unitPrice": d.get::<Decimal, _>("unitPrice"),
            "discountAmount": d.get::<Decimal, _>("discountAmount"),
            "subtotal": d.get::<Decimal, _>("subtotal"),
            "product": d.get::<Value, _>("product"),
            "variant": d.get::<Option<Value>, _>("variant"),
        }));
    }

    // Payments
    let payments_rows = sqlx::query(
        r#"
        SELECT id, method::text, amount, change, reference
        FROM payments
        WHERE "saleId" = $1
        "#
    )
    .bind(id)
    .fetch_all(&state.db)
    .await?;

    let mut payments = Vec::new();
    for p in payments_rows {
        payments.push(json!({
            "id": p.get::<i32, _>("id"),
            "method": p.get::<String, _>("method"),
            "amount": p.get::<Decimal, _>("amount"),
            "change": p.get::<Decimal, _>("change"),
            "reference": p.get::<Option<String>, _>("reference"),
        }));
    }

    Ok(Json(json!({
        "id": sale_row.get::<i32, _>("id"),
        "receiptNumber": sale_row.get::<String, _>("receiptNumber"),
        "date": sale_row.get::<chrono::NaiveDateTime, _>("date"),
        "totalPrice": sale_row.get::<Decimal, _>("totalPrice"),
        "discountAmount": sale_row.get::<Decimal, _>("discountAmount"),
        "finalPrice": sale_row.get::<Decimal, _>("finalPrice"),
        "status": sale_row.get::<String, _>("status"),
        "notes": sale_row.get::<Option<String>, _>("notes"),
        "refundReason": sale_row.get::<Option<String>, _>("refundReason"),
        "customer": sale_row.get::<Option<Value>, _>("customer"),
        "user": sale_row.get::<Option<Value>, _>("user"),
        "details": details,
        "payments": payments
    })))
}

pub async fn void_sale(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<ReasonPayload>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["void.transaction"])?;

    let mut tx = state.db.begin().await?;

    // Atomic status transition inside transaction to prevent double-void / double-stock-restore
    let updated_row = sqlx::query(
        r#"
        UPDATE sales
        SET status = 'VOIDED', "refundReason" = $1, "updatedAt" = NOW()
        WHERE id = $2 AND status = 'COMPLETED'
        RETURNING "receiptNumber", "finalPrice"
        "#,
    )
    .bind(&payload.reason)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;

    let updated_row = match updated_row {
        Some(r) => r,
        None => {
            let exists = sqlx::query_scalar::<_, i32>("SELECT id FROM sales WHERE id = $1")
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?;
            if exists.is_none() {
                return Err(AppError::NotFound("Sale not found".to_string()));
            }
            return Err(AppError::BadRequest(
                "Only completed sales can be voided".to_string(),
            ));
        }
    };

    let receipt_number: String = updated_row.get("receiptNumber");
    let final_price: Decimal = updated_row.get("finalPrice");

    // Restore stock
    let details = sqlx::query!(
        r#"SELECT "productId", quantity FROM sale_details WHERE "saleId" = $1"#,
        id
    )
    .fetch_all(&mut *tx)
    .await?;

    for d in details {
        sqlx::query!(
            r#"UPDATE products SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2"#,
            d.quantity,
            d.productId
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"
            INSERT INTO stock_movements ("productId", type, quantity, reason, reference, "userId")
            VALUES ($1, 'REFUND', $2, $3, $4, $5)
            "#,
            d.productId,
            d.quantity,
            format!("Void: {}", payload.reason),
            receipt_number,
            auth.id
        )
        .execute(&mut *tx)
        .await?;
    }

    // Record audit log for VOID
    sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'VOID', 'Sale', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(id)
    .bind(
        json!({
            "receiptNumber": receipt_number,
            "finalPrice": final_price,
            "reason": payload.reason
        })
        .to_string(),
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({ "message": "Sale voided successfully" })))
}

pub async fn refund_sale(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<ReasonPayload>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["refund.process"])?;

    let mut tx = state.db.begin().await?;

    // Atomic status transition inside transaction to prevent double-refund / double-stock-restore
    let updated_row = sqlx::query(
        r#"
        UPDATE sales
        SET status = 'REFUNDED', "refundReason" = $1, "updatedAt" = NOW()
        WHERE id = $2 AND status = 'COMPLETED'
        RETURNING "receiptNumber", "finalPrice"
        "#,
    )
    .bind(&payload.reason)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;

    let updated_row = match updated_row {
        Some(r) => r,
        None => {
            let exists = sqlx::query_scalar::<_, i32>("SELECT id FROM sales WHERE id = $1")
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?;
            if exists.is_none() {
                return Err(AppError::NotFound("Sale not found".to_string()));
            }
            return Err(AppError::BadRequest(
                "Only completed sales can be refunded".to_string(),
            ));
        }
    };

    let receipt_number: String = updated_row.get("receiptNumber");
    let final_price: Decimal = updated_row.get("finalPrice");

    // Restore stock
    let details = sqlx::query!(
        r#"SELECT "productId", quantity FROM sale_details WHERE "saleId" = $1"#,
        id
    )
    .fetch_all(&mut *tx)
    .await?;

    for d in details {
        sqlx::query!(
            r#"UPDATE products SET stock = stock + $1, "updatedAt" = NOW() WHERE id = $2"#,
            d.quantity,
            d.productId
        )
        .execute(&mut *tx)
        .await?;

        sqlx::query!(
            r#"
            INSERT INTO stock_movements ("productId", type, quantity, reason, reference, "userId")
            VALUES ($1, 'REFUND', $2, $3, $4, $5)
            "#,
            d.productId,
            d.quantity,
            format!("Refund: {}", payload.reason),
            receipt_number,
            auth.id
        )
        .execute(&mut *tx)
        .await?;
    }

    // Record audit log for REFUND
    sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'REFUND', 'Sale', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(id)
    .bind(
        json!({
            "receiptNumber": receipt_number,
            "finalPrice": final_price,
            "reason": payload.reason
        })
        .to_string(),
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({ "message": "Sale refunded successfully" })))
}

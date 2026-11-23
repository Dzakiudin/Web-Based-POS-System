use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::CreateStockMovementRequest,
    state::SharedState,
};
use axum::{extract::State, Json};
use rust_decimal::Decimal;
use serde_json::{json, Value};
use sqlx::Row;

pub async fn get_stock_movements(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT sm.id, sm."productId", sm.type::text, sm.quantity, sm.reason, sm.reference, sm."createdAt",
               json_build_object('name', p.name, 'sku', p.sku) as product,
               CASE WHEN u.id IS NOT NULL THEN json_build_object('name', u.name) ELSE NULL END as "user"
        FROM stock_movements sm
        JOIN products p ON sm."productId" = p.id
        LEFT JOIN users u ON sm."userId" = u.id
        ORDER BY sm."createdAt" DESC
        LIMIT 100
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let mut list = Vec::new();
    for r in rows {
        list.push(json!({
            "id": r.get::<i32, _>("id"),
            "productId": r.get::<i32, _>("productId"),
            "type": r.get::<String, _>("type"),
            "quantity": r.get::<i32, _>("quantity"),
            "reason": r.get::<Option<String>, _>("reason"),
            "reference": r.get::<Option<String>, _>("reference"),
            "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
            "product": r.get::<Value, _>("product"),
            "user": r.get::<Option<Value>, _>("user")
        }));
    }

    Ok(Json(json!(list)))
}

pub async fn get_low_stock_products(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT p.id, p.name, p.sku, p.price, p.stock, p."minStock", p.image,
               CASE WHEN c.id IS NOT NULL THEN json_build_object('name', c.name) ELSE NULL END as category
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        WHERE p."isActive" = true AND p.stock <= p."minStock"
        ORDER BY p.stock ASC
        "#
    )
    .fetch_all(&state.db)
    .await?;

    let mut list = Vec::new();
    for r in rows {
        list.push(json!({
            "id": r.get::<i32, _>("id"),
            "name": r.get::<String, _>("name"),
            "sku": r.get::<Option<String>, _>("sku"),
            "price": r.get::<Decimal, _>("price"),
            "stock": r.get::<i32, _>("stock"),
            "minStock": r.get::<i32, _>("minStock"),
            "image": r.get::<Option<String>, _>("image"),
            "category": r.get::<Option<Value>, _>("category")
        }));
    }

    Ok(Json(json!(list)))
}

pub async fn create_stock_movement(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateStockMovementRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["stock.in_out", "stock.opname"])?;

    let mut tx = state.db.begin().await?;

    // Calculate stock delta
    let delta = match payload.movement_type.as_str() {
        "IN" => payload.quantity,
        "OUT" => -payload.quantity,
        "ADJUSTMENT" => {
            // Get current stock
            let current_stock = sqlx::query_scalar!(
                "SELECT stock FROM products WHERE id = $1",
                payload.product_id
            )
            .fetch_one(&mut *tx)
            .await?;
            payload.quantity - current_stock
        }
        _ => payload.quantity,
    };

    // Update product stock (guard against negative stock on OUT)
    let updated_row = sqlx::query(
        r#"
        UPDATE products
        SET stock = stock + $1, "updatedAt" = NOW()
        WHERE id = $2 AND (stock + $1) >= 0
        RETURNING name, stock
        "#,
    )
    .bind(delta)
    .bind(payload.product_id)
    .fetch_optional(&mut *tx)
    .await?;

    let updated_row = match updated_row {
        Some(r) => r,
        None => {
            return Err(AppError::BadRequest(
                "Produk tidak ditemukan atau stok tidak mencukupi (tidak boleh minus)".to_string(),
            ));
        }
    };

    let product_name: String = updated_row.get("name");
    let new_stock: i32 = updated_row.get("stock");

    // Insert stock movement record
    let row = sqlx::query(
        r#"
        INSERT INTO stock_movements ("productId", type, quantity, reason, reference, "userId")
        VALUES ($1, $2::"StockMovementType", $3, $4, $5, $6)
        RETURNING id
        "#,
    )
    .bind(payload.product_id)
    .bind(&payload.movement_type)
    .bind(payload.quantity)
    .bind(&payload.reason)
    .bind(&payload.reference)
    .bind(auth.id)
    .fetch_one(&mut *tx)
    .await?;

    let movement_id: i32 = row.get("id");

    // Audit log for stock adjustment
    sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'UPDATE', 'Product', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(payload.product_id)
    .bind(
        json!({
            "name": product_name,
            "type": payload.movement_type,
            "quantity": payload.quantity,
            "stock": new_stock,
            "reason": payload.reason.unwrap_or_default()
        })
        .to_string(),
    )
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(json!({
        "id": movement_id,
        "newStock": new_stock,
        "message": "Stock updated successfully"
    })))
}

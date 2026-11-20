use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{CreateDiscountRequest, Discount, DiscountType},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
pub struct ValidatePromoPayload {
    pub code: String,
    pub subtotal: Option<Decimal>,
}

pub async fn get_discounts(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Vec<Discount>>, AppError> {
    let discounts = sqlx::query_as::<_, Discount>(
        r#"
        SELECT id, name, type, value, "minPurchase", code, "startDate", "endDate",
               "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        FROM discounts
        ORDER BY id DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(discounts))
}

pub async fn create_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateDiscountRequest>,
) -> Result<Json<Discount>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let min_purchase = payload.min_purchase.unwrap_or(Decimal::ZERO);
    let start_date = payload
        .start_date
        .as_deref()
        .and_then(crate::models::parse_flexible_datetime)
        .unwrap_or_else(|| chrono::Local::now().naive_local());
    let end_date = payload
        .end_date
        .as_deref()
        .and_then(crate::models::parse_flexible_datetime);

    let discount = sqlx::query_as::<_, Discount>(
        r#"
        INSERT INTO discounts (name, type, value, "minPurchase", code, "startDate", "endDate", "isActive", "maxUses", "usedCount", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, 0, NOW())
        RETURNING id, name, type, value, "minPurchase", code, "startDate", "endDate", "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        "#
    )
    .bind(payload.name)
    .bind(payload.discount_type)
    .bind(payload.value)
    .bind(min_purchase)
    .bind(payload.code)
    .bind(start_date)
    .bind(end_date)
    .bind(payload.max_uses)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(discount))
}

pub async fn update_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateDiscountRequest>,
) -> Result<Json<Discount>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let min_purchase = payload.min_purchase.unwrap_or(Decimal::ZERO);
    let end_date = payload
        .end_date
        .as_deref()
        .and_then(crate::models::parse_flexible_datetime);

    let discount = sqlx::query_as::<_, Discount>(
        r#"
        UPDATE discounts
        SET name = $1, type = $2, value = $3, "minPurchase" = $4, code = $5,
            "endDate" = $6, "maxUses" = $7, "updatedAt" = NOW()
        WHERE id = $8
        RETURNING id, name, type, value, "minPurchase", code, "startDate", "endDate", "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        "#
    )
    .bind(payload.name)
    .bind(payload.discount_type)
    .bind(payload.value)
    .bind(min_purchase)
    .bind(payload.code)
    .bind(end_date)
    .bind(payload.max_uses)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Discount not found".to_string()))?;

    Ok(Json(discount))
}

pub async fn delete_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let rows_affected = sqlx::query!("DELETE FROM discounts WHERE id = $1", id)
        .execute(&state.db)
        .await?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Discount not found".to_string()));
    }

    Ok(Json(json!({ "message": "Discount deleted successfully" })))
}

pub async fn validate_promo_code(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Json(payload): Json<ValidatePromoPayload>,
) -> Result<Json<Value>, AppError> {
    let discount = sqlx::query_as::<_, Discount>(
        r#"
        SELECT id, name, type, value, "minPurchase", code, "startDate", "endDate",
               "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        FROM discounts
        WHERE code = $1 AND "isActive" = true
        "#,
    )
    .bind(&payload.code)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invalid promo code".to_string()))?;

    let subtotal = payload.subtotal.unwrap_or(Decimal::ZERO);
    if subtotal < discount.min_purchase {
        return Err(AppError::BadRequest(format!(
            "Minimum purchase of {} required",
            discount.min_purchase
        )));
    }

    let discount_amount = if discount.discount_type == DiscountType::Percentage {
        (subtotal * discount.value) / Decimal::from(100)
    } else {
        discount.value
    };

    Ok(Json(json!({
        "valid": true,
        "discount": discount,
        "discountAmount": discount_amount
    })))
}

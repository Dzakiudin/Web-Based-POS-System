use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{CreateVoucherRequest, Voucher},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rand::Rng;
use serde_json::{json, Value};

fn generate_voucher_code() -> String {
    let mut rng = rand::thread_rng();
    let num: u32 = rng.gen_range(100000..999999);
    format!("VCH-{}", num)
}

pub async fn get_vouchers(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Vec<Voucher>>, AppError> {
    let vouchers = sqlx::query_as::<_, Voucher>(
        r#"
        SELECT id, code, "customerId", "discountId", "isUsed", "usedAt", "expiresAt", "createdAt"
        FROM vouchers
        ORDER BY id DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(vouchers))
}

pub async fn create_voucher(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateVoucherRequest>,
) -> Result<Json<Voucher>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let code = payload.code.unwrap_or_else(generate_voucher_code);

    let voucher = sqlx::query_as::<_, Voucher>(
        r#"
        INSERT INTO vouchers (code, "customerId", "discountId", "isUsed", "expiresAt")
        VALUES ($1, $2, $3, false, $4)
        RETURNING id, code, "customerId", "discountId", "isUsed", "usedAt", "expiresAt", "createdAt"
        "#,
    )
    .bind(code)
    .bind(payload.customer_id)
    .bind(payload.discount_id)
    .bind(payload.expires_at)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(voucher))
}

pub async fn delete_voucher(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let rows_affected = sqlx::query!("DELETE FROM vouchers WHERE id = $1", id)
        .execute(&state.db)
        .await?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Voucher not found".to_string()));
    }

    Ok(Json(json!({ "message": "Voucher deleted successfully" })))
}

pub async fn validate_voucher(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(code): Path<String>,
) -> Result<Json<Value>, AppError> {
    let voucher = sqlx::query_as::<_, Voucher>(
        r#"
        SELECT id, code, "customerId", "discountId", "isUsed", "usedAt", "expiresAt", "createdAt"
        FROM vouchers
        WHERE code = $1
        "#,
    )
    .bind(&code)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Voucher not found".to_string()))?;

    if voucher.is_used {
        return Err(AppError::BadRequest("Voucher has already been used".to_string()));
    }

    if voucher.expires_at < chrono::Local::now().naive_local() {
        return Err(AppError::BadRequest("Voucher has expired".to_string()));
    }

    Ok(Json(json!({
        "valid": true,
        "voucher": voucher
    })))
}

pub async fn use_voucher(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    let rows_affected = sqlx::query!(
        r#"
        UPDATE vouchers
        SET "isUsed" = true, "usedAt" = NOW()
        WHERE id = $1 AND "isUsed" = false
        "#,
        id
    )
    .execute(&state.db)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::BadRequest("Voucher already used or not found".to_string()));
    }

    Ok(Json(json!({ "message": "Voucher marked as used" })))
}

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
    #[serde(default)]
    pub subtotal: Option<Value>,
}

fn parse_subtotal_decimal(v: &Option<Value>) -> Decimal {
    match v {
        Some(Value::Number(n)) => {
            if let Some(i) = n.as_i64() {
                Decimal::from(i)
            } else if let Some(f) = n.as_f64() {
                format!("{}", f).parse::<Decimal>().unwrap_or(Decimal::ZERO)
            } else {
                Decimal::ZERO
            }
        }
        Some(Value::String(s)) => s.parse::<Decimal>().unwrap_or(Decimal::ZERO),
        _ => Decimal::ZERO,
    }
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
    let code = payload.code.trim();
    if code.is_empty() {
        return Err(AppError::BadRequest("Kode promo tidak boleh kosong".to_string()));
    }

    let subtotal = parse_subtotal_decimal(&payload.subtotal);

    // 1. Cek langsung ke tabel discounts berdasarkan code (case-insensitive)
    let maybe_discount = sqlx::query_as::<_, Discount>(
        r#"
        SELECT id, name, type, value, "minPurchase", code, "startDate", "endDate",
               "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        FROM discounts
        WHERE UPPER(code) = UPPER($1) AND "isActive" = true
        "#,
    )
    .bind(code)
    .fetch_optional(&state.db)
    .await?;

    if let Some(discount) = maybe_discount {
        if subtotal < discount.min_purchase {
            return Err(AppError::BadRequest(format!(
                "Minimal pembelian Rp {} untuk menggunakan promo ini",
                discount.min_purchase
            )));
        }

        let now = chrono::Local::now().naive_local();
        if let Some(end) = discount.end_date {
            if end < now {
                return Err(AppError::BadRequest("Promo ini sudah berakhir".to_string()));
            }
        }

        if let Some(max) = discount.max_uses {
            if discount.used_count >= max {
                return Err(AppError::BadRequest("Batas pemakaian promo ini sudah habis".to_string()));
            }
        }

        let discount_amount = if discount.discount_type == DiscountType::Percentage {
            (subtotal * discount.value) / Decimal::from(100)
        } else {
            discount.value
        };

        return Ok(Json(json!({
            "valid": true,
            "discount": discount,
            "discountAmount": discount_amount
        })));
    }

    // 2. Jika tidak ada di tabel discounts, cek ke tabel vouchers (voucher kode unik)
    #[derive(sqlx::FromRow)]
    struct VoucherWithDiscount {
        voucher_id: i32,
        voucher_code: String,
        is_used: bool,
        expires_at: Option<chrono::NaiveDateTime>,
        discount_id: i32,
        discount_name: String,
        discount_type: DiscountType,
        discount_value: Decimal,
        min_purchase: Decimal,
        is_active: bool,
    }

    let maybe_voucher = sqlx::query_as::<_, VoucherWithDiscount>(
        r#"
        SELECT v.id as voucher_id, v.code as voucher_code, v."isUsed" as is_used, v."expiresAt" as expires_at,
               d.id as discount_id, d.name as discount_name, d.type as discount_type,
               d.value as discount_value, d."minPurchase" as min_purchase, d."isActive" as is_active
        FROM vouchers v
        JOIN discounts d ON v."discountId" = d.id
        WHERE UPPER(v.code) = UPPER($1)
        LIMIT 1
        "#,
    )
    .bind(code)
    .fetch_optional(&state.db)
    .await?;

    if let Some(v) = maybe_voucher {
        if v.is_used {
            return Err(AppError::BadRequest("Voucher ini sudah pernah digunakan".to_string()));
        }

        let now = chrono::Local::now().naive_local();
        if let Some(exp) = v.expires_at {
            if exp < now {
                return Err(AppError::BadRequest("Voucher ini sudah kedaluwarsa".to_string()));
            }
        }

        if !v.is_active {
            return Err(AppError::BadRequest("Diskon untuk voucher ini sedang dinonaktifkan".to_string()));
        }

        if subtotal < v.min_purchase {
            return Err(AppError::BadRequest(format!(
                "Minimal pembelian Rp {} untuk menggunakan voucher ini",
                v.min_purchase
            )));
        }

        let discount_amount = if v.discount_type == DiscountType::Percentage {
            (subtotal * v.discount_value) / Decimal::from(100)
        } else {
            v.discount_value
        };

        return Ok(Json(json!({
            "valid": true,
            "discount": {
                "id": v.discount_id,
                "name": v.discount_name,
                "type": v.discount_type,
                "value": v.discount_value,
                "code": v.voucher_code,
                "voucherId": v.voucher_id
            },
            "discountAmount": discount_amount
        })));
    }

    Err(AppError::NotFound("Kode promo atau voucher tidak valid".to_string()))
}

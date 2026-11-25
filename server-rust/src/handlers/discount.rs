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
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct ValidatePromoPayload {
    pub code: String,
    #[serde(default)]
    pub subtotal: Option<Value>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct WholesaleRule {
    pub id: i32,
    pub name: String,
    #[sqlx(rename = "minQuantity")]
    pub min_quantity: i32,
    #[sqlx(rename = "pricingMode")]
    pub pricing_mode: String,
    pub value: Decimal,
    #[sqlx(rename = "unitLabel")]
    pub unit_label: Option<String>,
}

/// Computes the monetary discount amount for a single wholesale/qty rule on (unit_price, quantity).
/// Never returns a negative value or exceeds line gross (unit_price * quantity).
pub fn calculate_wholesale_rule_discount(
    unit_price: Decimal,
    quantity: i32,
    min_quantity: i32,
    pricing_mode: &str,
    value: Decimal,
) -> Decimal {
    if quantity <= 0
        || min_quantity <= 0
        || quantity < min_quantity
        || unit_price <= Decimal::ZERO
    {
        return Decimal::ZERO;
    }

    let line_gross = unit_price * Decimal::from(quantity);
    let discount = match pricing_mode {
        "BUNDLE_PRICE" => {
            let bundles = quantity / min_quantity;
            let normal_bundle_price = unit_price * Decimal::from(min_quantity);
            let savings_per_bundle = (normal_bundle_price - value).max(Decimal::ZERO);
            savings_per_bundle * Decimal::from(bundles)
        }
        "UNIT_PRICE" => {
            let per_unit_savings = (unit_price - value).max(Decimal::ZERO);
            per_unit_savings * Decimal::from(quantity)
        }
        "PERCENTAGE" => {
            let pct = value.max(Decimal::ZERO).min(Decimal::from(100));
            ((line_gross * pct) / Decimal::from(100)).round_dp(0)
        }
        _ => Decimal::ZERO,
    };

    discount.max(Decimal::ZERO).min(line_gross)
}

/// Picks the best wholesale discount rule (maximum customer savings) for a given product & qty.
pub fn select_best_wholesale_discount(
    unit_price: Decimal,
    quantity: i32,
    rules: &[WholesaleRule],
) -> (Decimal, Option<i32>) {
    let mut best_discount = Decimal::ZERO;
    let mut best_rule_id: Option<i32> = None;

    for rule in rules {
        let d = calculate_wholesale_rule_discount(
            unit_price,
            quantity,
            rule.min_quantity,
            &rule.pricing_mode,
            rule.value,
        );
        if d > best_discount {
            best_discount = d;
            best_rule_id = Some(rule.id);
        }
    }

    (best_discount, best_rule_id)
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

struct NormalizedDiscountPayload {
    name: String,
    discount_type: DiscountType,
    value: Decimal,
    min_purchase: Decimal,
    code: Option<String>,
    scope: String,
    product_id: Option<i32>,
    min_quantity: i32,
    pricing_mode: String,
    unit_label: Option<String>,
    start_date: chrono::NaiveDateTime,
    end_date: Option<chrono::NaiveDateTime>,
    max_uses: Option<i32>,
    is_active: bool,
}

async fn validate_and_normalize_payload(
    state: &SharedState,
    payload: CreateDiscountRequest,
) -> Result<NormalizedDiscountPayload, AppError> {
    let name = payload.name.trim().to_string();
    if name.is_empty() {
        return Err(AppError::BadRequest(
            "Nama promo atau aturan diskon tidak boleh kosong".to_string(),
        ));
    }

    let scope = payload
        .scope
        .as_deref()
        .unwrap_or("ORDER")
        .trim()
        .to_uppercase();

    if scope != "ORDER" && scope != "PRODUCT_QTY" {
        return Err(AppError::BadRequest(
            "Scope diskon harus ORDER atau PRODUCT_QTY".to_string(),
        ));
    }

    let start_date = payload
        .start_date
        .as_deref()
        .and_then(crate::models::parse_flexible_datetime)
        .unwrap_or_else(|| chrono::Local::now().naive_local());
    let end_date = payload
        .end_date
        .as_deref()
        .and_then(crate::models::parse_flexible_datetime);
    let is_active = payload.is_active.unwrap_or(true);
    let max_uses = payload.max_uses.filter(|&m| m > 0);

    if scope == "PRODUCT_QTY" {
        let product_id = payload.product_id.ok_or_else(|| {
            AppError::BadRequest("Pilih produk target untuk diskon grosir / qty".to_string())
        })?;

        let prod_row = sqlx::query(
            r#"SELECT id, name, price FROM products WHERE id = $1 AND "isActive" = true"#,
        )
        .bind(product_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| {
            AppError::NotFound("Produk target tidak ditemukan atau sudah dinonaktifkan".to_string())
        })?;

        let product_price: Decimal = prod_row.get("price");
        let min_quantity = payload.min_quantity.unwrap_or(2);
        if min_quantity < 2 {
            return Err(AppError::BadRequest(
                "Minimal jumlah beli (Qty) untuk harga grosir / paket minimal 2 pcs".to_string(),
            ));
        }

        let pricing_mode = payload
            .pricing_mode
            .as_deref()
            .unwrap_or("BUNDLE_PRICE")
            .trim()
            .to_uppercase();

        if !matches!(
            pricing_mode.as_str(),
            "BUNDLE_PRICE" | "UNIT_PRICE" | "PERCENTAGE"
        ) {
            return Err(AppError::BadRequest(
                "Skema harga grosir harus BUNDLE_PRICE, UNIT_PRICE, atau PERCENTAGE".to_string(),
            ));
        }

        if payload.value <= Decimal::ZERO {
            return Err(AppError::BadRequest(
                "Nilai harga / diskon grosir harus lebih dari 0".to_string(),
            ));
        }

        match pricing_mode.as_str() {
            "BUNDLE_PRICE" => {
                let normal_bundle = product_price * Decimal::from(min_quantity);
                if payload.value >= normal_bundle {
                    return Err(AppError::BadRequest(format!(
                        "Harga paket {} pcs harus lebih murah dari harga normal total (Rp {})",
                        min_quantity, normal_bundle
                    )));
                }
            }
            "UNIT_PRICE" => {
                if payload.value >= product_price {
                    return Err(AppError::BadRequest(format!(
                        "Harga satuan grosir harus lebih murah dari harga eceran normal (Rp {})",
                        product_price
                    )));
                }
            }
            "PERCENTAGE" => {
                if payload.value > Decimal::from(100) {
                    return Err(AppError::BadRequest(
                        "Persentase diskon grosir maksimal 100%".to_string(),
                    ));
                }
            }
            _ => {}
        }

        let discount_type = if pricing_mode == "PERCENTAGE" {
            DiscountType::Percentage
        } else {
            DiscountType::Fixed
        };

        let unit_label = payload
            .unit_label
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());

        return Ok(NormalizedDiscountPayload {
            name,
            discount_type,
            value: payload.value,
            min_purchase: Decimal::ZERO,
            code: None,
            scope,
            product_id: Some(product_id),
            min_quantity,
            pricing_mode,
            unit_label,
            start_date,
            end_date,
            max_uses,
            is_active,
        });
    }

    // Standard order-level promo/voucher rule
    let discount_type = payload.discount_type.unwrap_or(DiscountType::Percentage);
    if payload.value <= Decimal::ZERO {
        return Err(AppError::BadRequest(
            "Nilai diskon harus lebih dari 0".to_string(),
        ));
    }
    if discount_type == DiscountType::Percentage && payload.value > Decimal::from(100) {
        return Err(AppError::BadRequest(
            "Persentase diskon maksimal 100%".to_string(),
        ));
    }

    let min_purchase = payload.min_purchase.unwrap_or(Decimal::ZERO).max(Decimal::ZERO);
    let code = payload
        .code
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let pricing_mode = if discount_type == DiscountType::Percentage {
        "PERCENTAGE".to_string()
    } else {
        "ORDER_FIXED".to_string()
    };

    Ok(NormalizedDiscountPayload {
        name,
        discount_type,
        value: payload.value,
        min_purchase,
        code,
        scope,
        product_id: None,
        min_quantity: 1,
        pricing_mode,
        unit_label: None,
        start_date,
        end_date,
        max_uses,
        is_active,
    })
}

fn row_to_discount_json(r: &sqlx::postgres::PgRow) -> Value {
    let type_str: String = r.get("type_text");
    let product: Option<Value> = r.get("product");
    json!({
        "id": r.get::<i32, _>("id"),
        "name": r.get::<String, _>("name"),
        "type": type_str,
        "value": r.get::<Decimal, _>("value"),
        "minPurchase": r.get::<Decimal, _>("minPurchase"),
        "code": r.get::<Option<String>, _>("code"),
        "scope": r.get::<String, _>("scope"),
        "productId": r.get::<Option<i32>, _>("productId"),
        "minQuantity": r.get::<i32, _>("minQuantity"),
        "pricingMode": r.get::<String, _>("pricingMode"),
        "unitLabel": r.get::<Option<String>, _>("unitLabel"),
        "startDate": r.get::<chrono::NaiveDateTime, _>("startDate"),
        "endDate": r.get::<Option<chrono::NaiveDateTime>, _>("endDate"),
        "isActive": r.get::<bool, _>("isActive"),
        "maxUses": r.get::<Option<i32>, _>("maxUses"),
        "usedCount": r.get::<i32, _>("usedCount"),
        "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
        "updatedAt": r.get::<chrono::NaiveDateTime, _>("updatedAt"),
        "product": product
    })
}

const DISCOUNT_SELECT_SQL: &str = r#"
    SELECT d.id, d.name, d.type::text as type_text, d.value, d."minPurchase", d.code,
           d.scope, d."productId", d."minQuantity", d."pricingMode", d."unitLabel",
           d."startDate", d."endDate", d."isActive", d."maxUses", d."usedCount",
           d."createdAt", d."updatedAt",
           CASE WHEN p.id IS NOT NULL THEN
             json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'stock', p.stock, 'sku', p.sku)
           ELSE NULL END as product
    FROM discounts d
    LEFT JOIN products p ON d."productId" = p.id
"#;

async fn fetch_discount_json_by_id(pool: &sqlx::PgPool, id: i32) -> Result<Value, AppError> {
    let sql = format!("{} WHERE d.id = $1", DISCOUNT_SELECT_SQL);
    let row = sqlx::query(&sql)
        .bind(id)
        .fetch_one(pool)
        .await?;
    Ok(row_to_discount_json(&row))
}

pub async fn get_discounts(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Vec<Value>>, AppError> {
    let sql = format!("{} ORDER BY d.id DESC", DISCOUNT_SELECT_SQL);
    let rows = sqlx::query(&sql)
        .fetch_all(&state.db)
        .await?;

    let list = rows.iter().map(row_to_discount_json).collect();
    Ok(Json(list))
}

pub async fn create_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateDiscountRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let norm = validate_and_normalize_payload(&state, payload).await?;

    let inserted_id: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO discounts (
            name, type, value, "minPurchase", code,
            scope, "productId", "minQuantity", "pricingMode", "unitLabel",
            "startDate", "endDate", "isActive", "maxUses", "usedCount", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, NOW())
        RETURNING id
        "#,
    )
    .bind(norm.name)
    .bind(norm.discount_type)
    .bind(norm.value)
    .bind(norm.min_purchase)
    .bind(norm.code)
    .bind(norm.scope)
    .bind(norm.product_id)
    .bind(norm.min_quantity)
    .bind(norm.pricing_mode)
    .bind(norm.unit_label)
    .bind(norm.start_date)
    .bind(norm.end_date)
    .bind(norm.is_active)
    .bind(norm.max_uses)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(fetch_discount_json_by_id(&state.db, inserted_id).await?))
}

pub async fn update_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateDiscountRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let norm = validate_and_normalize_payload(&state, payload).await?;

    let updated_id = sqlx::query_scalar::<_, i32>(
        r#"
        UPDATE discounts
        SET name = $1, type = $2, value = $3, "minPurchase" = $4, code = $5,
            scope = $6, "productId" = $7, "minQuantity" = $8, "pricingMode" = $9, "unitLabel" = $10,
            "endDate" = $11, "maxUses" = $12, "isActive" = $13, "updatedAt" = NOW()
        WHERE id = $14
        RETURNING id
        "#,
    )
    .bind(norm.name)
    .bind(norm.discount_type)
    .bind(norm.value)
    .bind(norm.min_purchase)
    .bind(norm.code)
    .bind(norm.scope)
    .bind(norm.product_id)
    .bind(norm.min_quantity)
    .bind(norm.pricing_mode)
    .bind(norm.unit_label)
    .bind(norm.end_date)
    .bind(norm.max_uses)
    .bind(norm.is_active)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Discount not found".to_string()))?;

    Ok(Json(fetch_discount_json_by_id(&state.db, updated_id).await?))
}

pub async fn delete_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let rows_affected = sqlx::query("DELETE FROM discounts WHERE id = $1")
        .bind(id)
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
        return Err(AppError::BadRequest(
            "Kode promo tidak boleh kosong".to_string(),
        ));
    }

    let subtotal = parse_subtotal_decimal(&payload.subtotal);

    // 1. Cek langsung ke tabel discounts (scope ORDER) berdasarkan code (case-insensitive)
    let maybe_discount = sqlx::query_as::<_, Discount>(
        r#"
        SELECT id, name, type, value, "minPurchase", code, scope, "productId",
               "minQuantity", "pricingMode", "unitLabel", "startDate", "endDate",
               "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        FROM discounts
        WHERE UPPER(code) = UPPER($1) AND "isActive" = true AND scope = 'ORDER'
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
                return Err(AppError::BadRequest(
                    "Batas pemakaian promo ini sudah habis".to_string(),
                ));
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
            return Err(AppError::BadRequest(
                "Voucher ini sudah pernah digunakan".to_string(),
            ));
        }

        let now = chrono::Local::now().naive_local();
        if let Some(exp) = v.expires_at {
            if exp < now {
                return Err(AppError::BadRequest(
                    "Voucher ini sudah kedaluwarsa".to_string(),
                ));
            }
        }

        if !v.is_active {
            return Err(AppError::BadRequest(
                "Diskon untuk voucher ini sedang dinonaktifkan".to_string(),
            ));
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

    Err(AppError::NotFound(
        "Kode promo atau voucher tidak valid".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bundle_price_calculates_exact_box_and_remainder() {
        // Air mineral Rp 2.000/pcs, 1 kardus (24 pcs) = Rp 36.000
        let unit = Decimal::from(2000);
        let rules = vec![WholesaleRule {
            id: 1,
            name: "Air 1 Kardus".to_string(),
            min_quantity: 24,
            pricing_mode: "BUNDLE_PRICE".to_string(),
            value: Decimal::from(36000),
            unit_label: Some("1 Kardus".to_string()),
        }];

        assert_eq!(select_best_wholesale_discount(unit, 1, &rules), (Decimal::ZERO, None));
        assert_eq!(select_best_wholesale_discount(unit, 2, &rules), (Decimal::ZERO, None));
        assert_eq!(select_best_wholesale_discount(unit, 23, &rules), (Decimal::ZERO, None));
        // 24 pcs => 48.000 - 36.000 = 12.000 discount
        assert_eq!(
            select_best_wholesale_discount(unit, 24, &rules),
            (Decimal::from(12000), Some(1))
        );
        // 25 pcs => 1 kardus (36.000) + 1 ecer (2.000) = 38.000 => 12.000 discount
        assert_eq!(
            select_best_wholesale_discount(unit, 25, &rules),
            (Decimal::from(12000), Some(1))
        );
        // 48 pcs => 2 kardus (72.000) => 24.000 discount
        assert_eq!(
            select_best_wholesale_discount(unit, 48, &rules),
            (Decimal::from(24000), Some(1))
        );
    }

    #[test]
    fn unit_price_and_best_tier_selection() {
        let unit = Decimal::from(2000);
        let rules = vec![
            WholesaleRule {
                id: 10,
                name: "Pack 6 pcs".to_string(),
                min_quantity: 6,
                pricing_mode: "UNIT_PRICE".to_string(),
                value: Decimal::from(1800),
                unit_label: Some("Grosir >=6".to_string()),
            },
            WholesaleRule {
                id: 11,
                name: "1 Kardus".to_string(),
                min_quantity: 24,
                pricing_mode: "BUNDLE_PRICE".to_string(),
                value: Decimal::from(36000),
                unit_label: Some("1 Kardus".to_string()),
            },
        ];

        // Qty 6 -> Pack 6 applies: (2000 - 1800) * 6 = 1200
        assert_eq!(
            select_best_wholesale_discount(unit, 6, &rules),
            (Decimal::from(1200), Some(10))
        );
        // Qty 24 -> Pack 6 would give 4800, 1 Kardus gives 12000 -> picks 1 Kardus
        assert_eq!(
            select_best_wholesale_discount(unit, 24, &rules),
            (Decimal::from(12000), Some(11))
        );
    }

    #[test]
    fn percentage_tier_rounds_to_whole_rupiah_and_clamps() {
        let unit = Decimal::from(2000);
        let d = calculate_wholesale_rule_discount(
            unit,
            10,
            10,
            "PERCENTAGE",
            Decimal::from(15),
        );
        // 20.000 * 15% = 3.000
        assert_eq!(d, Decimal::from(3000));

        // Misconfigured bundle price higher than normal never produces negative discount
        let bad = calculate_wholesale_rule_discount(
            unit,
            24,
            24,
            "BUNDLE_PRICE",
            Decimal::from(60000),
        );
        assert_eq!(bad, Decimal::ZERO);
    }
}

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
use rust_decimal::{Decimal, RoundingStrategy};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct ValidatePromoPayload {
    pub code: String,
    #[serde(default)]
    pub subtotal: Option<Value>,
    #[serde(rename = "customerId", default)]
    pub customer_id: Option<i32>,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct WholesaleRule {
    pub id: i32,
    pub name: String,
    #[sqlx(rename = "minQuantity")]
    pub min_quantity: i32,
    #[sqlx(rename = "bonusQuantity")]
    pub bonus_quantity: i32,
    #[sqlx(rename = "pricingMode")]
    pub pricing_mode: String,
    pub value: Decimal,
    #[sqlx(rename = "unitLabel")]
    pub unit_label: Option<String>,
}

/// Computes the monetary discount amount for a product/category quantity rule.
/// Handles: BUNDLE_PRICE (paket/kardus), UNIT_PRICE (grosir/pcs), BUY_X_GET_Y (beli X gratis Y),
/// PERCENTAGE (% off qty), and FIXED_PER_UNIT (potongan Rp/pcs qty).
pub fn calculate_wholesale_rule_discount(
    unit_price: Decimal,
    quantity: i32,
    min_quantity: i32,
    bonus_quantity: i32,
    pricing_mode: &str,
    value: Decimal,
) -> Decimal {
    if quantity <= 0 || min_quantity <= 0 || unit_price <= Decimal::ZERO {
        return Decimal::ZERO;
    }

    let line_gross = unit_price * Decimal::from(quantity);
    let discount = match pricing_mode {
        "BUNDLE_PRICE" => {
            if quantity < min_quantity {
                Decimal::ZERO
            } else {
                let bundles = quantity / min_quantity;
                let normal_bundle_price = unit_price * Decimal::from(min_quantity);
                let savings_per_bundle = (normal_bundle_price - value).max(Decimal::ZERO);
                savings_per_bundle * Decimal::from(bundles)
            }
        }
        "UNIT_PRICE" => {
            if quantity < min_quantity {
                Decimal::ZERO
            } else {
                let per_unit_savings = (unit_price - value).max(Decimal::ZERO);
                per_unit_savings * Decimal::from(quantity)
            }
        }
        "BUY_X_GET_Y" => {
            if bonus_quantity <= 0 {
                Decimal::ZERO
            } else {
                let group_size = min_quantity + bonus_quantity;
                let sets = quantity / group_size;
                let free_units = sets * bonus_quantity;
                unit_price * Decimal::from(free_units)
            }
        }
        "PERCENTAGE" => {
            if quantity < min_quantity {
                Decimal::ZERO
            } else {
                let pct = value.max(Decimal::ZERO).min(Decimal::from(100));
                ((line_gross * pct) / Decimal::from(100))
                    .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
            }
        }
        "FIXED_PER_UNIT" => {
            if quantity < min_quantity {
                Decimal::ZERO
            } else {
                let per_unit_cut = value.max(Decimal::ZERO).min(unit_price);
                per_unit_cut * Decimal::from(quantity)
            }
        }
        _ => Decimal::ZERO,
    };

    discount.max(Decimal::ZERO).min(line_gross)
}

/// Picks the best rule (maximum customer savings) across all applicable product & category rules.
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
            rule.bonus_quantity,
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

pub fn tier_rank(tier: &str) -> i32 {
    match tier.trim().to_uppercase().as_str() {
        "PLATINUM" => 4,
        "GOLD" => 3,
        "SILVER" => 2,
        "BRONZE" => 1,
        _ => 0,
    }
}

pub fn calculate_order_promo_amount(
    subtotal: Decimal,
    discount_type: DiscountType,
    value: Decimal,
    max_discount: Option<Decimal>,
) -> Decimal {
    if subtotal <= Decimal::ZERO || value <= Decimal::ZERO {
        return Decimal::ZERO;
    }
    let raw = if discount_type == DiscountType::Percentage {
        let pct = value.min(Decimal::from(100));
        let calc = ((subtotal * pct) / Decimal::from(100))
            .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero);
        if let Some(cap) = max_discount {
            if cap > Decimal::ZERO {
                calc.min(cap)
            } else {
                calc
            }
        } else {
            calc
        }
    } else {
        value
    };
    raw.max(Decimal::ZERO).min(subtotal)
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
    category_id: Option<i32>,
    min_quantity: i32,
    bonus_quantity: i32,
    pricing_mode: String,
    unit_label: Option<String>,
    max_discount: Option<Decimal>,
    auto_apply: bool,
    target_tier: Option<String>,
    start_date: chrono::NaiveDateTime,
    end_date: Option<chrono::NaiveDateTime>,
    max_uses: Option<i32>,
    is_active: bool,
}

async fn validate_and_normalize_payload(
    state: &SharedState,
    payload: CreateDiscountRequest,
    exclude_id: Option<i32>,
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

    if !matches!(scope.as_str(), "ORDER" | "PRODUCT_QTY" | "CATEGORY") {
        return Err(AppError::BadRequest(
            "Scope diskon harus ORDER, PRODUCT_QTY, atau CATEGORY".to_string(),
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
    let unit_label = payload
        .unit_label
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    if scope == "PRODUCT_QTY" {
        let product_id = payload.product_id.ok_or_else(|| {
            AppError::BadRequest("Pilih produk target untuk diskon ini".to_string())
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
        let pricing_mode = payload
            .pricing_mode
            .as_deref()
            .unwrap_or("BUNDLE_PRICE")
            .trim()
            .to_uppercase();

        if !matches!(
            pricing_mode.as_str(),
            "BUNDLE_PRICE" | "UNIT_PRICE" | "BUY_X_GET_Y" | "PERCENTAGE" | "FIXED_PER_UNIT"
        ) {
            return Err(AppError::BadRequest(
                "Skema diskon produk tidak valid".to_string(),
            ));
        }

        let min_quantity = payload.min_quantity.unwrap_or(if pricing_mode == "BUNDLE_PRICE" { 2 } else { 1 });
        let mut bonus_quantity = payload.bonus_quantity.unwrap_or(0).max(0);
        let mut effective_value = payload.value;

        match pricing_mode.as_str() {
            "BUNDLE_PRICE" => {
                if min_quantity < 2 {
                    return Err(AppError::BadRequest(
                        "Minimal jumlah beli paket (isi kemasan) minimal 2 pcs".to_string(),
                    ));
                }
                let normal_bundle = product_price * Decimal::from(min_quantity);
                if effective_value <= Decimal::ZERO || effective_value >= normal_bundle {
                    return Err(AppError::BadRequest(format!(
                        "Harga paket {} pcs harus lebih dari Rp 0 dan lebih murah dari harga normal total (Rp {})",
                        min_quantity, normal_bundle
                    )));
                }
                bonus_quantity = 0;
            }
            "UNIT_PRICE" => {
                if min_quantity < 1 {
                    return Err(AppError::BadRequest("Minimal Qty minimal 1 pcs".to_string()));
                }
                if effective_value <= Decimal::ZERO || effective_value >= product_price {
                    return Err(AppError::BadRequest(format!(
                        "Harga satuan grosir harus lebih murah dari harga normal (Rp {})",
                        product_price
                    )));
                }
                bonus_quantity = 0;
            }
            "BUY_X_GET_Y" => {
                if min_quantity < 1 || bonus_quantity < 1 {
                    return Err(AppError::BadRequest(
                        "Promo Beli X Gratis Y membutuhkan jumlah Beli >= 1 dan Gratis >= 1".to_string(),
                    ));
                }
                effective_value = Decimal::ZERO;
            }
            "PERCENTAGE" => {
                if min_quantity < 1 {
                    return Err(AppError::BadRequest("Minimal Qty minimal 1 pcs".to_string()));
                }
                if effective_value <= Decimal::ZERO || effective_value > Decimal::from(100) {
                    return Err(AppError::BadRequest(
                        "Persentase diskon harus antara 1% - 100%".to_string(),
                    ));
                }
                bonus_quantity = 0;
            }
            "FIXED_PER_UNIT" => {
                if min_quantity < 1 {
                    return Err(AppError::BadRequest("Minimal Qty minimal 1 pcs".to_string()));
                }
                if effective_value <= Decimal::ZERO || effective_value >= product_price {
                    return Err(AppError::BadRequest(format!(
                        "Potongan nominal per pcs harus lebih dari Rp 0 dan kurang dari harga produk (Rp {})",
                        product_price
                    )));
                }
                bonus_quantity = 0;
            }
            _ => {}
        }

        let discount_type = if pricing_mode == "PERCENTAGE" {
            DiscountType::Percentage
        } else {
            DiscountType::Fixed
        };

        return Ok(NormalizedDiscountPayload {
            name,
            discount_type,
            value: effective_value,
            min_purchase: Decimal::ZERO,
            code: None,
            scope,
            product_id: Some(product_id),
            category_id: None,
            min_quantity,
            bonus_quantity,
            pricing_mode,
            unit_label,
            max_discount: None,
            auto_apply: true,
            target_tier: None,
            start_date,
            end_date,
            max_uses,
            is_active,
        });
    }

    if scope == "CATEGORY" {
        let category_id = payload.category_id.ok_or_else(|| {
            AppError::BadRequest("Pilih kategori target untuk diskon kategori".to_string())
        })?;

        let cat_exists = sqlx::query_scalar::<_, i32>(
            r#"SELECT id FROM categories WHERE id = $1 AND "isActive" = true"#,
        )
        .bind(category_id)
        .fetch_optional(&state.db)
        .await?;

        if cat_exists.is_none() {
            return Err(AppError::NotFound(
                "Kategori tidak ditemukan atau nonaktif".to_string(),
            ));
        }

        let pricing_mode = payload
            .pricing_mode
            .as_deref()
            .unwrap_or("PERCENTAGE")
            .trim()
            .to_uppercase();

        if !matches!(
            pricing_mode.as_str(),
            "PERCENTAGE" | "FIXED_PER_UNIT" | "BUY_X_GET_Y"
        ) {
            return Err(AppError::BadRequest(
                "Skema diskon kategori harus PERCENTAGE, FIXED_PER_UNIT, atau BUY_X_GET_Y".to_string(),
            ));
        }

        let min_quantity = payload.min_quantity.unwrap_or(1).max(1);
        let mut bonus_quantity = payload.bonus_quantity.unwrap_or(0).max(0);
        let mut effective_value = payload.value;

        match pricing_mode.as_str() {
            "PERCENTAGE" => {
                if effective_value <= Decimal::ZERO || effective_value > Decimal::from(100) {
                    return Err(AppError::BadRequest(
                        "Persentase diskon kategori harus antara 1% - 100%".to_string(),
                    ));
                }
                bonus_quantity = 0;
            }
            "FIXED_PER_UNIT" => {
                if effective_value <= Decimal::ZERO {
                    return Err(AppError::BadRequest(
                        "Nominal potongan per pcs harus lebih dari Rp 0".to_string(),
                    ));
                }
                bonus_quantity = 0;
            }
            "BUY_X_GET_Y" => {
                if bonus_quantity < 1 {
                    return Err(AppError::BadRequest(
                        "Jumlah item gratis (Y) minimal 1".to_string(),
                    ));
                }
                effective_value = Decimal::ZERO;
            }
            _ => {}
        }

        let discount_type = if pricing_mode == "PERCENTAGE" {
            DiscountType::Percentage
        } else {
            DiscountType::Fixed
        };

        return Ok(NormalizedDiscountPayload {
            name,
            discount_type,
            value: effective_value,
            min_purchase: Decimal::ZERO,
            code: None,
            scope,
            product_id: None,
            category_id: Some(category_id),
            min_quantity,
            bonus_quantity,
            pricing_mode,
            unit_label,
            max_discount: None,
            auto_apply: true,
            target_tier: None,
            start_date,
            end_date,
            max_uses,
            is_active,
        });
    }

    // Standard order-level promo / voucher / member rule
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
    let max_discount = payload.max_discount.filter(|&d| d > Decimal::ZERO);
    let auto_apply = payload.auto_apply.unwrap_or(false);
    let code = if auto_apply {
        None
    } else {
        payload
            .code
            .map(|s| s.trim().to_uppercase())
            .filter(|s| !s.is_empty())
    };
    if let Some(ref clean_code) = code {
        let dup_id = sqlx::query_scalar::<_, i32>(
            r#"
            SELECT id FROM discounts
            WHERE UPPER(code) = UPPER($1) AND ($2::int IS NULL OR id <> $2)
            LIMIT 1
            "#,
        )
        .bind(clean_code)
        .bind(exclude_id)
        .fetch_optional(&state.db)
        .await?;

        if dup_id.is_some() {
            return Err(AppError::BadRequest(format!(
                "Kode promo '{}' sudah digunakan oleh aturan diskon lain",
                clean_code
            )));
        }
    }
    let target_tier = payload
        .target_tier
        .map(|s| s.trim().to_uppercase())
        .filter(|s| matches!(s.as_str(), "BRONZE" | "SILVER" | "GOLD" | "PLATINUM"));
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
        category_id: None,
        min_quantity: 1,
        bonus_quantity: 0,
        pricing_mode,
        unit_label: None,
        max_discount,
        auto_apply,
        target_tier,
        start_date,
        end_date,
        max_uses,
        is_active,
    })
}

const DISCOUNT_SELECT_SQL: &str = r#"
    SELECT d.id, d.name, d.type::text as type_text, d.value, d."minPurchase", d.code,
           d.scope, d."productId", d."categoryId", d."minQuantity", d."bonusQuantity",
           d."pricingMode", d."unitLabel", d."maxDiscount", d."autoApply", d."targetTier",
           d."startDate", d."endDate", d."isActive", d."maxUses", d."usedCount",
           d."createdAt", d."updatedAt",
           CASE WHEN p.id IS NOT NULL THEN
             json_build_object('id', p.id, 'name', p.name, 'price', p.price, 'stock', p.stock, 'sku', p.sku, 'categoryId', p."categoryId")
           ELSE NULL END as product,
           CASE WHEN c.id IS NOT NULL THEN
             json_build_object('id', c.id, 'name', c.name, 'color', c.color)
           ELSE NULL END as category
    FROM discounts d
    LEFT JOIN products p ON d."productId" = p.id
    LEFT JOIN categories c ON d."categoryId" = c.id
"#;

fn row_to_discount_json(r: &sqlx::postgres::PgRow) -> Value {
    let type_str: String = r.get("type_text");
    let product: Option<Value> = r.get("product");
    let category: Option<Value> = r.get("category");
    json!({
        "id": r.get::<i32, _>("id"),
        "name": r.get::<String, _>("name"),
        "type": type_str,
        "value": r.get::<Decimal, _>("value"),
        "minPurchase": r.get::<Decimal, _>("minPurchase"),
        "code": r.get::<Option<String>, _>("code"),
        "scope": r.get::<String, _>("scope"),
        "productId": r.get::<Option<i32>, _>("productId"),
        "categoryId": r.get::<Option<i32>, _>("categoryId"),
        "minQuantity": r.get::<i32, _>("minQuantity"),
        "bonusQuantity": r.get::<i32, _>("bonusQuantity"),
        "pricingMode": r.get::<String, _>("pricingMode"),
        "unitLabel": r.get::<Option<String>, _>("unitLabel"),
        "maxDiscount": r.get::<Option<Decimal>, _>("maxDiscount"),
        "autoApply": r.get::<bool, _>("autoApply"),
        "targetTier": r.get::<Option<String>, _>("targetTier"),
        "startDate": r.get::<chrono::NaiveDateTime, _>("startDate"),
        "endDate": r.get::<Option<chrono::NaiveDateTime>, _>("endDate"),
        "isActive": r.get::<bool, _>("isActive"),
        "maxUses": r.get::<Option<i32>, _>("maxUses"),
        "usedCount": r.get::<i32, _>("usedCount"),
        "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
        "updatedAt": r.get::<chrono::NaiveDateTime, _>("updatedAt"),
        "product": product,
        "category": category
    })
}

async fn fetch_discount_json_by_id(pool: &sqlx::PgPool, id: i32) -> Result<Value, AppError> {
    let sql = format!("{} WHERE d.id = $1", DISCOUNT_SELECT_SQL);
    let row = sqlx::query(&sql).bind(id).fetch_one(pool).await?;
    Ok(row_to_discount_json(&row))
}

pub async fn get_discounts(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Vec<Value>>, AppError> {
    let sql = format!("{} ORDER BY d.id DESC", DISCOUNT_SELECT_SQL);
    let rows = sqlx::query(&sql).fetch_all(&state.db).await?;
    let list = rows.iter().map(row_to_discount_json).collect();
    Ok(Json(list))
}

pub async fn create_discount(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateDiscountRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["discount.manage"])?;

    let norm = validate_and_normalize_payload(&state, payload, None).await?;

    let inserted_id: i32 = sqlx::query_scalar(
        r#"
        INSERT INTO discounts (
            name, type, value, "minPurchase", code,
            scope, "productId", "categoryId", "minQuantity", "bonusQuantity",
            "pricingMode", "unitLabel", "maxDiscount", "autoApply", "targetTier",
            "startDate", "endDate", "isActive", "maxUses", "usedCount", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 0, NOW())
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
    .bind(norm.category_id)
    .bind(norm.min_quantity)
    .bind(norm.bonus_quantity)
    .bind(norm.pricing_mode)
    .bind(norm.unit_label)
    .bind(norm.max_discount)
    .bind(norm.auto_apply)
    .bind(norm.target_tier)
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

    let norm = validate_and_normalize_payload(&state, payload, Some(id)).await?;

    let updated_id = sqlx::query_scalar::<_, i32>(
        r#"
        UPDATE discounts
        SET name = $1, type = $2, value = $3, "minPurchase" = $4, code = $5,
            scope = $6, "productId" = $7, "categoryId" = $8, "minQuantity" = $9, "bonusQuantity" = $10,
            "pricingMode" = $11, "unitLabel" = $12, "maxDiscount" = $13, "autoApply" = $14, "targetTier" = $15,
            "endDate" = $16, "maxUses" = $17, "isActive" = $18, "updatedAt" = NOW()
        WHERE id = $19
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
    .bind(norm.category_id)
    .bind(norm.min_quantity)
    .bind(norm.bonus_quantity)
    .bind(norm.pricing_mode)
    .bind(norm.unit_label)
    .bind(norm.max_discount)
    .bind(norm.auto_apply)
    .bind(norm.target_tier)
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

    let customer_tier: Option<String> = if let Some(cid) = payload.customer_id {
        sqlx::query_scalar::<_, String>(
            r#"SELECT "membershipTier"::text FROM customers WHERE id = $1"#,
        )
        .bind(cid)
        .fetch_optional(&state.db)
        .await?
    } else {
        None
    };

    // 1. Cek langsung ke tabel discounts (scope ORDER) berdasarkan code (case-insensitive)
    let maybe_discount = sqlx::query_as::<_, Discount>(
        r#"
        SELECT id, name, type, value, "minPurchase", code, scope, "productId", "categoryId",
               "minQuantity", "bonusQuantity", "pricingMode", "unitLabel",
               "maxDiscount", "autoApply", "targetTier", "startDate", "endDate",
               "isActive", "maxUses", "usedCount", "createdAt", "updatedAt"
        FROM discounts
        WHERE UPPER(code) = UPPER($1) AND scope = 'ORDER'
        "#,
    )
    .bind(code)
    .fetch_optional(&state.db)
    .await?;

    if let Some(discount) = maybe_discount {
        if !discount.is_active {
            return Err(AppError::BadRequest(
                "Promo ini sedang dinonaktifkan".to_string(),
            ));
        }
        if subtotal < discount.min_purchase {
            return Err(AppError::BadRequest(format!(
                "Minimal pembelian Rp {} untuk menggunakan promo ini",
                discount.min_purchase
            )));
        }

        if let Some(ref req_tier) = discount.target_tier {
            let cust_rank = customer_tier.as_deref().map(tier_rank).unwrap_or(0);
            if cust_rank < tier_rank(req_tier) {
                return Err(AppError::BadRequest(format!(
                    "Promo ini khusus untuk pelanggan Member minimal {}",
                    req_tier
                )));
            }
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

        let discount_amount = calculate_order_promo_amount(
            subtotal,
            discount.discount_type,
            discount.value,
            discount.max_discount,
        );

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
        max_discount: Option<Decimal>,
        target_tier: Option<String>,
        is_active: bool,
    }

    let maybe_voucher = sqlx::query_as::<_, VoucherWithDiscount>(
        r#"
        SELECT v.id as voucher_id, v.code as voucher_code, v."isUsed" as is_used, v."expiresAt" as expires_at,
               d.id as discount_id, d.name as discount_name, d.type as discount_type,
               d.value as discount_value, d."minPurchase" as min_purchase,
               d."maxDiscount" as max_discount, d."targetTier" as target_tier, d."isActive" as is_active
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

        if let Some(ref req_tier) = v.target_tier {
            let cust_rank = customer_tier.as_deref().map(tier_rank).unwrap_or(0);
            if cust_rank < tier_rank(req_tier) {
                return Err(AppError::BadRequest(format!(
                    "Voucher ini khusus untuk pelanggan Member minimal {}",
                    req_tier
                )));
            }
        }

        let discount_amount = calculate_order_promo_amount(
            subtotal,
            v.discount_type,
            v.discount_value,
            v.max_discount,
        );

        return Ok(Json(json!({
            "valid": true,
            "discount": {
                "id": v.discount_id,
                "name": v.discount_name,
                "type": v.discount_type,
                "value": v.discount_value,
                "minPurchase": v.min_purchase,
                "maxDiscount": v.max_discount,
                "targetTier": v.target_tier,
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
        let unit = Decimal::from(2000);
        let rules = vec![WholesaleRule {
            id: 1,
            name: "Air 1 Kardus".to_string(),
            min_quantity: 24,
            bonus_quantity: 0,
            pricing_mode: "BUNDLE_PRICE".to_string(),
            value: Decimal::from(36000),
            unit_label: Some("1 Kardus".to_string()),
        }];

        assert_eq!(select_best_wholesale_discount(unit, 1, &rules), (Decimal::ZERO, None));
        assert_eq!(select_best_wholesale_discount(unit, 2, &rules), (Decimal::ZERO, None));
        assert_eq!(
            select_best_wholesale_discount(unit, 24, &rules),
            (Decimal::from(12000), Some(1))
        );
        assert_eq!(
            select_best_wholesale_discount(unit, 25, &rules),
            (Decimal::from(12000), Some(1))
        );
        assert_eq!(
            select_best_wholesale_discount(unit, 48, &rules),
            (Decimal::from(24000), Some(1))
        );
    }

    #[test]
    fn buy_x_get_y_calculates_free_units() {
        // Beli 3 Gratis 1 (air Rp 2.000/pcs)
        let unit = Decimal::from(2000);
        let rules = vec![WholesaleRule {
            id: 2,
            name: "Beli 3 Gratis 1".to_string(),
            min_quantity: 3,
            bonus_quantity: 1,
            pricing_mode: "BUY_X_GET_Y".to_string(),
            value: Decimal::ZERO,
            unit_label: Some("Beli 3 Gratis 1".to_string()),
        }];

        assert_eq!(select_best_wholesale_discount(unit, 3, &rules), (Decimal::ZERO, None));
        // 4 items leave shelf -> customer pays 3 (Rp 6.000), 1 free (Rp 2.000 discount)
        assert_eq!(
            select_best_wholesale_discount(unit, 4, &rules),
            (Decimal::from(2000), Some(2))
        );
        // 7 items -> 1 set (4 pcs) -> Rp 2.000 discount
        assert_eq!(
            select_best_wholesale_discount(unit, 7, &rules),
            (Decimal::from(2000), Some(2))
        );
        // 8 items -> 2 sets -> Rp 4.000 discount
        assert_eq!(
            select_best_wholesale_discount(unit, 8, &rules),
            (Decimal::from(4000), Some(2))
        );
    }

    #[test]
    fn fixed_per_unit_and_order_max_discount_cap() {
        let unit = Decimal::from(2000);
        let d = calculate_wholesale_rule_discount(
            unit,
            5,
            5,
            0,
            "FIXED_PER_UNIT",
            Decimal::from(300),
        );
        // 5 * 300 = 1500
        assert_eq!(d, Decimal::from(1500));

        // Order promo 20% with max cap Rp 15.000 on Rp 100.000 subtotal
        let order_disc = calculate_order_promo_amount(
            Decimal::from(100000),
            DiscountType::Percentage,
            Decimal::from(20),
            Some(Decimal::from(15000)),
        );
        assert_eq!(order_disc, Decimal::from(15000));
    }

    #[test]
    fn unit_price_and_best_tier_selection() {
        let unit = Decimal::from(2000);
        let rules = vec![
            WholesaleRule {
                id: 10,
                name: "Pack 6 pcs".to_string(),
                min_quantity: 6,
                bonus_quantity: 0,
                pricing_mode: "UNIT_PRICE".to_string(),
                value: Decimal::from(1800),
                unit_label: Some("Grosir >=6".to_string()),
            },
            WholesaleRule {
                id: 11,
                name: "1 Kardus".to_string(),
                min_quantity: 24,
                bonus_quantity: 0,
                pricing_mode: "BUNDLE_PRICE".to_string(),
                value: Decimal::from(36000),
                unit_label: Some("1 Kardus".to_string()),
            },
        ];

        assert_eq!(
            select_best_wholesale_discount(unit, 6, &rules),
            (Decimal::from(1200), Some(10))
        );
        assert_eq!(
            select_best_wholesale_discount(unit, 24, &rules),
            (Decimal::from(12000), Some(11))
        );
    }
}

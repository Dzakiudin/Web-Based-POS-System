use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{CreateProductRequest, ProductVariant, UpdateProductRequest},
    state::SharedState,
};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use rust_decimal::Decimal;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
pub struct ProductFilter {
    #[serde(rename = "categoryId")]
    pub category_id: Option<i32>,
    pub search: Option<String>,
    pub active: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateVariantRequest {
    pub name: String,
    pub sku: Option<String>,
    pub price: Decimal,
    #[serde(rename = "costPrice")]
    pub cost_price: Option<Decimal>,
    pub stock: Option<i32>,
}

pub async fn get_products(
    State(state): State<SharedState>,
    auth: AuthUser,
    Query(filter): Query<ProductFilter>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.view", "product.crud"])?;

    let is_active = filter.active.as_deref() != Some("false");
    let search = filter.search.as_deref().unwrap_or("");
    let search_pattern = format!("%{}%", search);

    let rows = sqlx::query(
        r#"
        SELECT p.id, p.name, p.sku, p.barcode, p.price, p."costPrice", p.stock, p."minStock",
               p.image, p."categoryId", p."isActive", p."createdAt", p."updatedAt",
               CASE WHEN c.id IS NOT NULL THEN
                 json_build_object('id', c.id, 'name', c.name, 'color', c.color)
               ELSE NULL END as category,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', v.id,
                     'productId', v."productId",
                     'name', v.name,
                     'sku', v.sku,
                     'price', v.price,
                     'costPrice', v."costPrice",
                     'stock', v.stock,
                     'isActive', v."isActive"
                   )
                 ) FILTER (WHERE v.id IS NOT NULL AND v."isActive" = true),
                 '[]'::json
               ) as variants
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        LEFT JOIN product_variants v ON p.id = v."productId"
        WHERE ($1::boolean IS FALSE OR p."isActive" = true)
          AND ($2::int IS NULL OR p."categoryId" = $2)
          AND (
            $3 = '' OR
            p.name ILIKE $4 OR
            p.sku ILIKE $4 OR
            p.barcode ILIKE $4
          )
        GROUP BY p.id, c.id
        ORDER BY p.name ASC
        "#,
    )
    .bind(is_active)
    .bind(filter.category_id)
    .bind(search)
    .bind(&search_pattern)
    .fetch_all(&state.db)
    .await?;

    let mut result = Vec::new();
    for row in rows {
        use sqlx::Row;
        let id: i32 = row.get("id");
        let name: String = row.get("name");
        let sku: Option<String> = row.get("sku");
        let barcode: Option<String> = row.get("barcode");
        let price: Decimal = row.get("price");
        let cost_price: Decimal = row.get("costPrice");
        let stock: i32 = row.get("stock");
        let min_stock: i32 = row.get("minStock");
        let image: Option<String> = row.get("image");
        let category_id: Option<i32> = row.get("categoryId");
        let is_active: bool = row.get("isActive");
        let category: Option<Value> = row.get("category");
        let variants: Value = row.get("variants");

        result.push(json!({
            "id": id,
            "name": name,
            "sku": sku,
            "barcode": barcode,
            "price": price,
            "costPrice": cost_price,
            "stock": stock,
            "minStock": min_stock,
            "image": image,
            "categoryId": category_id,
            "isActive": is_active,
            "category": category,
            "variants": variants
        }));
    }

    Ok(Json(json!(result)))
}

pub async fn get_product(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.view", "product.crud"])?;

    let row_opt = sqlx::query(
        r#"
        SELECT p.id, p.name, p.sku, p.barcode, p.price, p."costPrice", p.stock, p."minStock",
               p.image, p."categoryId", p."isActive", p."createdAt", p."updatedAt",
               CASE WHEN c.id IS NOT NULL THEN
                 json_build_object('id', c.id, 'name', c.name, 'color', c.color, 'icon', c.icon)
               ELSE NULL END as category,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', v.id,
                     'productId', v."productId",
                     'name', v.name,
                     'sku', v.sku,
                     'price', v.price,
                     'costPrice', v."costPrice",
                     'stock', v.stock,
                     'isActive', v."isActive"
                   )
                 ) FILTER (WHERE v.id IS NOT NULL),
                 '[]'::json
               ) as variants
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        LEFT JOIN product_variants v ON p.id = v."productId"
        WHERE p.id = $1
        GROUP BY p.id, c.id
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;

    let row = match row_opt {
        Some(r) => r,
        None => return Err(AppError::NotFound("Product not found".to_string())),
    };

    use sqlx::Row;
    Ok(Json(json!({
        "id": row.get::<i32, _>("id"),
        "name": row.get::<String, _>("name"),
        "sku": row.get::<Option<String>, _>("sku"),
        "barcode": row.get::<Option<String>, _>("barcode"),
        "price": row.get::<Decimal, _>("price"),
        "costPrice": row.get::<Decimal, _>("costPrice"),
        "stock": row.get::<i32, _>("stock"),
        "minStock": row.get::<i32, _>("minStock"),
        "image": row.get::<Option<String>, _>("image"),
        "categoryId": row.get::<Option<i32>, _>("categoryId"),
        "isActive": row.get::<bool, _>("isActive"),
        "category": row.get::<Option<Value>, _>("category"),
        "variants": row.get::<Value, _>("variants")
    })))
}

pub async fn create_product(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateProductRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let cost_price = payload.cost_price.unwrap_or(Decimal::ZERO);
    let min_stock = payload.min_stock.unwrap_or(5);

    let row = sqlx::query(
        r#"
        INSERT INTO products (name, sku, barcode, price, "costPrice", stock, "minStock", image, "categoryId", "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
        RETURNING id, name, sku, barcode, price, "costPrice", stock, "minStock", image, "categoryId", "isActive", "createdAt", "updatedAt"
        "#
    )
    .bind(payload.name)
    .bind(payload.sku)
    .bind(payload.barcode)
    .bind(payload.price)
    .bind(cost_price)
    .bind(payload.stock)
    .bind(min_stock)
    .bind(payload.image)
    .bind(payload.category_id)
    .fetch_one(&state.db)
    .await?;

    use sqlx::Row;
    Ok(Json(json!({
        "id": row.get::<i32, _>("id"),
        "name": row.get::<String, _>("name"),
        "price": row.get::<Decimal, _>("price"),
        "stock": row.get::<i32, _>("stock"),
        "message": "Product created successfully"
    })))
}

pub async fn update_product(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateProductRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let row = sqlx::query(
        r#"
        UPDATE products
        SET name = COALESCE($1, name),
            sku = COALESCE($2, sku),
            barcode = COALESCE($3, barcode),
            price = COALESCE($4, price),
            "costPrice" = COALESCE($5, "costPrice"),
            stock = COALESCE($6, stock),
            "minStock" = COALESCE($7, "minStock"),
            image = COALESCE($8, image),
            "categoryId" = COALESCE($9, "categoryId"),
            "isActive" = COALESCE($10, "isActive"),
            "updatedAt" = NOW()
        WHERE id = $11
        RETURNING id, name, price, stock
        "#
    )
    .bind(payload.name)
    .bind(payload.sku)
    .bind(payload.barcode)
    .bind(payload.price)
    .bind(payload.cost_price)
    .bind(payload.stock)
    .bind(payload.min_stock)
    .bind(payload.image)
    .bind(payload.category_id)
    .bind(payload.is_active)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Product not found".to_string()))?;

    use sqlx::Row;
    Ok(Json(json!({
        "id": row.get::<i32, _>("id"),
        "name": row.get::<String, _>("name"),
        "message": "Product updated successfully"
    })))
}

pub async fn delete_product(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE products
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
        "#,
        id
    )
    .execute(&state.db)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Product not found".to_string()));
    }

    Ok(Json(json!({ "message": "Product deleted successfully" })))
}

// --- Variants ---
pub async fn get_variants(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(product_id): Path<i32>,
) -> Result<Json<Vec<ProductVariant>>, AppError> {
    let variants = sqlx::query_as::<_, ProductVariant>(
        r#"
        SELECT id, "productId", name, sku, price, "costPrice", stock, "isActive", "createdAt", "updatedAt"
        FROM product_variants
        WHERE "productId" = $1 AND "isActive" = true
        ORDER BY id ASC
        "#,
    )
    .bind(product_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(variants))
}

pub async fn create_variant(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(product_id): Path<i32>,
    Json(payload): Json<CreateVariantRequest>,
) -> Result<Json<ProductVariant>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let cost_price = payload.cost_price.unwrap_or(Decimal::ZERO);
    let stock = payload.stock.unwrap_or(0);

    let variant = sqlx::query_as::<_, ProductVariant>(
        r#"
        INSERT INTO product_variants ("productId", name, sku, price, "costPrice", stock, "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
        RETURNING id, "productId", name, sku, price, "costPrice", stock, "isActive", "createdAt", "updatedAt"
        "#
    )
    .bind(product_id)
    .bind(payload.name)
    .bind(payload.sku)
    .bind(payload.price)
    .bind(cost_price)
    .bind(stock)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(variant))
}

pub async fn update_variant(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path((_product_id, variant_id)): Path<(i32, i32)>,
    Json(payload): Json<CreateVariantRequest>,
) -> Result<Json<ProductVariant>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let cost_price = payload.cost_price.unwrap_or(Decimal::ZERO);
    let stock = payload.stock.unwrap_or(0);

    let variant = sqlx::query_as::<_, ProductVariant>(
        r#"
        UPDATE product_variants
        SET name = $1, sku = $2, price = $3, "costPrice" = $4, stock = $5, "updatedAt" = NOW()
        WHERE id = $6
        RETURNING id, "productId", name, sku, price, "costPrice", stock, "isActive", "createdAt", "updatedAt"
        "#
    )
    .bind(payload.name)
    .bind(payload.sku)
    .bind(payload.price)
    .bind(cost_price)
    .bind(stock)
    .bind(variant_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Variant not found".to_string()))?;

    Ok(Json(variant))
}

pub async fn delete_variant(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path((_product_id, variant_id)): Path<(i32, i32)>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE product_variants
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
        "#,
        variant_id
    )
    .execute(&state.db)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Variant not found".to_string()));
    }

    Ok(Json(json!({ "message": "Variant deleted successfully" })))
}

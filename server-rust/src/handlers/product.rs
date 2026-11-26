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
    let product_id = row.get::<i32, _>("id");
    let product_name = row.get::<String, _>("name");
    let product_price = row.get::<Decimal, _>("price");
    let product_stock = row.get::<i32, _>("stock");

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'CREATE', 'Product', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(product_id)
    .bind(
        json!({
            "name": product_name,
            "price": product_price,
            "stock": product_stock
        })
        .to_string(),
    )
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "id": product_id,
        "name": product_name,
        "price": product_price,
        "stock": product_stock,
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
    let product_id = row.get::<i32, _>("id");
    let product_name = row.get::<String, _>("name");
    let product_price = row.get::<Decimal, _>("price");
    let product_stock = row.get::<i32, _>("stock");

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'UPDATE', 'Product', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(product_id)
    .bind(
        json!({
            "name": product_name,
            "price": product_price,
            "stock": product_stock
        })
        .to_string(),
    )
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "id": product_id,
        "name": product_name,
        "message": "Product updated successfully"
    })))
}

pub async fn delete_product(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.crud"])?;

    let row = sqlx::query(
        r#"
        UPDATE products
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
        RETURNING name
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?;

    let row = match row {
        Some(r) => r,
        None => return Err(AppError::NotFound("Product not found".to_string())),
    };

    use sqlx::Row;
    let product_name = row.get::<String, _>("name");

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'DELETE', 'Product', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(id)
    .bind(json!({ "name": product_name }).to_string())
    .execute(&state.db)
    .await;

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

#[derive(Debug, Deserialize)]
pub struct BarcodeLookupQuery {
    pub refresh: Option<bool>,
}

fn resolve_scraper_paths() -> (String, Option<std::path::PathBuf>) {
    let script_candidates: Vec<std::path::PathBuf> = [
        std::env::var("BARCODE_SCRAPER_SCRIPT").ok().map(std::path::PathBuf::from),
        Some(std::path::PathBuf::from("scripts/barcode_scraper.py")),
        Some(std::path::PathBuf::from("../scripts/barcode_scraper.py")),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("scripts/barcode_scraper.py"))),
        std::env::current_exe().ok().and_then(|p| {
            p.parent()
                .and_then(|d| d.parent())
                .map(|d| d.join("scripts/barcode_scraper.py"))
        }),
    ]
    .into_iter()
    .flatten()
    .collect();

    let script_path = script_candidates.into_iter().find(|p| p.is_file());

    let py_candidates: Vec<std::path::PathBuf> = [
        std::env::var("SCRAPER_PYTHON").ok().map(std::path::PathBuf::from),
        Some(std::path::PathBuf::from(".venv-scraper/Scripts/python.exe")),
        Some(std::path::PathBuf::from("../.venv-scraper/Scripts/python.exe")),
        Some(std::path::PathBuf::from(".venv-scraper/bin/python")),
        Some(std::path::PathBuf::from("../.venv-scraper/bin/python")),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(".venv-scraper/Scripts/python.exe"))),
        std::env::current_exe().ok().and_then(|p| {
            p.parent()
                .and_then(|d| d.parent())
                .map(|d| d.join(".venv-scraper/Scripts/python.exe"))
        }),
    ]
    .into_iter()
    .flatten()
    .collect();

    let python_bin = py_candidates
        .into_iter()
        .find(|p| p.is_file())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "python".to_string());

    (python_bin, script_path)
}

pub async fn lookup_barcode(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(raw_barcode): Path<String>,
    Query(query): Query<BarcodeLookupQuery>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["product.view", "product.crud"])?;

    let clean: String = raw_barcode
        .trim()
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();

    if clean.len() < 4 || clean.len() > 32 {
        return Err(AppError::BadRequest(
            "Format barcode tidak valid (4-32 karakter alfanumerik)".to_string(),
        ));
    }

    let force_refresh = query.refresh.unwrap_or(false);

    // 1. Check PostgreSQL barcode_cache first (instant hit)
    if !force_refresh {
        if let Ok(Some(row)) = sqlx::query(
            r#"
            SELECT barcode, name, brand, category, image, "suggestedPrice", source
            FROM barcode_cache
            WHERE barcode = $1
            "#,
        )
        .bind(&clean)
        .fetch_optional(&state.db)
        .await
        {
            use sqlx::Row;
            let suggested_price: Option<Decimal> = row.get("suggestedPrice");
            return Ok(Json(json!({
                "found": true,
                "cached": true,
                "barcode": row.get::<String, _>("barcode"),
                "name": row.get::<String, _>("name"),
                "brand": row.get::<Option<String>, _>("brand").unwrap_or_default(),
                "category": row.get::<Option<String>, _>("category").unwrap_or_default(),
                "image": row.get::<Option<String>, _>("image"),
                "suggestedPrice": suggested_price.and_then(|d| d.to_string().parse::<f64>().ok()),
                "source": row.get::<Option<String>, _>("source").unwrap_or_else(|| "cache".to_string()),
            })));
        }
    }

    // 2. Run D4Vinci/Scrapling Deep Multi-Source Python Worker
    let (python_bin, script_opt) = resolve_scraper_paths();
    let Some(script_path) = script_opt else {
        tracing::warn!("Barcode scraper script scripts/barcode_scraper.py not found");
        return Ok(Json(json!({
            "found": false,
            "barcode": clean,
            "error": "Scraper script not installed"
        })));
    };

    let mut cmd = tokio::process::Command::new(&python_bin);
    cmd.arg(&script_path)
        .arg(&clean)
        .env("PYTHONIOENCODING", "utf-8")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW prevents flashing console window on Windows
        cmd.creation_flags(0x08000000);
    }

    let output = match tokio::time::timeout(std::time::Duration::from_secs(16), cmd.output()).await
    {
        Ok(Ok(out)) => out,
        Ok(Err(e)) => {
            tracing::warn!(
                "Failed to spawn Scrapling barcode worker ({}): {}",
                python_bin,
                e
            );
            return Ok(Json(json!({
                "found": false,
                "barcode": clean,
                "error": format!("Scraper unavailable: {}", e)
            })));
        }
        Err(_) => {
            tracing::warn!("Scrapling barcode lookup timed out for {}", clean);
            return Ok(Json(json!({
                "found": false,
                "barcode": clean,
                "error": "Timeout"
            })));
        }
    };

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let json_line = stdout_str
        .lines()
        .rev()
        .find(|line| line.trim_start().starts_with('{'))
        .unwrap_or("");

    let parsed: Value = match serde_json::from_str(json_line) {
        Ok(v) => v,
        Err(e) => {
            let stderr_str = String::from_utf8_lossy(&output.stderr);
            tracing::warn!(
                "Invalid JSON from barcode_scraper.py for {}: {} (stderr: {})",
                clean,
                e,
                stderr_str.chars().take(300).collect::<String>()
            );
            return Ok(Json(json!({
                "found": false,
                "barcode": clean
            })));
        }
    };

    let found = parsed.get("found").and_then(|v| v.as_bool()).unwrap_or(false);
    if found {
        let name = parsed
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .trim()
            .to_string();
        if !name.is_empty() {
            let brand = parsed
                .get("brand")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let category = parsed
                .get("category")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let image = parsed
                .get("image")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let source = parsed
                .get("source")
                .and_then(|v| v.as_str())
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
            let suggested_price: Option<Decimal> = parsed
                .get("suggestedPrice")
                .and_then(|v| v.as_f64())
                .and_then(|f| Decimal::from_f64_retain(f.round()));

            if let Err(e) = sqlx::query(
                r#"
                INSERT INTO barcode_cache (barcode, name, brand, category, image, "suggestedPrice", source, "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (barcode) DO UPDATE
                SET name = EXCLUDED.name,
                    brand = COALESCE(EXCLUDED.brand, barcode_cache.brand),
                    category = COALESCE(EXCLUDED.category, barcode_cache.category),
                    image = COALESCE(EXCLUDED.image, barcode_cache.image),
                    "suggestedPrice" = COALESCE(EXCLUDED."suggestedPrice", barcode_cache."suggestedPrice"),
                    source = COALESCE(EXCLUDED.source, barcode_cache.source),
                    "updatedAt" = NOW()
                "#,
            )
            .bind(&clean)
            .bind(&name)
            .bind(&brand)
            .bind(&category)
            .bind(&image)
            .bind(suggested_price)
            .bind(&source)
            .execute(&state.db)
            .await
            {
                tracing::warn!("Failed to cache barcode {}: {}", clean, e);
            }
        }
    }

    Ok(Json(parsed))
}

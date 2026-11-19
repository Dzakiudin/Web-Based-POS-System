use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{Category, CreateCategoryRequest},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use sqlx::Row;

pub async fn get_categories(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT c.id, c.name, c.description, c.color, c.icon, c."isActive", c."createdAt", c."updatedAt",
               COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p."categoryId" AND p."isActive" = true
        WHERE c."isActive" = true
        GROUP BY c.id
        ORDER BY c.name ASC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut list = Vec::new();
    for r in rows {
        list.push(json!({
            "id": r.get::<i32, _>("id"),
            "name": r.get::<String, _>("name"),
            "description": r.get::<Option<String>, _>("description"),
            "color": r.get::<String, _>("color"),
            "icon": r.get::<String, _>("icon"),
            "isActive": r.get::<bool, _>("isActive"),
            "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
            "updatedAt": r.get::<chrono::NaiveDateTime, _>("updatedAt"),
            "_count": {
                "products": r.get::<i64, _>("product_count")
            }
        }));
    }

    Ok(Json(json!(list)))
}

pub async fn get_category(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Category>, AppError> {
    let cat = sqlx::query_as::<_, Category>(
        r#"
        SELECT id, name, description, color, icon, "isActive", "createdAt", "updatedAt"
        FROM categories
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;

    Ok(Json(cat))
}

pub async fn create_category(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<Json<Category>, AppError> {
    auth.require_permission(&["category.manage"])?;

    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    let icon = payload.icon.unwrap_or_else(|| "Package".to_string());

    let cat = sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (name, description, color, icon, "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, true, NOW())
        RETURNING id, name, description, color, icon, "isActive", "createdAt", "updatedAt"
        "#,
    )
    .bind(payload.name)
    .bind(payload.description)
    .bind(color)
    .bind(icon)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(cat))
}

pub async fn update_category(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CreateCategoryRequest>,
) -> Result<Json<Category>, AppError> {
    auth.require_permission(&["category.manage"])?;

    let color = payload.color.unwrap_or_else(|| "#6366f1".to_string());
    let icon = payload.icon.unwrap_or_else(|| "Package".to_string());

    let cat = sqlx::query_as::<_, Category>(
        r#"
        UPDATE categories
        SET name = $1, description = $2, color = $3, icon = $4, "updatedAt" = NOW()
        WHERE id = $5
        RETURNING id, name, description, color, icon, "isActive", "createdAt", "updatedAt"
        "#,
    )
    .bind(payload.name)
    .bind(payload.description)
    .bind(color)
    .bind(icon)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;

    Ok(Json(cat))
}

pub async fn delete_category(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["category.manage"])?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE categories
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
        "#,
        id
    )
    .execute(&state.db)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Category not found".to_string()));
    }

    Ok(Json(json!({ "message": "Category deleted successfully" })))
}

use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{CreateUserRequest, UpdateUserRequest, UserResponse},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    #[serde(rename = "newPassword")]
    pub new_password: String,
}

pub async fn get_users(
    State(state): State<SharedState>,
    auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["user.manage", "user.create_cashier"])?;

    let rows = sqlx::query(
        r#"
        SELECT u.id, u.name, u.username, u.email, u.phone, u."isActive", u."createdAt",
               r.name as role_name,
               COALESCE(
                 json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL),
                 '[]'::json
               ) as permissions,
               (SELECT COUNT(*) FROM sales s WHERE s."userId" = u.id) as sales_count,
               (SELECT COUNT(*) FROM cash_sessions cs WHERE cs."userId" = u.id) as cash_sessions_count
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        LEFT JOIN role_permissions rp ON r.id = rp."roleId"
        LEFT JOIN permissions p ON rp."permissionId" = p.id
        GROUP BY u.id, r.name
        ORDER BY u.id ASC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut users = Vec::new();
    for row in rows {
        let perms_val: Value = row.get("permissions");
        let permissions: Vec<String> = serde_json::from_value(perms_val).unwrap_or_default();
        let role = row.get::<Option<String>, _>("role_name").unwrap_or_else(|| "CASHIER".to_string());
        users.push(json!({
            "id": row.get::<i32, _>("id"),
            "name": row.get::<String, _>("name"),
            "username": row.get::<String, _>("username"),
            "email": row.get::<Option<String>, _>("email"),
            "phone": row.get::<Option<String>, _>("phone"),
            "role": role,
            "permissions": permissions,
            "isActive": row.get::<bool, _>("isActive"),
            "createdAt": row.get::<chrono::NaiveDateTime, _>("createdAt"),
            "_count": {
                "sales": row.get::<i64, _>("sales_count"),
                "cashSessions": row.get::<i64, _>("cash_sessions_count")
            }
        }));
    }

    Ok(Json(json!(users)))
}

pub async fn get_user(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<UserResponse>, AppError> {
    auth.require_permission(&["user.manage", "user.create_cashier"])?;

    let row = sqlx::query(
        r#"
        SELECT u.id, u.name, u.username, u.email, u.phone, u."isActive", u."createdAt",
               r.name as role_name,
               COALESCE(
                 json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),
                 '[]'::json
               ) as permissions
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        LEFT JOIN role_permissions rp ON r.id = rp."roleId"
        LEFT JOIN permissions p ON rp."permissionId" = p.id
        WHERE u.id = $1
        GROUP BY u.id, r.name
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    let perms_val: Value = row.get("permissions");
    let permissions: Vec<String> = serde_json::from_value(perms_val).unwrap_or_default();

    Ok(Json(UserResponse {
        id: row.get("id"),
        name: row.get("name"),
        username: row.get("username"),
        email: row.get("email"),
        phone: row.get("phone"),
        role: row.get::<Option<String>, _>("role_name").unwrap_or_else(|| "KASIR".to_string()),
        permissions,
        is_active: row.get("isActive"),
        created_at: row.get("createdAt"),
    }))
}

pub async fn create_user(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["user.manage", "user.create_cashier"])?;

    let existing = sqlx::query!("SELECT id FROM users WHERE username = $1", payload.username)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Username already exists".to_string()));
    }

    let hashed = bcrypt::hash(&payload.password, 10)?;
    let role_id = payload.role_id.unwrap_or(1);

    let user = sqlx::query!(
        r#"
        INSERT INTO users (name, username, password, email, phone, pin, "roleId", "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
        RETURNING id, name, username
        "#,
        payload.name,
        payload.username,
        hashed,
        payload.email,
        payload.phone,
        payload.pin,
        role_id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "message": "User created successfully"
    })))
}

pub async fn update_user(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateUserRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["user.manage", "user.create_cashier"])?;

    let row = sqlx::query!(
        r#"
        UPDATE users
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            pin = COALESCE($4, pin),
            "roleId" = COALESCE($5, "roleId"),
            "isActive" = COALESCE($6, "isActive"),
            "updatedAt" = NOW()
        WHERE id = $7
        RETURNING id, name, username
        "#,
        payload.name,
        payload.email,
        payload.phone,
        payload.pin,
        payload.role_id,
        payload.is_active,
        id
    )
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(Json(json!({
        "id": row.id,
        "name": row.name,
        "message": "User updated successfully"
    })))
}

pub async fn delete_user(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["role.manage"])?;

    let rows_affected = sqlx::query!(
        r#"
        UPDATE users
        SET "isActive" = false, "updatedAt" = NOW()
        WHERE id = $1
        "#,
        id
    )
    .execute(&state.db)
    .await?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("User not found".to_string()));
    }

    Ok(Json(json!({ "message": "User deactivated successfully" })))
}

pub async fn reset_password(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["user.manage", "user.reset_pin"])?;

    let hashed = bcrypt::hash(&payload.new_password, 10)?;

    sqlx::query!(
        r#"
        UPDATE users
        SET password = $1, "updatedAt" = NOW()
        WHERE id = $2
        "#,
        hashed,
        id
    )
    .execute(&state.db)
    .await?;

    Ok(Json(json!({ "message": "Password reset successfully" })))
}

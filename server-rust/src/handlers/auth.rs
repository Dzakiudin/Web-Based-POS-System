use crate::{
    error::AppError,
    middleware::auth::{AuthUser, Claims},
    models::{LoginRequest, RegisterRequest, UserResponse},
    state::SharedState,
};
use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde_json::{json, Value};
use sqlx::Row;

pub async fn register(
    State(state): State<SharedState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<Value>, AppError> {
    // Check if user exists
    let existing = sqlx::query!("SELECT id FROM users WHERE username = $1", payload.username)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Username already exists".to_string()));
    }

    let hashed = bcrypt::hash(&payload.password, 10)?;
    let role_name = payload.role.unwrap_or_else(|| "KASIR".to_string());

    // Find role id
    let role_row = sqlx::query!("SELECT id FROM roles WHERE name = $1", role_name)
        .fetch_optional(&state.db)
        .await?;

    let role_id = match role_row {
        Some(r) => r.id,
        None => 1, // default
    };

    let user_row = sqlx::query!(
        r#"
        INSERT INTO users (name, username, password, "roleId", "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, true, NOW())
        RETURNING id
        "#,
        payload.name,
        payload.username,
        hashed,
        role_id
    )
    .fetch_one(&state.db)
    .await?;

    Ok(Json(json!({
        "message": "User registered successfully",
        "userId": user_row.id
    })))
}

pub async fn login(
    State(state): State<SharedState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<Value>, AppError> {
    let user_opt = sqlx::query(
        r#"
        SELECT u.id, u.name, u.username, u.password, u."isActive",
               r.name as role_name,
               COALESCE(
                 json_agg(p.name) FILTER (WHERE p.name IS NOT NULL),
                 '[]'::json
               ) as permissions
        FROM users u
        LEFT JOIN roles r ON u."roleId" = r.id
        LEFT JOIN role_permissions rp ON r.id = rp."roleId"
        LEFT JOIN permissions p ON rp."permissionId" = p.id
        WHERE u.username = $1
        GROUP BY u.id, r.name
        "#,
    )
    .bind(&payload.username)
    .fetch_optional(&state.db)
    .await?;

    let row = match user_opt {
        Some(r) => r,
        None => return Err(AppError::Unauthorized("Invalid credentials".to_string())),
    };

    let is_active: bool = row.get("isActive");
    if !is_active {
        return Err(AppError::Forbidden(
            "Account is deactivated. Contact admin.".to_string(),
        ));
    }

    let password_hash: String = row.get("password");
    let valid = bcrypt::verify(&payload.password, &password_hash)?;
    if !valid {
        return Err(AppError::Unauthorized("Invalid credentials".to_string()));
    }

    let id: i32 = row.get("id");
    let name: String = row.get("name");
    let username: String = row.get("username");
    let role_name: String = row.get::<Option<String>, _>("role_name").unwrap_or_else(|| "KASIR".to_string());
    let perms_val: Value = row.get("permissions");
    let permissions: Vec<String> = serde_json::from_value(perms_val).unwrap_or_default();

    let claims = Claims {
        id,
        username: username.clone(),
        role: role_name.clone(),
        permissions: permissions.clone(),
        exp: Some((chrono::Utc::now() + chrono::Duration::days(1)).timestamp() as usize),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.jwt_secret.as_bytes()),
    )?;

    // Log audit in background
    let db = state.db.clone();
    tokio::spawn(async move {
        let _ = sqlx::query!(
            r#"
            INSERT INTO audit_logs ("userId", action, entity, "entityId")
            VALUES ($1, 'LOGIN', 'User', $1)
            "#,
            id
        )
        .execute(&db)
        .await;
    });

    Ok(Json(json!({
        "token": token,
        "user": {
            "id": id,
            "name": name,
            "role": role_name,
            "username": username,
            "permissions": permissions
        }
    })))
}

pub async fn profile(
    State(state): State<SharedState>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    let row_opt = sqlx::query(
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
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?;

    let row = match row_opt {
        Some(r) => r,
        None => return Err(AppError::NotFound("User not found".to_string())),
    };

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

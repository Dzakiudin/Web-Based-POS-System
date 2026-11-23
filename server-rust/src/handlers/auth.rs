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
    auth: AuthUser,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<Value>, AppError> {
    // Only authorized admins/owners can create new accounts (blocks public OWNER self-registration)
    auth.require_permission(&["role.manage", "user.create_cashier"])?;

    let name = payload.name.trim().to_string();
    let username = payload.username.trim().to_string();
    if name.is_empty() || username.is_empty() {
        return Err(AppError::BadRequest(
            "Nama dan username wajib diisi".to_string(),
        ));
    }
    if payload.password.len() < 6 {
        return Err(AppError::BadRequest(
            "Password minimal 6 karakter".to_string(),
        ));
    }

    // Check if user exists
    let existing = sqlx::query!("SELECT id FROM users WHERE username = $1", username)
        .fetch_optional(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest("Username already exists".to_string()));
    }

    let requested_role = payload
        .role
        .unwrap_or_else(|| "CASHIER".to_string())
        .trim()
        .to_uppercase();

    // Prevent privilege escalation: only users with role.manage can assign OWNER or ADMIN roles
    if (requested_role == "OWNER" || requested_role == "ADMIN")
        && auth.require_permission(&["role.manage"]).is_err()
    {
        return Err(AppError::Forbidden(
            "Anda tidak memiliki izin untuk membuat akun OWNER/ADMIN".to_string(),
        ));
    }

    let hashed = bcrypt::hash(&payload.password, 10)?;

    // Find role id (never default to OWNER/id=1 silently)
    let role_row = sqlx::query!("SELECT id FROM roles WHERE UPPER(name) = $1", requested_role)
        .fetch_optional(&state.db)
        .await?;

    let role_id = match role_row {
        Some(r) => r.id,
        None => {
            return Err(AppError::BadRequest(format!(
                "Role '{}' tidak ditemukan",
                requested_role
            )));
        }
    };

    let user_row = sqlx::query!(
        r#"
        INSERT INTO users (name, username, password, "roleId", "isActive", "updatedAt")
        VALUES ($1, $2, $3, $4, true, NOW())
        RETURNING id
        "#,
        name,
        username,
        hashed,
        role_id
    )
    .fetch_one(&state.db)
    .await?;

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'CREATE', 'User', $2, $3)
        "#,
    )
    .bind(auth.id)
    .bind(user_row.id)
    .bind(json!({ "name": name, "status": requested_role }).to_string())
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "message": "User registered successfully",
        "userId": user_row.id
    })))
}

pub async fn login(
    State(state): State<SharedState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<Value>, AppError> {
    let username_key = payload.username.trim().to_lowercase();

    // 1. Rate limiter: check failed login attempts
    {
        let mut attempts = state.failed_logins.lock().await;
        if let Some((count, last_time)) = attempts.get(&username_key) {
            let elapsed = chrono::Utc::now().signed_duration_since(*last_time);
            if *count >= 5 && elapsed.num_minutes() < 15 {
                let remaining = 15 - elapsed.num_minutes();
                return Err(AppError::Forbidden(format!(
                    "Terlalu banyak percobaan login gagal. Akun dikunci sementara. Silakan coba lagi dalam {} menit.",
                    remaining.max(1)
                )));
            } else if elapsed.num_minutes() >= 15 {
                attempts.remove(&username_key);
            }
        }
    }

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
        None => {
            // Record failed attempt
            let mut attempts = state.failed_logins.lock().await;
            let entry = attempts.entry(username_key).or_insert((0, chrono::Utc::now()));
            entry.0 += 1;
            entry.1 = chrono::Utc::now();
            return Err(AppError::Unauthorized("Username atau password salah".to_string()));
        }
    };

    let is_active: bool = row.get("isActive");
    if !is_active {
        return Err(AppError::Forbidden(
            "Akun telah dinonaktifkan. Silakan hubungi administrator.".to_string(),
        ));
    }

    let password_hash: String = row.get("password");
    let valid = bcrypt::verify(&payload.password, &password_hash)?;
    if !valid {
        // Record failed attempt
        let mut attempts = state.failed_logins.lock().await;
        let entry = attempts.entry(username_key).or_insert((0, chrono::Utc::now()));
        entry.0 += 1;
        entry.1 = chrono::Utc::now();
        return Err(AppError::Unauthorized("Username atau password salah".to_string()));
    }

    // Login successful: clear failed login attempts
    {
        let mut attempts = state.failed_logins.lock().await;
        attempts.remove(&username_key);
    }

    let id: i32 = row.get("id");
    let name: String = row.get("name");
    let username: String = row.get("username");
    let role_name: String = row.get::<Option<String>, _>("role_name").unwrap_or_else(|| "KASIR".to_string());
    let perms_val: Value = row.get("permissions");
    let permissions: Vec<String> = serde_json::from_value(perms_val).unwrap_or_default();

    let exp_hours: i64 = std::env::var("JWT_EXPIRATION_HOURS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(24);

    let claims = Claims {
        id,
        username: username.clone(),
        role: role_name.clone(),
        permissions: permissions.clone(),
        exp: Some((chrono::Utc::now() + chrono::Duration::hours(exp_hours)).timestamp() as usize),
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

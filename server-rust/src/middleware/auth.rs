use crate::{error::AppError, state::SharedState};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts},
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: i32,
    pub username: String,
    pub role: String,
    pub permissions: Vec<String>,
    pub exp: Option<usize>,
}

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: i32,
    pub username: String,
    pub role: String,
    pub permissions: Vec<String>,
}

impl AuthUser {
    pub fn require_permission(&self, perms: &[&str]) -> Result<(), AppError> {
        if self.role == "OWNER" {
            return Ok(());
        }

        let has_perm = perms.iter().any(|&p| self.permissions.iter().any(|user_p| user_p == p));
        if has_perm {
            Ok(())
        } else {
            Err(AppError::Forbidden("Insufficient permissions".to_string()))
        }
    }
}

#[async_trait]
impl FromRequestParts<SharedState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &SharedState,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok());

        let token = match auth_header {
            Some(header) if header.starts_with("Bearer ") => &header[7..],
            _ => {
                return Err(AppError::Unauthorized(
                    "Access denied. No token provided.".to_string(),
                ))
            }
        };

        let mut validation = Validation::default();
        validation.validate_exp = true; // Enforce token expiration for security
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
            &validation,
        )
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
                AppError::Unauthorized("Sesi login telah kedaluwarsa. Silakan login kembali.".to_string())
            }
            _ => AppError::Forbidden("Token otentikasi tidak valid.".to_string()),
        })?;

        Ok(AuthUser {
            id: token_data.claims.id,
            username: token_data.claims.username,
            role: token_data.claims.role,
            permissions: token_data.claims.permissions,
        })
    }
}

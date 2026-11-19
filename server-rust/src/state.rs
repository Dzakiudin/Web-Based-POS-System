use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub uploads_dir: String,
}

pub type SharedState = Arc<AppState>;

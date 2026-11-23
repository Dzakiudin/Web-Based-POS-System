use sqlx::PgPool;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub jwt_secret: String,
    pub uploads_dir: String,
    pub failed_logins: Arc<Mutex<HashMap<String, (u32, chrono::DateTime<chrono::Utc>)>>>,
}

pub type SharedState = Arc<AppState>;

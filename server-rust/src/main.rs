mod error;
mod handlers;
mod middleware;
mod models;
mod state;

use axum::{
    http::{header, StatusCode, Uri},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Router,
};
use rust_embed::RustEmbed;
use sqlx::postgres::PgPoolOptions;
use std::{net::SocketAddr, sync::Arc};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(RustEmbed)]
#[folder = "../client/dist"]
struct FrontendAssets;

async fn static_spa_handler(uri: Uri) -> impl IntoResponse {
    let mut path = uri.path().trim_start_matches('/').to_string();
    if path.is_empty() {
        path = "index.html".to_string();
    }

    // Try disk first if CLIENT_DIST_DIR, ../client/dist, or ./dist exists
    let disk_candidates = [
        std::env::var("CLIENT_DIST_DIR").unwrap_or_default(),
        "../client/dist".to_string(),
        "./dist".to_string(),
    ];

    for dir in &disk_candidates {
        if !dir.is_empty() {
            let file_path = std::path::Path::new(dir).join(&path);
            if file_path.is_file() {
                if let Ok(data) = std::fs::read(&file_path) {
                    let mime = mime_guess::from_path(&path).first_or_octet_stream();
                    return ([(header::CONTENT_TYPE, mime.as_ref())], data).into_response();
                }
            }
        }
    }

    // Fallback to embedded in-binary assets
    match FrontendAssets::get(&path) {
        Some(content) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data).into_response()
        }
        None => {
            // Check index.html on disk
            for dir in &disk_candidates {
                if !dir.is_empty() {
                    let index_path = std::path::Path::new(dir).join("index.html");
                    if index_path.is_file() {
                        if let Ok(data) = std::fs::read(&index_path) {
                            return ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], data).into_response();
                        }
                    }
                }
            }

            // SPA fallback: return embedded index.html
            match FrontendAssets::get("index.html") {
                Some(content) => {
                    ([(header::CONTENT_TYPE, "text/html; charset=utf-8")], content.data).into_response()
                }
                None => (StatusCode::NOT_FOUND, "Frontend index.html not found").into_response(),
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env
    dotenvy::dotenv().ok();

    // Initialize tracing logger
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,server_rust=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:291199@127.0.0.1:5433/pos_db".to_string());
    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "pos_super_secret_jwt_key_2026_midnight_glass".to_string());
    let uploads_dir = std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "../server/uploads".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "5000".to_string())
        .parse()
        .unwrap_or(5000);

    tracing::info!("Connecting to PostgreSQL database...");
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await?;
    tracing::info!("Connected to PostgreSQL database successfully.");

    let shared_state = Arc::new(state::AppState {
        db: pool,
        jwt_secret,
        uploads_dir: uploads_dir.clone(),
    });

    // Ensure uploads directory exists
    std::fs::create_dir_all(&uploads_dir).ok();

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // 1. Auth routes
    let auth_routes = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/profile", get(handlers::auth::profile));

    // 2. Product routes
    let product_routes = Router::new()
        .route("/", get(handlers::product::get_products))
        .route("/", post(handlers::product::create_product))
        .route("/:id", get(handlers::product::get_product))
        .route("/:id", put(handlers::product::update_product))
        .route("/:id", delete(handlers::product::delete_product))
        .route("/:productId/variants", get(handlers::product::get_variants))
        .route("/:productId/variants", post(handlers::product::create_variant))
        .route(
            "/:productId/variants/:variantId",
            put(handlers::product::update_variant),
        )
        .route(
            "/:productId/variants/:variantId",
            delete(handlers::product::delete_variant),
        );

    // 3. Category routes
    let category_routes = Router::new()
        .route("/", get(handlers::category::get_categories))
        .route("/", post(handlers::category::create_category))
        .route("/:id", get(handlers::category::get_category))
        .route("/:id", put(handlers::category::update_category))
        .route("/:id", delete(handlers::category::delete_category));

    // 4. Customer routes
    let customer_routes = Router::new()
        .route("/", get(handlers::customer::get_customers))
        .route("/", post(handlers::customer::create_customer))
        .route("/:id", get(handlers::customer::get_customer))
        .route("/:id", put(handlers::customer::update_customer))
        .route("/:id", delete(handlers::customer::delete_customer));

    // 5. Sale routes
    let sale_routes = Router::new()
        .route("/", get(handlers::sale::get_sales))
        .route("/", post(handlers::sale::create_sale))
        .route("/:id", get(handlers::sale::get_sale))
        .route("/:id/void", post(handlers::sale::void_sale))
        .route("/:id/refund", post(handlers::sale::refund_sale));

    // 6. Discount routes
    let discount_routes = Router::new()
        .route("/", get(handlers::discount::get_discounts))
        .route("/", post(handlers::discount::create_discount))
        .route("/:id", put(handlers::discount::update_discount))
        .route("/:id", delete(handlers::discount::delete_discount))
        .route("/validate", post(handlers::discount::validate_promo_code));

    // 7. Voucher routes
    let voucher_routes = Router::new()
        .route("/", get(handlers::voucher::get_vouchers))
        .route("/", post(handlers::voucher::create_voucher))
        .route("/:id", delete(handlers::voucher::delete_voucher))
        .route("/validate/:code", get(handlers::voucher::validate_voucher))
        .route("/:id/use", post(handlers::voucher::use_voucher));

    // 8. Cash Session routes
    let cash_routes = Router::new()
        .route("/", get(handlers::cash::get_sessions))
        .route("/active", get(handlers::cash::get_active_session))
        .route("/open", post(handlers::cash::open_session))
        .route("/:id/close", post(handlers::cash::close_session))
        .route("/:id/movement", post(handlers::cash::add_movement));

    // 9. Report routes
    let report_routes = Router::new()
        .route("/dashboard", get(handlers::report::get_dashboard_stats))
        .route("/daily", get(handlers::report::get_daily_sales))
        .route("/sales", get(handlers::report::get_sales_report))
        .route("/top-products", get(handlers::report::get_top_products))
        .route("/peak-hours", get(handlers::report::get_peak_hours));

    // 10. Stock routes
    let stock_routes = Router::new()
        .route("/", get(handlers::stock::get_stock_movements))
        .route("/low-stock", get(handlers::stock::get_low_stock_products))
        .route("/", post(handlers::stock::create_stock_movement));

    // 11. Audit routes
    let audit_routes = Router::new().route("/", get(handlers::audit::get_audit_logs));

    // 12. User routes
    let user_routes = Router::new()
        .route("/", get(handlers::user::get_users))
        .route("/:id", get(handlers::user::get_user))
        .route("/", post(handlers::user::create_user))
        .route("/:id", put(handlers::user::update_user))
        .route("/:id", delete(handlers::user::delete_user))
        .route(
            "/:id/reset-password",
            post(handlers::user::reset_password),
        );

    // Combine all API routers
    let api_routes = Router::new()
        .route("/health", get(|| async { axum::Json(serde_json::json!({ "status": "ok", "app": "POS System Pro Max", "version": "2.0.0" })) }))
        .nest("/auth", auth_routes)
        .nest("/products", product_routes)
        .nest("/categories", category_routes)
        .nest("/customers", customer_routes)
        .nest("/sales", sale_routes)
        .nest("/discounts", discount_routes)
        .nest("/vouchers", voucher_routes)
        .nest("/cash-sessions", cash_routes)
        .nest("/reports", report_routes)
        .nest("/stock-movements", stock_routes)
        .nest("/audit-logs", audit_routes)
        .nest("/users", user_routes);

    // Root app with embedded assets & disk fallback
    let app = Router::new()
        .nest("/api", api_routes)
        .nest_service("/uploads", ServeDir::new(&uploads_dir))
        .fallback(static_spa_handler)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(shared_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let url = format!("http://localhost:{}", port);
    tracing::info!("🚀 POS Pro Max Server (Rust) running on {}", url);
    println!("\n=======================================================");
    println!("  ⚡ POS System Pro Max v2.0.0 (Native Release)");
    println!("  Aplikasi kasir & ritel siap digunakan.");
    println!("  Akses sistem di browser: {}", url);
    println!("=======================================================\n");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

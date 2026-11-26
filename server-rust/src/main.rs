mod error;
mod handlers;
mod middleware;
mod models;
mod state;

use axum::{
    extract::{DefaultBodyLimit, Request},
    http::{header, HeaderValue, Method, StatusCode, Uri},
    middleware::{self as axum_middleware, Next},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Router,
};
use rust_embed::RustEmbed;
use sqlx::{postgres::PgPoolOptions, Executor};
use std::{
    net::SocketAddr,
    path::{Component, Path},
    sync::Arc,
};
use tower_http::{
    compression::CompressionLayer,
    cors::{AllowHeaders, AllowOrigin, CorsLayer},
    services::ServeDir,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(RustEmbed)]
#[folder = "../client/dist"]
struct FrontendAssets;

fn is_safe_relative_path(rel_path: &str) -> bool {
    if rel_path.contains("..") || rel_path.contains('\\') {
        return false;
    }
    Path::new(rel_path)
        .components()
        .all(|c| matches!(c, Component::Normal(_)))
}

fn cache_control_for(path: &str) -> &'static str {
    if path.starts_with("assets/") {
        "public, max-age=31536000, immutable"
    } else if path.ends_with(".html") || path.is_empty() {
        "no-cache, no-store, must-revalidate"
    } else {
        "public, max-age=3600"
    }
}

async fn static_spa_handler(uri: Uri) -> impl IntoResponse {
    let mut path = uri.path().trim_start_matches('/').to_string();
    if path.is_empty() {
        path = "index.html".to_string();
    }

    // Security guard: block path traversal attempts (e.g. /../../.env)
    if !is_safe_relative_path(&path) {
        return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
    }

    // Try disk first if CLIENT_DIST_DIR, ../client/dist, or ./dist exists
    let disk_candidates = [
        std::env::var("CLIENT_DIST_DIR").unwrap_or_default(),
        "../client/dist".to_string(),
        "./dist".to_string(),
    ];

    for dir in &disk_candidates {
        if !dir.is_empty() {
            if let Ok(base_canon) = std::fs::canonicalize(dir) {
                let candidate = base_canon.join(&path);
                if let Ok(file_canon) = std::fs::canonicalize(&candidate) {
                    if file_canon.starts_with(&base_canon) && file_canon.is_file() {
                        if let Ok(data) = std::fs::read(&file_canon) {
                            let mime = mime_guess::from_path(&path).first_or_octet_stream();
                            return (
                                [
                                    (header::CONTENT_TYPE, mime.as_ref()),
                                    (header::CACHE_CONTROL, cache_control_for(&path)),
                                ],
                                data,
                            )
                                .into_response();
                        }
                    }
                }
            }
        }
    }

    // Fallback to embedded in-binary assets
    match FrontendAssets::get(&path) {
        Some(content) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream();
            (
                [
                    (header::CONTENT_TYPE, mime.as_ref()),
                    (header::CACHE_CONTROL, cache_control_for(&path)),
                ],
                content.data,
            )
                .into_response()
        }
        None => {
            // Check index.html on disk
            for dir in &disk_candidates {
                if !dir.is_empty() {
                    let index_path = Path::new(dir).join("index.html");
                    if index_path.is_file() {
                        if let Ok(data) = std::fs::read(&index_path) {
                            return (
                                [
                                    (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                                    (header::CACHE_CONTROL, "no-cache, no-store, must-revalidate"),
                                ],
                                data,
                            )
                                .into_response();
                        }
                    }
                }
            }

            // SPA fallback: return embedded index.html
            match FrontendAssets::get("index.html") {
                Some(content) => (
                    [
                        (header::CONTENT_TYPE, "text/html; charset=utf-8"),
                        (header::CACHE_CONTROL, "no-cache, no-store, must-revalidate"),
                    ],
                    content.data,
                )
                    .into_response(),
                None => (StatusCode::NOT_FOUND, "Frontend index.html not found").into_response(),
            }
        }
    }
}

async fn security_headers_middleware(req: Request, next: Next) -> impl IntoResponse {
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers.insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        header::X_FRAME_OPTIONS,
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        header::HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("strict-origin-when-cross-origin"),
    );
    res
}

async fn ensure_db_schema_and_indexes(pool: &sqlx::PgPool) {
    let statements = [
        // Store, branding, QRIS, payment accounts & POS rules table
        r#"CREATE TABLE IF NOT EXISTS store_settings (
            id INT PRIMARY KEY DEFAULT 1,
            "appName" TEXT NOT NULL DEFAULT 'POS System',
            "storeName" TEXT NOT NULL DEFAULT 'POS SYSTEM STORE',
            address TEXT NOT NULL DEFAULT 'Jl. Jendral Sudirman Kav. 52, Jakarta',
            phone TEXT NOT NULL DEFAULT '(021) 5299-1000',
            "footerLine1" TEXT NOT NULL DEFAULT 'Terima kasih atas kunjungan Anda!',
            "footerLine2" TEXT NOT NULL DEFAULT 'Barang yang dibeli tidak dapat ditukar',
            "paperWidth" TEXT NOT NULL DEFAULT '80mm',
            "logoUrl" TEXT,
            "qrisImageUrl" TEXT,
            "paymentAccounts" JSONB NOT NULL DEFAULT '[{"bank":"BCA","accountNumber":"8830192831","accountName":"POS Store Official"},{"bank":"Mandiri","accountNumber":"137001928312","accountName":"POS Store Official"},{"bank":"GoPay / OVO / Dana","accountNumber":"081234567890","accountName":"POS Store"}]'::jsonb,
            "requireOpenShift" BOOLEAN NOT NULL DEFAULT false,
            "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
            "serviceChargeRate" NUMERIC(5,2) NOT NULL DEFAULT 0,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )"#,
        // Seamless migration for existing store_settings tables
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "appName" TEXT NOT NULL DEFAULT 'POS System'"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "logoUrl" TEXT"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "qrisImageUrl" TEXT"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "paymentAccounts" JSONB NOT NULL DEFAULT '[{"bank":"BCA","accountNumber":"8830192831","accountName":"POS Store Official"},{"bank":"Mandiri","accountNumber":"137001928312","accountName":"POS Store Official"},{"bank":"GoPay / OVO / Dana","accountNumber":"081234567890","accountName":"POS Store"}]'::jsonb"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "requireOpenShift" BOOLEAN NOT NULL DEFAULT false"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC(5,2) NOT NULL DEFAULT 0"#,
        r#"ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS "serviceChargeRate" NUMERIC(5,2) NOT NULL DEFAULT 0"#,
        r#"INSERT INTO store_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING"#,
        // Performance indexes for long-term high-volume POS operations
        r#"CREATE INDEX IF NOT EXISTS idx_sales_date_status ON sales (date DESC, status)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_sales_cash_session ON sales ("cashSessionId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales ("customerId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_sales_user ON sales ("userId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_sale_details_sale ON sale_details ("saleId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_sale_details_product ON sale_details ("productId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments ("saleId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements ("createdAt" DESC)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements ("productId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs ("createdAt" DESC)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_audit_logs_action_entity ON audit_logs (action, entity)"#,
        r#"CREATE INDEX IF NOT EXISTS idx_products_active_cat ON products ("isActive", "categoryId")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions (status, "openedAt" DESC)"#,
        // Wholesale, Buy X Get Y, Category, Member & Order discount rules extension
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'ORDER'"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "productId" INT REFERENCES products(id) ON DELETE CASCADE"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "categoryId" INT REFERENCES categories(id) ON DELETE CASCADE"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "minQuantity" INT NOT NULL DEFAULT 1"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "bonusQuantity" INT NOT NULL DEFAULT 0"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "pricingMode" TEXT NOT NULL DEFAULT 'ORDER'"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "unitLabel" TEXT"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "maxDiscount" NUMERIC(12,2)"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "autoApply" BOOLEAN NOT NULL DEFAULT false"#,
        r#"ALTER TABLE discounts ADD COLUMN IF NOT EXISTS "targetTier" TEXT"#,
        r#"CREATE INDEX IF NOT EXISTS idx_discounts_scope_product ON discounts (scope, "productId", "isActive")"#,
        r#"CREATE INDEX IF NOT EXISTS idx_discounts_scope_category ON discounts (scope, "categoryId", "isActive")"#,
        r#"ALTER TABLE sale_details ADD COLUMN IF NOT EXISTS "pricingMode" TEXT"#,
        r#"CREATE TABLE IF NOT EXISTS barcode_cache (
            barcode TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT,
            category TEXT,
            image TEXT,
            "suggestedPrice" NUMERIC(12,2),
            source TEXT,
            "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
        )"#,
    ];

    for sql in statements {
        if let Err(e) = sqlx::query(sql).execute(pool).await {
            tracing::warn!("Startup DB index/table init warning: {} (SQL: {})", e, sql);
        }
    }
    tracing::info!("Database store_settings & performance indexes verified.");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received, draining active requests gracefully...");
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load .env
    dotenvy::dotenv().ok();

    // Ensure logs directory exists and setup persistent daily rolling file logger + stdout
    std::fs::create_dir_all("./logs").ok();
    let file_appender = tracing_appender::rolling::daily("./logs", "pos-server.log");
    let (non_blocking_file, _log_guard) = tracing_appender::non_blocking(file_appender);

    // Initialize tracing logger (stdout + daily file)
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,server_rust=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .with(
            tracing_subscriber::fmt::layer()
                .with_ansi(false)
                .with_writer(non_blocking_file),
        )
        .init();

    let database_url = std::env::var("DATABASE_URL")
        .expect("FATAL: DATABASE_URL tidak ditemukan di .env atau environment variables!");
    let jwt_secret = std::env::var("JWT_SECRET")
        .expect("FATAL: JWT_SECRET tidak ditemukan di .env atau environment variables!");
    let uploads_dir = std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "5000".to_string())
        .parse()
        .unwrap_or(5000);

    let pg_tz_sql = if let Ok(tz) = std::env::var("APP_TIMEZONE") {
        let trimmed = tz.trim();
        if !trimmed.is_empty()
            && trimmed
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '_' | '+' | '-' | ':'))
        {
            format!("SET TIME ZONE '{}'", trimmed)
        } else {
            let offset_secs = chrono::Local::now().offset().local_minus_utc();
            let sign = if offset_secs >= 0 { '+' } else { '-' };
            let abs_secs = offset_secs.abs();
            format!(
                "SET TIME ZONE INTERVAL '{}{:02}:{:02}' HOUR TO MINUTE",
                sign,
                abs_secs / 3600,
                (abs_secs % 3600) / 60
            )
        }
    } else {
        let offset_secs = chrono::Local::now().offset().local_minus_utc();
        let sign = if offset_secs >= 0 { '+' } else { '-' };
        let abs_secs = offset_secs.abs();
        format!(
            "SET TIME ZONE INTERVAL '{}{:02}:{:02}' HOUR TO MINUTE",
            sign,
            abs_secs / 3600,
            (abs_secs % 3600) / 60
        )
    };
    let pg_tz_sql_clone = pg_tz_sql.clone();

    tracing::info!("Connecting to PostgreSQL database ({})...", pg_tz_sql);
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .idle_timeout(std::time::Duration::from_secs(300))
        .after_connect(move |conn, _meta| {
            let tz_sql = pg_tz_sql_clone.clone();
            Box::pin(async move {
                conn.execute(tz_sql.as_str()).await?;
                Ok(())
            })
        })
        .connect(&database_url)
        .await?;
    tracing::info!("Connected to PostgreSQL database successfully.");

    ensure_db_schema_and_indexes(&pool).await;

    let shared_state = Arc::new(state::AppState {
        db: pool,
        jwt_secret,
        uploads_dir: uploads_dir.clone(),
        failed_logins: Arc::new(tokio::sync::Mutex::new(std::collections::HashMap::new())),
    });

    // Ensure uploads directory exists
    std::fs::create_dir_all(&uploads_dir).ok();

    // CORS configuration: mirror request origin & headers, allow all standard methods with credentials
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::mirror_request())
        .allow_methods([
            Method::GET,
            Method::POST,
            Method::PUT,
            Method::DELETE,
            Method::OPTIONS,
            Method::PATCH,
            Method::HEAD,
        ])
        .allow_headers(AllowHeaders::mirror_request())
        .allow_credentials(true);

    // 1. Auth routes
    let auth_routes = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/profile", get(handlers::auth::profile));

    // 2. Product routes
    let product_routes = Router::new()
        .route("/", get(handlers::product::get_products))
        .route("/", post(handlers::product::create_product))
        .route(
            "/barcode-lookup/:barcode",
            get(handlers::product::lookup_barcode),
        )
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

    // 13. Store Settings routes
    let settings_routes = Router::new()
        .route("/public", get(handlers::settings::get_public_settings))
        .route("/store", get(handlers::settings::get_store_settings))
        .route("/store", put(handlers::settings::update_store_settings))
        .route(
            "/upload/:kind",
            post(handlers::settings::upload_setting_image),
        )
        .route(
            "/upload/:kind",
            delete(handlers::settings::delete_setting_image),
        );

    let app_version = env!("CARGO_PKG_VERSION");

    // Combine all API routers
    let api_routes = Router::new()
        .route("/health", get(move || async move { axum::Json(serde_json::json!({ "status": "ok", "app": "POS System Pro Max", "version": app_version })) }))
        .route("/app/version", get(move || async move {
            let download_url = format!(
                "https://github.com/Dzakiudin/Web-Based-POS-System/releases/download/v{}/toko-aznun-v{}.apk",
                app_version, app_version
            );
            axum::Json(serde_json::json!({
                "version": app_version,
                "releaseDate": "2026-11-26",
                "releaseNotes": "• Pencarian Info Barcode Mendalam (D4Vinci/Scrapling): mencari otomatis dari 10 sumber katalog ritel Indonesia & global secara paralel (Mega Swalayan, Reny Swalayanku, Go-UPC, Open Food/Beauty/Products Facts, UPCitemdb, Buycott, BarcodeSpider, & Yahoo Indonesia).\n• Auto-fill nama, merek, kategori, foto, & estimasi harga Rp langsung di PC maupun HP Android tanpa terhambat CORS.\n• Cache PostgreSQL (barcode_cache) membuat pencarian ulang barcode yang sama instan & tetap tersedia offline.",
                "downloadUrl": download_url
            }))
        }))
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
        .nest("/users", user_routes)
        .nest("/settings", settings_routes);

    // Root app with embedded assets, security headers, 5MB body limit & gzip/brotli compression
    let app = Router::new()
        .nest("/api", api_routes)
        .nest_service("/uploads", ServeDir::new(&uploads_dir))
        .fallback(static_spa_handler)
        .layer(DefaultBodyLimit::max(5 * 1024 * 1024))
        .layer(axum_middleware::from_fn(security_headers_middleware))
        .layer(CompressionLayer::new())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(shared_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let url = format!("http://localhost:{}", port);
    tracing::info!("🚀 POS Pro Max Server v{} (Rust) running on {}", app_version, url);
    println!("\n=======================================================");
    println!("  ⚡ POS System Pro Max v{} (Native Release)", app_version);
    println!("  Aplikasi kasir & ritel siap digunakan.");
    println!("  Akses sistem di browser: {}", url);
    println!("=======================================================\n");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

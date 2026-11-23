use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    state::SharedState,
};
use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentAccount {
    pub bank: String,
    pub account_number: String,
    pub account_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoreSettingsPayload {
    pub app_name: String,
    pub store_name: String,
    pub address: String,
    pub phone: String,
    pub footer_line1: String,
    pub footer_line2: String,
    pub paper_width: String,
    pub payment_accounts: Vec<PaymentAccount>,
    pub require_open_shift: bool,
    pub tax_rate: Decimal,
    pub service_charge_rate: Decimal,
}

fn default_payment_accounts() -> Value {
    json!([
        { "bank": "BCA", "accountNumber": "8830192831", "accountName": "POS Store Official" },
        { "bank": "Mandiri", "accountNumber": "137001928312", "accountName": "POS Store Official" },
        { "bank": "GoPay / OVO / Dana", "accountNumber": "081234567890", "accountName": "POS Store" }
    ])
}

/// Public branding endpoint (accessible before login so Login page & browser tab show real appName & logo)
pub async fn get_public_settings(
    State(state): State<SharedState>,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query(
        r#"
        SELECT "appName", "storeName", "logoUrl"
        FROM store_settings
        WHERE id = 1
        "#,
    )
    .fetch_optional(&state.db)
    .await?;

    match row {
        Some(r) => Ok(Json(json!({
            "appName": r.get::<String, _>("appName"),
            "storeName": r.get::<String, _>("storeName"),
            "logoUrl": r.get::<Option<String>, _>("logoUrl"),
        }))),
        None => Ok(Json(json!({
            "appName": "POS System",
            "storeName": "POS SYSTEM STORE",
            "logoUrl": null,
        }))),
    }
}

pub async fn get_store_settings(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query(
        r#"
        SELECT "appName", "storeName", address, phone, "footerLine1", "footerLine2",
               "paperWidth", "logoUrl", "qrisImageUrl", "paymentAccounts",
               "requireOpenShift", "taxRate", "serviceChargeRate"
        FROM store_settings
        WHERE id = 1
        "#,
    )
    .fetch_optional(&state.db)
    .await?;

    match row {
        Some(r) => Ok(Json(json!({
            "appName": r.get::<String, _>("appName"),
            "storeName": r.get::<String, _>("storeName"),
            "address": r.get::<String, _>("address"),
            "phone": r.get::<String, _>("phone"),
            "footerLine1": r.get::<String, _>("footerLine1"),
            "footerLine2": r.get::<String, _>("footerLine2"),
            "paperWidth": r.get::<String, _>("paperWidth"),
            "logoUrl": r.get::<Option<String>, _>("logoUrl"),
            "qrisImageUrl": r.get::<Option<String>, _>("qrisImageUrl"),
            "paymentAccounts": r.get::<Value, _>("paymentAccounts"),
            "requireOpenShift": r.get::<bool, _>("requireOpenShift"),
            "taxRate": r.get::<Decimal, _>("taxRate"),
            "serviceChargeRate": r.get::<Decimal, _>("serviceChargeRate"),
        }))),
        None => Ok(Json(json!({
            "appName": "POS System",
            "storeName": "POS SYSTEM STORE",
            "address": "Jl. Jendral Sudirman Kav. 52, Jakarta",
            "phone": "(021) 5299-1000",
            "footerLine1": "Terima kasih atas kunjungan Anda!",
            "footerLine2": "Barang yang dibeli tidak dapat ditukar",
            "paperWidth": "80mm",
            "logoUrl": null,
            "qrisImageUrl": null,
            "paymentAccounts": default_payment_accounts(),
            "requireOpenShift": false,
            "taxRate": 0,
            "serviceChargeRate": 0,
        }))),
    }
}

pub async fn update_store_settings(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<StoreSettingsPayload>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["role.manage", "product.crud"])?;

    let app_name = payload.app_name.trim().to_string();
    let store_name = payload.store_name.trim().to_string();
    let address = payload.address.trim().to_string();
    let phone = payload.phone.trim().to_string();
    let footer_line1 = payload.footer_line1.trim().to_string();
    let footer_line2 = payload.footer_line2.trim().to_string();
    let paper_width = if payload.paper_width == "58mm" {
        "58mm".to_string()
    } else {
        "80mm".to_string()
    };

    if app_name.is_empty() || app_name.len() > 60 {
        return Err(AppError::BadRequest(
            "Nama aplikasi wajib diisi (maksimal 60 karakter)".to_string(),
        ));
    }
    if store_name.is_empty() || store_name.len() > 80 {
        return Err(AppError::BadRequest(
            "Nama toko wajib diisi (maksimal 80 karakter)".to_string(),
        ));
    }
    if address.len() > 200 || phone.len() > 40 || footer_line1.len() > 140 || footer_line2.len() > 140 {
        return Err(AppError::BadRequest(
            "Panjang teks profil toko melebihi batas maksimal".to_string(),
        ));
    }
    if payload.tax_rate < Decimal::ZERO || payload.tax_rate > Decimal::from(100) {
        return Err(AppError::BadRequest(
            "Tarif pajak (PPN) harus antara 0% sampai 100%".to_string(),
        ));
    }
    if payload.service_charge_rate < Decimal::ZERO || payload.service_charge_rate > Decimal::from(100) {
        return Err(AppError::BadRequest(
            "Tarif biaya layanan harus antara 0% sampai 100%".to_string(),
        ));
    }
    if payload.payment_accounts.len() > 20 {
        return Err(AppError::BadRequest(
            "Maksimal 20 rekening / akun pembayaran".to_string(),
        ));
    }

    let cleaned_accounts: Vec<PaymentAccount> = payload
        .payment_accounts
        .into_iter()
        .filter_map(|acc| {
            let bank = acc.bank.trim().to_string();
            let account_number = acc.account_number.trim().to_string();
            let account_name = acc.account_name.trim().to_string();
            if bank.is_empty() || account_number.is_empty() {
                None
            } else {
                Some(PaymentAccount {
                    bank: bank.chars().take(50).collect(),
                    account_number: account_number.chars().take(60).collect(),
                    account_name: account_name.chars().take(80).collect(),
                })
            }
        })
        .collect();

    let accounts_json = serde_json::to_value(&cleaned_accounts).unwrap_or_else(|_| json!([]));

    let row = sqlx::query(
        r#"
        INSERT INTO store_settings (
            id, "appName", "storeName", address, phone, "footerLine1", "footerLine2",
            "paperWidth", "paymentAccounts", "requireOpenShift", "taxRate", "serviceChargeRate", "updatedAt"
        )
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (id) DO UPDATE SET
            "appName" = EXCLUDED."appName",
            "storeName" = EXCLUDED."storeName",
            address = EXCLUDED.address,
            phone = EXCLUDED.phone,
            "footerLine1" = EXCLUDED."footerLine1",
            "footerLine2" = EXCLUDED."footerLine2",
            "paperWidth" = EXCLUDED."paperWidth",
            "paymentAccounts" = EXCLUDED."paymentAccounts",
            "requireOpenShift" = EXCLUDED."requireOpenShift",
            "taxRate" = EXCLUDED."taxRate",
            "serviceChargeRate" = EXCLUDED."serviceChargeRate",
            "updatedAt" = NOW()
        RETURNING "logoUrl", "qrisImageUrl"
        "#,
    )
    .bind(&app_name)
    .bind(&store_name)
    .bind(&address)
    .bind(&phone)
    .bind(&footer_line1)
    .bind(&footer_line2)
    .bind(&paper_width)
    .bind(&accounts_json)
    .bind(payload.require_open_shift)
    .bind(payload.tax_rate)
    .bind(payload.service_charge_rate)
    .fetch_one(&state.db)
    .await?;

    let logo_url: Option<String> = row.get("logoUrl");
    let qris_image_url: Option<String> = row.get("qrisImageUrl");

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'UPDATE', 'StoreSettings', 1, $2)
        "#,
    )
    .bind(auth.id)
    .bind(
        json!({
            "name": app_name,
            "paperWidth": paper_width,
            "taxRate": payload.tax_rate,
            "serviceChargeRate": payload.service_charge_rate
        })
        .to_string(),
    )
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "appName": app_name,
        "storeName": store_name,
        "address": address,
        "phone": phone,
        "footerLine1": footer_line1,
        "footerLine2": footer_line2,
        "paperWidth": paper_width,
        "logoUrl": logo_url,
        "qrisImageUrl": qris_image_url,
        "paymentAccounts": accounts_json,
        "requireOpenShift": payload.require_open_shift,
        "taxRate": payload.tax_rate,
        "serviceChargeRate": payload.service_charge_rate,
        "message": "Pengaturan aplikasi berhasil disimpan"
    })))
}

fn remove_old_upload_file(uploads_dir: &str, old_url: Option<String>) {
    if let Some(url) = old_url {
        if let Some(filename) = url.strip_prefix("/uploads/") {
            if !filename.contains("..") && !filename.contains('/') && !filename.contains('\\') {
                let target = std::path::Path::new(uploads_dir).join(filename);
                let _ = std::fs::remove_file(target);
            }
        }
    }
}

pub async fn upload_setting_image(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(kind): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["role.manage", "product.crud"])?;

    let col_name = match kind.as_str() {
        "qris" => "\"qrisImageUrl\"",
        "logo" => "\"logoUrl\"",
        _ => {
            return Err(AppError::BadRequest(
                "Tipe gambar tidak valid (harus 'qris' atau 'logo')".to_string(),
            ))
        }
    };

    let mut file_bytes: Option<Vec<u8>> = None;
    let mut ext = "png".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Gagal membaca file upload: {}", e)))?
    {
        if field.name() == Some("file") || field.file_name().is_some() {
            let content_type = field.content_type().unwrap_or("").to_lowercase();
            let orig_name = field.file_name().unwrap_or("").to_lowercase();

            ext = if content_type.contains("jpeg") || content_type.contains("jpg") || orig_name.ends_with(".jpg") || orig_name.ends_with(".jpeg") {
                "jpg".to_string()
            } else if content_type.contains("webp") || orig_name.ends_with(".webp") {
                "webp".to_string()
            } else if content_type.contains("png") || orig_name.ends_with(".png") {
                "png".to_string()
            } else {
                return Err(AppError::BadRequest(
                    "Format file harus berupa gambar PNG, JPG, atau WebP".to_string(),
                ));
            };

            let data = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Gagal membaca data gambar: {}", e)))?;

            if data.is_empty() {
                return Err(AppError::BadRequest("File gambar kosong".to_string()));
            }
            if data.len() > 4 * 1024 * 1024 {
                return Err(AppError::BadRequest(
                    "Ukuran gambar maksimal 4 MB".to_string(),
                ));
            }
            file_bytes = Some(data.to_vec());
            break;
        }
    }

    let bytes = file_bytes
        .ok_or_else(|| AppError::BadRequest("File gambar tidak ditemukan dalam request".to_string()))?;

    std::fs::create_dir_all(&state.uploads_dir)
        .map_err(|e| AppError::Internal(format!("Gagal membuat folder uploads: {}", e)))?;

    // Fetch existing URL so we can clean up the old file after replacement
    let select_sql = format!("SELECT {} FROM store_settings WHERE id = 1", col_name);
    let old_url: Option<String> = sqlx::query_scalar(&select_sql)
        .fetch_optional(&state.db)
        .await?
        .flatten();

    let filename = format!("{}-{}.{}", kind, uuid::Uuid::new_v4(), ext);
    let full_path = std::path::Path::new(&state.uploads_dir).join(&filename);
    std::fs::write(&full_path, &bytes)
        .map_err(|e| AppError::Internal(format!("Gagal menyimpan file gambar: {}", e)))?;

    let public_url = format!("/uploads/{}", filename);

    let update_sql = format!(
        "UPDATE store_settings SET {} = $1, \"updatedAt\" = NOW() WHERE id = 1",
        col_name
    );
    sqlx::query(&update_sql)
        .bind(&public_url)
        .execute(&state.db)
        .await?;

    remove_old_upload_file(&state.uploads_dir, old_url);

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'UPDATE', 'StoreSettings', 1, $2)
        "#,
    )
    .bind(auth.id)
    .bind(json!({ "type": format!("upload_{}", kind), "note": public_url }).to_string())
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "url": public_url,
        "message": if kind == "qris" { "Foto QRIS berhasil diunggah" } else { "Logo aplikasi berhasil diunggah" }
    })))
}

pub async fn delete_setting_image(
    State(state): State<SharedState>,
    auth: AuthUser,
    Path(kind): Path<String>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["role.manage", "product.crud"])?;

    let col_name = match kind.as_str() {
        "qris" => "\"qrisImageUrl\"",
        "logo" => "\"logoUrl\"",
        _ => {
            return Err(AppError::BadRequest(
                "Tipe gambar tidak valid (harus 'qris' atau 'logo')".to_string(),
            ))
        }
    };

    let select_sql = format!("SELECT {} FROM store_settings WHERE id = 1", col_name);
    let old_url: Option<String> = sqlx::query_scalar(&select_sql)
        .fetch_optional(&state.db)
        .await?
        .flatten();

    let update_sql = format!(
        "UPDATE store_settings SET {} = NULL, \"updatedAt\" = NOW() WHERE id = 1",
        col_name
    );
    sqlx::query(&update_sql).execute(&state.db).await?;

    remove_old_upload_file(&state.uploads_dir, old_url);

    let _ = sqlx::query(
        r#"
        INSERT INTO audit_logs ("userId", action, entity, "entityId", details)
        VALUES ($1, 'DELETE', 'StoreSettings', 1, $2)
        "#,
    )
    .bind(auth.id)
    .bind(json!({ "type": format!("delete_{}", kind) }).to_string())
    .execute(&state.db)
    .await;

    Ok(Json(json!({
        "message": if kind == "qris" { "Foto QRIS berhasil dihapus" } else { "Logo aplikasi dikembalikan ke default" }
    })))
}

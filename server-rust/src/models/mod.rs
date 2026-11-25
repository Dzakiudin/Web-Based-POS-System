use chrono::NaiveDateTime;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// --- User & Role Models ---
#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: i32,
    pub name: String,
    pub username: String,
    #[serde(skip_serializing)]
    pub password: Option<String>,
    pub pin: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[sqlx(rename = "roleId")]
    #[serde(rename = "roleId")]
    pub role_id: Option<i32>,
    #[sqlx(rename = "isActive")]
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UserResponse {
    pub id: i32,
    pub name: String,
    pub username: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub role: String,
    pub permissions: Vec<String>,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub name: String,
    pub username: String,
    pub password: String,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub name: String,
    pub username: String,
    pub password: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub pin: Option<String>,
    #[serde(rename = "roleId")]
    pub role_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub pin: Option<String>,
    #[serde(rename = "roleId")]
    pub role_id: Option<i32>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}

// --- Category Models ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Category {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub color: String,
    pub icon: String,
    #[sqlx(rename = "isActive")]
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

// --- Product & Variant Models ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct ProductVariant {
    pub id: i32,
    #[sqlx(rename = "productId")]
    #[serde(rename = "productId")]
    pub product_id: i32,
    pub name: String,
    pub sku: Option<String>,
    pub price: Decimal,
    #[sqlx(rename = "costPrice")]
    #[serde(rename = "costPrice")]
    pub cost_price: Decimal,
    pub stock: i32,
    #[sqlx(rename = "isActive")]
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Product {
    pub id: i32,
    pub name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub price: Decimal,
    #[sqlx(rename = "costPrice")]
    #[serde(rename = "costPrice")]
    pub cost_price: Decimal,
    pub stock: i32,
    #[sqlx(rename = "minStock")]
    #[serde(rename = "minStock")]
    pub min_stock: i32,
    pub image: Option<String>,
    #[sqlx(rename = "categoryId")]
    #[serde(rename = "categoryId")]
    pub category_id: Option<i32>,
    #[sqlx(rename = "isActive")]
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductWithRelations {
    #[serde(flatten)]
    pub product: Product,
    pub category: Option<Category>,
    pub variants: Vec<ProductVariant>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProductRequest {
    pub name: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub price: Decimal,
    #[serde(rename = "costPrice")]
    pub cost_price: Option<Decimal>,
    pub stock: i32,
    #[serde(rename = "minStock")]
    pub min_stock: Option<i32>,
    pub image: Option<String>,
    #[serde(rename = "categoryId")]
    pub category_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductRequest {
    pub name: Option<String>,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub price: Option<Decimal>,
    #[serde(rename = "costPrice")]
    pub cost_price: Option<Decimal>,
    pub stock: Option<i32>,
    #[serde(rename = "minStock")]
    pub min_stock: Option<i32>,
    pub image: Option<String>,
    #[serde(rename = "categoryId")]
    pub category_id: Option<i32>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}

// --- Customer Models ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Customer {
    pub id: i32,
    pub name: String,
    pub email: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    #[sqlx(rename = "loyaltyPoints")]
    #[serde(rename = "loyaltyPoints")]
    pub loyalty_points: i32,
    #[sqlx(rename = "membershipTier")]
    #[serde(rename = "membershipTier")]
    pub membership_tier: String,
    #[sqlx(rename = "totalSpent")]
    #[serde(rename = "totalSpent")]
    pub total_spent: Decimal,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCustomerRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

// --- Sale Models ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Sale {
    pub id: i32,
    #[sqlx(rename = "receiptNumber")]
    #[serde(rename = "receiptNumber")]
    pub receipt_number: String,
    pub date: NaiveDateTime,
    #[sqlx(rename = "totalPrice")]
    #[serde(rename = "totalPrice")]
    pub total_price: Decimal,
    #[sqlx(rename = "discountAmount")]
    #[serde(rename = "discountAmount")]
    pub discount_amount: Decimal,
    #[sqlx(rename = "finalPrice")]
    #[serde(rename = "finalPrice")]
    pub final_price: Decimal,
    pub status: String,
    pub notes: Option<String>,
    #[sqlx(rename = "customerId")]
    #[serde(rename = "customerId")]
    pub customer_id: Option<i32>,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    #[sqlx(rename = "cashSessionId")]
    #[serde(rename = "cashSessionId")]
    pub cash_session_id: Option<i32>,
    #[sqlx(rename = "refundReason")]
    #[serde(rename = "refundReason")]
    pub refund_reason: Option<String>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct SaleDetail {
    pub id: i32,
    #[sqlx(rename = "saleId")]
    #[serde(rename = "saleId")]
    pub sale_id: i32,
    #[sqlx(rename = "productId")]
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[sqlx(rename = "variantId")]
    #[serde(rename = "variantId")]
    pub variant_id: Option<i32>,
    pub quantity: i32,
    #[sqlx(rename = "unitPrice")]
    #[serde(rename = "unitPrice")]
    pub unit_price: Decimal,
    #[sqlx(rename = "discountAmount")]
    #[serde(rename = "discountAmount")]
    pub discount_amount: Decimal,
    pub subtotal: Decimal,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Payment {
    pub id: i32,
    #[sqlx(rename = "saleId")]
    #[serde(rename = "saleId")]
    pub sale_id: i32,
    pub method: String,
    pub amount: Decimal,
    pub change: Decimal,
    pub reference: Option<String>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaleItemRequest {
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[serde(rename = "variantId")]
    pub variant_id: Option<i32>,
    pub quantity: i32,
    #[serde(rename = "unitPrice", alias = "price")]
    pub unit_price: Decimal,
    #[serde(rename = "discountAmount", alias = "discount", default)]
    pub discount_amount: Option<Decimal>,
    #[serde(default)]
    pub subtotal: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentRequest {
    pub method: String,
    pub amount: Decimal,
    pub change: Option<Decimal>,
    pub reference: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSaleRequest {
    #[serde(rename = "totalPrice")]
    pub total_price: Decimal,
    #[serde(rename = "discountAmount")]
    pub discount_amount: Option<Decimal>,
    #[serde(rename = "finalPrice")]
    pub final_price: Decimal,
    pub notes: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<i32>,
    pub items: Vec<SaleItemRequest>,
    pub payments: Vec<PaymentRequest>,
}

// --- Discounts & Vouchers ---
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "DiscountType", rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DiscountType {
    Percentage,
    Fixed,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Discount {
    pub id: i32,
    pub name: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub discount_type: DiscountType,
    pub value: Decimal,
    #[sqlx(rename = "minPurchase")]
    #[serde(rename = "minPurchase")]
    pub min_purchase: Decimal,
    pub code: Option<String>,
    pub scope: String,
    #[sqlx(rename = "productId")]
    #[serde(rename = "productId")]
    pub product_id: Option<i32>,
    #[sqlx(rename = "minQuantity")]
    #[serde(rename = "minQuantity")]
    pub min_quantity: i32,
    #[sqlx(rename = "pricingMode")]
    #[serde(rename = "pricingMode")]
    pub pricing_mode: String,
    #[sqlx(rename = "unitLabel")]
    #[serde(rename = "unitLabel")]
    pub unit_label: Option<String>,
    #[sqlx(rename = "startDate")]
    #[serde(rename = "startDate")]
    pub start_date: NaiveDateTime,
    #[sqlx(rename = "endDate")]
    #[serde(rename = "endDate")]
    pub end_date: Option<NaiveDateTime>,
    #[sqlx(rename = "isActive")]
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[sqlx(rename = "maxUses")]
    #[serde(rename = "maxUses")]
    pub max_uses: Option<i32>,
    #[sqlx(rename = "usedCount")]
    #[serde(rename = "usedCount")]
    pub used_count: i32,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
    #[sqlx(rename = "updatedAt")]
    #[serde(rename = "updatedAt")]
    pub updated_at: NaiveDateTime,
}

pub fn parse_flexible_datetime(s: &str) -> Option<NaiveDateTime> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }
    // 1. Try RFC3339 / ISO8601 with timezone (e.g. 2026-11-20T06:39:01.000Z or +07:00)
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return Some(dt.naive_local());
    }
    // 2. Try standard ISO without timezone (e.g. 2026-11-20T06:39:01.000 or 2026-11-20T06:39:01)
    if let Ok(ndt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f") {
        return Some(ndt);
    }
    if let Ok(ndt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S") {
        return Some(ndt);
    }
    if let Ok(ndt) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return Some(ndt);
    }
    // 3. Try date only (e.g. 2026-11-20) -> 23:59:59
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        return nd.and_hms_opt(23, 59, 59);
    }
    None
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDiscountRequest {
    pub name: String,
    #[serde(rename = "type", default)]
    pub discount_type: Option<DiscountType>,
    pub value: Decimal,
    #[serde(rename = "minPurchase")]
    pub min_purchase: Option<Decimal>,
    pub code: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "maxUses")]
    pub max_uses: Option<i32>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
    pub scope: Option<String>,
    #[serde(rename = "productId")]
    pub product_id: Option<i32>,
    #[serde(rename = "minQuantity")]
    pub min_quantity: Option<i32>,
    #[serde(rename = "pricingMode")]
    pub pricing_mode: Option<String>,
    #[serde(rename = "unitLabel")]
    pub unit_label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct Voucher {
    pub id: i32,
    pub code: String,
    #[sqlx(rename = "customerId")]
    #[serde(rename = "customerId")]
    pub customer_id: Option<i32>,
    #[sqlx(rename = "discountId")]
    #[serde(rename = "discountId")]
    pub discount_id: Option<i32>,
    #[sqlx(rename = "isUsed")]
    #[serde(rename = "isUsed")]
    pub is_used: bool,
    #[sqlx(rename = "usedAt")]
    #[serde(rename = "usedAt")]
    pub used_at: Option<NaiveDateTime>,
    #[sqlx(rename = "expiresAt")]
    #[serde(rename = "expiresAt")]
    pub expires_at: NaiveDateTime,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVoucherRequest {
    pub code: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<i32>,
    #[serde(rename = "discountId")]
    pub discount_id: Option<i32>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<String>,
}

// --- Cash Sessions ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CashSession {
    pub id: i32,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: i32,
    #[sqlx(rename = "openingBalance")]
    #[serde(rename = "openingBalance")]
    pub opening_balance: Decimal,
    #[sqlx(rename = "closingBalance")]
    #[serde(rename = "closingBalance")]
    pub closing_balance: Option<Decimal>,
    #[sqlx(rename = "expectedBalance")]
    #[serde(rename = "expectedBalance")]
    pub expected_balance: Option<Decimal>,
    pub difference: Option<Decimal>,
    pub status: String,
    pub notes: Option<String>,
    #[sqlx(rename = "openedAt")]
    #[serde(rename = "openedAt")]
    pub opened_at: NaiveDateTime,
    #[sqlx(rename = "closedAt")]
    #[serde(rename = "closedAt")]
    pub closed_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct CashMovement {
    pub id: i32,
    #[sqlx(rename = "sessionId")]
    #[serde(rename = "sessionId")]
    pub session_id: i32,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub movement_type: String,
    pub amount: Decimal,
    pub reason: String,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OpenSessionRequest {
    #[serde(rename = "openingBalance")]
    pub opening_balance: Decimal,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CloseSessionRequest {
    #[serde(rename = "closingBalance")]
    pub closing_balance: Decimal,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddMovementRequest {
    #[serde(rename = "type")]
    pub movement_type: String,
    pub amount: Decimal,
    pub reason: String,
}

// --- Stock Movements ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct StockMovement {
    pub id: i32,
    #[sqlx(rename = "productId")]
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: i32,
    pub reason: Option<String>,
    pub reference: Option<String>,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateStockMovementRequest {
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[serde(rename = "type")]
    pub movement_type: String,
    pub quantity: i32,
    pub reason: Option<String>,
    pub reference: Option<String>,
}

// --- Audit Logs ---
#[derive(Debug, Serialize, Deserialize, FromRow, Clone)]
pub struct AuditLog {
    pub id: i32,
    #[sqlx(rename = "userId")]
    #[serde(rename = "userId")]
    pub user_id: Option<i32>,
    pub action: String,
    pub entity: String,
    #[sqlx(rename = "entityId")]
    #[serde(rename = "entityId")]
    pub entity_id: Option<i32>,
    pub details: Option<String>,
    pub ip: Option<String>,
    #[sqlx(rename = "createdAt")]
    #[serde(rename = "createdAt")]
    pub created_at: NaiveDateTime,
}

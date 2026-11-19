use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{CreateCustomerRequest, Customer, UpdateCustomerRequest},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use sqlx::Row;

pub async fn get_customers(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT c.id, c.name, c.email, c.address, c.phone, c."loyaltyPoints",
               c."membershipTier"::text as "membershipTier", c."totalSpent",
               c."createdAt", c."updatedAt",
               COUNT(s.id) as sales_count
        FROM customers c
        LEFT JOIN sales s ON c.id = s."customerId"
        GROUP BY c.id
        ORDER BY c.name ASC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut list = Vec::new();
    for r in rows {
        list.push(json!({
            "id": r.get::<i32, _>("id"),
            "name": r.get::<String, _>("name"),
            "email": r.get::<Option<String>, _>("email"),
            "address": r.get::<Option<String>, _>("address"),
            "phone": r.get::<Option<String>, _>("phone"),
            "loyaltyPoints": r.get::<i32, _>("loyaltyPoints"),
            "membershipTier": r.get::<String, _>("membershipTier"),
            "totalSpent": r.get::<rust_decimal::Decimal, _>("totalSpent"),
            "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
            "updatedAt": r.get::<chrono::NaiveDateTime, _>("updatedAt"),
            "_count": {
                "sales": r.get::<i64, _>("sales_count")
            }
        }));
    }

    Ok(Json(json!(list)))
}

pub async fn get_customer(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Customer>, AppError> {
    let customer = sqlx::query_as::<_, Customer>(
        r#"
        SELECT id, name, email, address, phone, "loyaltyPoints", "membershipTier"::text as "membershipTier", "totalSpent", "createdAt", "updatedAt"
        FROM customers
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Customer not found".to_string()))?;

    Ok(Json(customer))
}

pub async fn create_customer(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Json(payload): Json<CreateCustomerRequest>,
) -> Result<Json<Customer>, AppError> {
    let customer = sqlx::query_as::<_, Customer>(
        r#"
        INSERT INTO customers (name, email, phone, address, "loyaltyPoints", "membershipTier", "totalSpent", "updatedAt")
        VALUES ($1, $2, $3, $4, 0, 'BRONZE'::"MembershipTier", 0, NOW())
        RETURNING id, name, email, address, phone, "loyaltyPoints", "membershipTier"::text as "membershipTier", "totalSpent", "createdAt", "updatedAt"
        "#,
    )
    .bind(payload.name)
    .bind(payload.email)
    .bind(payload.phone)
    .bind(payload.address)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(customer))
}

pub async fn update_customer(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<UpdateCustomerRequest>,
) -> Result<Json<Customer>, AppError> {
    let customer = sqlx::query_as::<_, Customer>(
        r#"
        UPDATE customers
        SET name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            address = COALESCE($4, address),
            "updatedAt" = NOW()
        WHERE id = $5
        RETURNING id, name, email, address, phone, "loyaltyPoints", "membershipTier"::text as "membershipTier", "totalSpent", "createdAt", "updatedAt"
        "#,
    )
    .bind(payload.name)
    .bind(payload.email)
    .bind(payload.phone)
    .bind(payload.address)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Customer not found".to_string()))?;

    Ok(Json(customer))
}

pub async fn delete_customer(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
) -> Result<Json<Value>, AppError> {
    let rows_affected = sqlx::query!("DELETE FROM customers WHERE id = $1", id)
        .execute(&state.db)
        .await?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound("Customer not found".to_string()));
    }

    Ok(Json(json!({ "message": "Customer deleted successfully" })))
}

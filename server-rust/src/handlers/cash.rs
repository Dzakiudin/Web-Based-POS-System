use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    models::{AddMovementRequest, CashMovement, CashSession, CloseSessionRequest, OpenSessionRequest},
    state::SharedState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde_json::{json, Value};
use sqlx::Row;

pub async fn get_sessions(
    State(state): State<SharedState>,
    _auth: AuthUser,
) -> Result<Json<Vec<Value>>, AppError> {
    let rows = sqlx::query(
        r#"
        SELECT cs.id, cs."userId", cs."openingBalance", cs."closingBalance", cs."expectedBalance",
               cs.difference, cs.status, cs.notes, cs."openedAt", cs."closedAt",
               u.name as user_name
        FROM cash_sessions cs
        LEFT JOIN users u ON cs."userId" = u.id
        ORDER BY cs."openedAt" DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let mut sessions = Vec::new();
    for row in rows {
        let id: i32 = row.get("id");
        let user_id: i32 = row.get("userId");
        let opening_balance: Decimal = row.get("openingBalance");
        let closing_balance: Option<Decimal> = row.get("closingBalance");
        let mut expected_balance: Option<Decimal> = row.get("expectedBalance");
        let difference: Option<Decimal> = row.get("difference");
        let status: String = row.get("status");
        let notes: Option<String> = row.get("notes");
        let opened_at: chrono::NaiveDateTime = row.get("openedAt");
        let closed_at: Option<chrono::NaiveDateTime> = row.get("closedAt");
        let user_name: Option<String> = row.get("user_name");

        // If the session is currently OPEN, calculate the live expected balance
        if status == "OPEN" {
            let cash_sales = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(p.amount - p.change)
                FROM payments p
                JOIN sales s ON p."saleId" = s.id
                WHERE s."cashSessionId" = $1 AND s.status = 'COMPLETED' AND p.method = 'CASH'
                "#,
            )
            .bind(id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            let cash_in = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(amount)
                FROM cash_movements
                WHERE "sessionId" = $1 AND type = 'CASH_IN'
                "#,
            )
            .bind(id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            let cash_out = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(amount)
                FROM cash_movements
                WHERE "sessionId" = $1 AND type = 'CASH_OUT'
                "#,
            )
            .bind(id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            expected_balance = Some(opening_balance + cash_sales + cash_in - cash_out);
        }

        sessions.push(json!({
            "id": id,
            "userId": user_id,
            "openingBalance": opening_balance,
            "closingBalance": closing_balance,
            "expectedBalance": expected_balance,
            "difference": difference,
            "status": status,
            "notes": notes,
            "openedAt": opened_at,
            "closedAt": closed_at,
            "user": user_name.map(|n| json!({ "name": n })),
        }));
    }

    Ok(Json(sessions))
}

pub async fn get_active_session(
    State(state): State<SharedState>,
    auth: AuthUser,
) -> Result<Json<Value>, AppError> {
    let session = sqlx::query_as::<_, CashSession>(
        r#"
        SELECT id, "userId", "openingBalance", "closingBalance", "expectedBalance",
               difference, status, notes, "openedAt", "closedAt"
        FROM cash_sessions
        WHERE status = 'OPEN'
        ORDER BY CASE WHEN "userId" = $1 THEN 0 ELSE 1 END, "openedAt" DESC
        LIMIT 1
        "#,
    )
    .bind(auth.id)
    .fetch_optional(&state.db)
    .await?;

    match session {
        Some(s) => {
            // Fetch cashier/user name
            let user_name = sqlx::query_scalar::<_, Option<String>>(
                r#"SELECT name FROM users WHERE id = $1"#
            )
            .bind(s.user_id)
            .fetch_optional(&state.db)
            .await?
            .flatten()
            .unwrap_or_else(|| "Kasir".to_string());

            // Fetch movements
            let movements = sqlx::query_as::<_, CashMovement>(
                r#"
                SELECT id, "sessionId", type::text as type, amount, reason, "createdAt"
                FROM cash_movements
                WHERE "sessionId" = $1
                ORDER BY "createdAt" DESC
                "#,
            )
            .bind(s.id)
            .fetch_all(&state.db)
            .await?;

            // Calculate cash sales from completed cash payments in this session
            let cash_sales = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(p.amount - p.change)
                FROM payments p
                JOIN sales s ON p."saleId" = s.id
                WHERE s."cashSessionId" = $1 AND s.status = 'COMPLETED' AND p.method = 'CASH'
                "#,
            )
            .bind(s.id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            // Calculate Cash In & Cash Out
            let cash_in = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(amount)
                FROM cash_movements
                WHERE "sessionId" = $1 AND type = 'CASH_IN'
                "#,
            )
            .bind(s.id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            let cash_out = sqlx::query_scalar::<_, Option<Decimal>>(
                r#"
                SELECT SUM(amount)
                FROM cash_movements
                WHERE "sessionId" = $1 AND type = 'CASH_OUT'
                "#,
            )
            .bind(s.id)
            .fetch_one(&state.db)
            .await?
            .unwrap_or(Decimal::ZERO);

            // Real-time dynamic expected balance
            let expected = s.opening_balance + cash_sales + cash_in - cash_out;

            let mut session_val = serde_json::to_value(&s).unwrap_or(json!({}));
            if let Some(obj) = session_val.as_object_mut() {
                obj.insert("expectedBalance".to_string(), json!(expected));
                obj.insert("cashSales".to_string(), json!(cash_sales));
                obj.insert("cashIn".to_string(), json!(cash_in));
                obj.insert("cashOut".to_string(), json!(cash_out));
                obj.insert("user".to_string(), json!({ "name": user_name }));
                obj.insert("movements".to_string(), json!(movements));
                let mut clone_s = obj.clone();
                clone_s.insert("expectedBalance".to_string(), json!(expected));
                obj.insert("session".to_string(), json!(clone_s));
            }
            Ok(Json(session_val))
        }
        None => Ok(Json(json!(null))),
    }
}

pub async fn open_session(
    State(state): State<SharedState>,
    auth: AuthUser,
    Json(payload): Json<OpenSessionRequest>,
) -> Result<Json<CashSession>, AppError> {
    let existing = sqlx::query!(
        r#"
        SELECT id FROM cash_sessions
        WHERE "userId" = $1 AND status = 'OPEN'
        LIMIT 1
        "#,
        auth.id
    )
    .fetch_optional(&state.db)
    .await?;

    if existing.is_some() {
        return Err(AppError::BadRequest(
            "You already have an open cash session. Close it first.".to_string(),
        ));
    }

    let session = sqlx::query_as::<_, CashSession>(
        r#"
        INSERT INTO cash_sessions ("userId", "openingBalance", status, notes, "openedAt")
        VALUES ($1, $2, 'OPEN', $3, NOW())
        RETURNING id, "userId", "openingBalance", "closingBalance", "expectedBalance",
                  difference, status, notes, "openedAt", "closedAt"
        "#,
    )
    .bind(auth.id)
    .bind(payload.opening_balance)
    .bind(payload.notes)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(session))
}

pub async fn close_session(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<CloseSessionRequest>,
) -> Result<Json<CashSession>, AppError> {
    let session = sqlx::query_as::<_, CashSession>(
        r#"
        SELECT id, "userId", "openingBalance", "closingBalance", "expectedBalance",
               difference, status, notes, "openedAt", "closedAt"
        FROM cash_sessions
        WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Session not found".to_string()))?;

    if session.status != "OPEN" {
        return Err(AppError::BadRequest("Session already closed".to_string()));
    }

    // Calculate cash payments in this session
    let cash_sales = sqlx::query_scalar::<_, Option<Decimal>>(
        r#"
        SELECT SUM(p.amount - p.change)
        FROM payments p
        JOIN sales s ON p."saleId" = s.id
        WHERE s."cashSessionId" = $1 AND s.status = 'COMPLETED' AND p.method = 'CASH'
        "#
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(Decimal::ZERO);

    // Calculate movements
    let cash_in = sqlx::query_scalar::<_, Option<Decimal>>(
        r#"
        SELECT SUM(amount)
        FROM cash_movements
        WHERE "sessionId" = $1 AND type = 'CASH_IN'
        "#
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(Decimal::ZERO);

    let cash_out = sqlx::query_scalar::<_, Option<Decimal>>(
        r#"
        SELECT SUM(amount)
        FROM cash_movements
        WHERE "sessionId" = $1 AND type = 'CASH_OUT'
        "#
    )
    .bind(id)
    .fetch_one(&state.db)
    .await?
    .unwrap_or(Decimal::ZERO);

    let expected = session.opening_balance + cash_sales + cash_in - cash_out;
    let diff = payload.closing_balance - expected;

    let updated = sqlx::query_as::<_, CashSession>(
        r#"
        UPDATE cash_sessions
        SET "closingBalance" = $1, "expectedBalance" = $2, difference = $3,
            status = 'CLOSED', notes = $4, "closedAt" = NOW()
        WHERE id = $5
        RETURNING id, "userId", "openingBalance", "closingBalance", "expectedBalance",
                  difference, status, notes, "openedAt", "closedAt"
        "#,
    )
    .bind(payload.closing_balance)
    .bind(expected)
    .bind(diff)
    .bind(payload.notes)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(updated))
}

pub async fn add_movement(
    State(state): State<SharedState>,
    _auth: AuthUser,
    Path(id): Path<i32>,
    Json(payload): Json<AddMovementRequest>,
) -> Result<Json<CashMovement>, AppError> {
    let session = sqlx::query_scalar::<_, String>(
        r#"SELECT status FROM cash_sessions WHERE id = $1"#
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Session not found".to_string()))?;

    if session != "OPEN" {
        return Err(AppError::BadRequest("No open session found".to_string()));
    }

    let movement = sqlx::query_as::<_, CashMovement>(
        r#"
        INSERT INTO cash_movements ("sessionId", type, amount, reason)
        VALUES ($1, $2::"CashMovementType", $3, $4)
        RETURNING id, "sessionId", type::text as type, amount, reason, "createdAt"
        "#,
    )
    .bind(id)
    .bind(payload.movement_type)
    .bind(payload.amount)
    .bind(payload.reason)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(movement))
}

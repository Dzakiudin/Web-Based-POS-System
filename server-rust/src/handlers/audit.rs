use crate::{
    error::AppError,
    middleware::auth::AuthUser,
    state::SharedState,
};
use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::Row;

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub action: Option<String>,
    pub entity: Option<String>,
}

pub async fn get_audit_logs(
    State(state): State<SharedState>,
    auth: AuthUser,
    Query(query): Query<AuditQuery>,
) -> Result<Json<Value>, AppError> {
    auth.require_permission(&["activity_log.view"])?;

    let limit = query.limit.unwrap_or(30);
    let offset = query.offset.unwrap_or(0);

    let rows = sqlx::query(
        r#"
        SELECT a.id, a."userId", a.action, a.entity, a."entityId", a.details, a.ip, a."createdAt",
               CASE WHEN u.id IS NOT NULL THEN json_build_object('id', u.id, 'name', u.name, 'role', COALESCE(r.name, 'CASHIER')) ELSE NULL END as "user"
        FROM audit_logs a
        LEFT JOIN users u ON a."userId" = u.id
        LEFT JOIN roles r ON u."roleId" = r.id
        WHERE ($1::text IS NULL OR a.action = $1)
          AND ($2::text IS NULL OR a.entity = $2)
        ORDER BY a."createdAt" DESC
        LIMIT $3 OFFSET $4
        "#
    )
    .bind(query.action.clone())
    .bind(query.entity.clone())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let total: i64 = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM audit_logs a
        WHERE ($1::text IS NULL OR a.action = $1)
          AND ($2::text IS NULL OR a.entity = $2)
        "#
    )
    .bind(query.action)
    .bind(query.entity)
    .fetch_one(&state.db)
    .await?;

    let mut list = Vec::new();
    for r in rows {
        let entity_id = r.get::<Option<i32>, _>("entityId");
        list.push(json!({
            "id": r.get::<i32, _>("id"),
            "userId": r.get::<Option<i32>, _>("userId"),
            "action": r.get::<String, _>("action"),
            "entity": r.get::<String, _>("entity"),
            "entityId": entity_id.map(|v| v.to_string()),
            "details": r.get::<Option<String>, _>("details"),
            "ipAddress": r.get::<Option<String>, _>("ip"),
            "createdAt": r.get::<chrono::NaiveDateTime, _>("createdAt"),
            "user": r.get::<Option<Value>, _>("user")
        }));
    }

    Ok(Json(json!({
        "logs": list,
        "total": total
    })))
}

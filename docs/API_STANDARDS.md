# 📡 WealthMap — API Standards

All API endpoints must follow these standards for consistency.

## Base URL
```
http://localhost:5000/api/v1
```

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be a positive number"
  }
}
```

### Paginated List
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 45,
    "page": 1,
    "pageSize": 20
  }
}
```

## HTTP Status Codes

| Code | When to use |
|------|-------------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 400 | Validation error, bad request |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 500 | Server error |

## Auth Header
All protected routes require:
```
Authorization: Bearer <jwt_token>
```

## Route Naming

```
GET    /api/v1/expenses          ← list
GET    /api/v1/expenses/:id      ← single
POST   /api/v1/expenses          ← create
PUT    /api/v1/expenses/:id      ← full update
PATCH  /api/v1/expenses/:id      ← partial update
DELETE /api/v1/expenses/:id      ← delete
```

## Engine Endpoints (read-only, computed)
```
GET /api/v1/engine/financial-state     ← current financial snapshot
GET /api/v1/engine/forecast            ← expense predictions
GET /api/v1/engine/risk                ← risk scores
GET /api/v1/engine/safe-to-spend       ← safe daily amount
GET /api/v1/engine/health-score        ← health score breakdown
GET /api/v1/engine/dependency-graph    ← nodes + edges

POST /api/v1/engine/simulate           ← what-if simulation (body: hypothetical expense)
```

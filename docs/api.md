# API Documentation

## Authentication

All protected endpoints require a valid NextAuth session cookie.

### POST /api/auth/[...nextauth]
NextAuth handler for sign-in/sign-out.

## Supplies

### GET /api/supplies
List all supplies. Requires authentication.

### POST /api/supplies
Create supply. Admin only.

### PUT /api/supplies
Update supply. Admin only. Body includes `id`.

### DELETE /api/supplies?id={id}
Delete supply. Admin only. Fails if pending requests exist.

### GET /api/supplies/[id]
Get supply with recent requests.

### PATCH /api/supplies/[id]
Update supply quantity. Admin only.

## Requests

Leftover supply-request API (admin approval queue). Staff create-request is not exposed in the Inbound UI; prefer receive/log-order flows for warehouse inbound work.

### GET /api/requests
List requests. Staff see own unless `ALLOW_ALL_REQUESTS_VISIBLE` is true.

### POST /api/requests
Create request. Body: `{ supplyId, quantity }`. Available via API; not used by the current Inbound UI.

### PUT /api/requests
Update request status. Admin only. Body: `{ id, status: "APPROVED" | "DENIED" }`.

## Users

### GET /api/users
List users. Admin only.

### POST /api/users
Create user. Admin only.

### PUT /api/users
Update user. Admin only.

### DELETE /api/users?id={id}
Delete user. Admin only.

## Settings

### GET /api/admin/settings
List system settings. Admin only.

### PUT /api/admin/settings
Update settings. Admin only.

## Server Actions

The UI primarily uses server actions in `src/lib/actions/` (being migrated to `src/server/services/` in M1).

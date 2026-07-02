# Store Backend — API Contract

Reference for frontend integration. Every endpoint, how to call it, and the exact
JSON it returns.

- **Base URL:** `http://localhost:3000`
- **All routes are prefixed with** `/api`
- **Content type:** `application/json`
- **Interactive docs (Swagger UI):** `http://localhost:3000/docs`

---

## Conventions

### Success envelope

Every successful response (except the health check and rate-limit errors) is wrapped
in a standard envelope:

```json
{
  "success": true,
  "data": { }
}
```

`data` is either a single resource, an array, or a paginated object depending on the
endpoint. Response bodies are **strictly serialized**: any field not listed in this
document is stripped out before it reaches you.

### Error envelope

Errors return a **flat** object with a single `message` field (read it as
`response.data.message`):

```json
{ "message": "Human readable reason" }
```

| Status | Meaning                                            |
| ------ | -------------------------------------------------- |
| 400    | Bad request (invalid domain input)                 |
| 401    | Missing/invalid Bearer token                       |
| 404    | Resource not found                                 |
| 409    | Conflict (duplicate username, email, sku, …)       |
| 422    | Validation failed (missing/invalid body fields)    |
| 429    | Rate limit exceeded (see special shape below)      |
| 500    | Unexpected server error                            |

The **rate-limit** error is the one exception to the flat shape:

```json
{
  "success": false,
  "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests. Retry after 60" }
}
```

### Authentication

Protected endpoints require an HTTP header:

```
Authorization: Bearer <accessToken>
```

Obtain the token pair from `POST /api/auth/login`. Endpoints marked 🔒 below require it.

---

## Endpoint index

| Group    | Method | Path                                   | Auth |
| -------- | ------ | -------------------------------------- | ---- |
| Health   | GET    | `/api/health`                          | —    |
| Auth     | POST   | `/api/auth/login`                      | —    |
| Auth     | POST   | `/api/auth/refresh`                    | —    |
| Auth     | GET    | `/api/auth/me`                         | 🔒   |
| Auth     | POST   | `/api/auth/password-change`            | 🔒   |
| Users    | POST   | `/api/users`                           | —    |
| Users    | PATCH  | `/api/users/:id`                       | 🔒   |
| Products | GET    | `/api/products`                        | —    |
| Products | POST   | `/api/products`                        | —    |
| Products | GET    | `/api/products/search`                 | —    |
| Products | GET    | `/api/products/categories`             | —    |
| Products | GET    | `/api/products/category-list`          | —    |
| Products | GET    | `/api/products/category/:category`     | —    |
| Products | GET    | `/api/products/sku/:sku`               | —    |
| Products | GET    | `/api/products/:id`                    | —    |
| Products | PUT    | `/api/products/:id`                    | —    |
| Products | PATCH  | `/api/products/:id`                    | —    |
| Products | DELETE | `/api/products/:id`                    | —    |
| Reviews  | GET    | `/api/products/:id/reviews`            | —    |
| Reviews  | GET    | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | POST   | `/api/products/:id/reviews`            | —    |
| Reviews  | PUT    | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | PATCH  | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | DELETE | `/api/products/:id/reviews/:reviewId`  | —    |
| Carts    | GET    | `/api/carts/:id`                       | —    |
| Carts    | PUT    | `/api/carts/:id`                       | —    |
| Carts    | DELETE | `/api/carts/:id`                       | —    |
| Orders   | GET    | `/api/orders`                          | —    |
| Orders   | GET    | `/api/orders/:id`                      | —    |
| Orders   | POST   | `/api/orders`                          | —    |

---

## Health

### GET `/api/health`

Liveness probe. **Not** wrapped in the success envelope.

```bash
curl http://localhost:3000/api/health
```

**200**

```json
{
  "status": "ok",
  "timestamp": "2026-07-01T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

---

## Auth

### POST `/api/auth/login`

Log in with username and password. Returns the full public user plus a token pair.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "walterp", "password": "secret123" }'
```

**Request body**

| Field    | Type   | Required |
| -------- | ------ | -------- |
| username | string | yes      |
| password | string | yes      |

**200**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "firstName": "Walter",
    "lastName": "Palladino",
    "username": "walterp",
    "email": "walter@example.com",
    "phone": "+1-555-0100",
    "role": "customer",
    "address": { "city": "Austin", "state": "TX" },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

**401** — invalid credentials → `{ "message": "Invalid credentials" }`

---

### POST `/api/auth/refresh`

Exchange a refresh token for a new token pair.

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJhbGciOi..." }'
```

**Request body**

| Field        | Type   | Required |
| ------------ | ------ | -------- |
| refreshToken | string | yes      |

**200**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### GET `/api/auth/me` 🔒

Get the currently authenticated user.

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

**200**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "firstName": "Walter",
    "lastName": "Palladino",
    "username": "walterp",
    "email": "walter@example.com",
    "phone": "+1-555-0100",
    "role": "customer",
    "address": { "city": "Austin", "state": "TX" }
  }
}
```

**401** → `{ "message": "Unauthorized" }`

---

### POST `/api/auth/password-change` 🔒

Change the authenticated user's password.

```bash
curl -X POST http://localhost:3000/api/auth/password-change \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "currentPassword": "secret123", "newPassword": "newSecret456" }'
```

**Request body**

| Field           | Type   | Required |
| --------------- | ------ | -------- |
| currentPassword | string | yes      |
| newPassword     | string | yes      |

**200**

```json
{
  "success": true,
  "data": { "message": "Password updated" }
}
```

---

## Users

### POST `/api/users`

Register a new user. Returns a reduced view (no token is issued here — log in
afterwards).

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Walter",
    "lastName": "Palladino",
    "username": "walterp",
    "email": "walter@example.com",
    "password": "secret123"
  }'
```

**Request body**

| Field     | Type   | Required |
| --------- | ------ | -------- |
| firstName | string | yes      |
| lastName  | string | yes      |
| username  | string | yes      |
| email     | string | yes      |
| password  | string | yes      |

**201**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "firstName": "Walter",
    "lastName": "Palladino",
    "username": "walterp",
    "email": "walter@example.com"
  }
}
```

**409** — username or email already taken → `{ "message": "..." }`
**422** — missing required fields → `{ "message": "..." }`

---

### PATCH `/api/users/:id` 🔒

Partial update of a user. Send only the fields you want to change.

```bash
curl -X PATCH http://localhost:3000/api/users/10 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "phone": "+1-555-0199", "address": { "city": "Dallas", "state": "TX" } }'
```

**Writable fields:** `firstName`, `lastName`, `username`, `email`, `phone`, `role`, `address`

**200**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "firstName": "Walter",
    "lastName": "Palladino",
    "username": "walterp",
    "email": "walter@example.com",
    "phone": "+1-555-0199",
    "role": "customer",
    "address": { "city": "Dallas", "state": "TX" }
  }
}
```

**404** — user not found
**409** — email belongs to another user

---

## Products

The **product object** returned by most endpoints:

```json
{
  "id": 1,
  "title": "BMW Pencil",
  "description": "A premium writing instrument",
  "category": "stationery",
  "price": 4.99,
  "discountPercentage": 0,
  "rating": 4.5,
  "stock": 100,
  "minimumQuantity": 10,
  "tags": ["office", "writing"],
  "brand": "BMW",
  "sku": "BMW-PNC-001",
  "weight": 0.1,
  "width": 1,
  "height": 15,
  "depth": 1,
  "warrantyInformation": "1 year",
  "shippingInformation": "Ships in 1-2 days",
  "availabilityStatus": "In Stock",
  "returnPolicy": "30 days",
  "minimumOrderQuantity": 1,
  "barcode": "0123456789",
  "qrCode": "https://example.com/qr.png",
  "thumbnail": "https://example.com/thumb.png",
  "images": ["https://example.com/1.png"],
  "isDeleted": false,
  "deletedOn": null
}
```

> `availabilityStatus` is computed from stock. The `GET /sku/:sku` variant omits
> `id`, `isDeleted`, and `deletedOn`.

### GET `/api/products`

List products (paginated).

**Query params:** `limit`, `skip`, `sortBy`, `order`, `q`, `search`

```bash
curl "http://localhost:3000/api/products?limit=10&skip=0"
```

**200**

```json
{
  "success": true,
  "data": {
    "products": [ { "id": 1, "title": "BMW Pencil" } ],
    "total": 194,
    "skip": 0,
    "limit": 10
  }
}
```

---

### POST `/api/products`

Create a product.

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "BMW Pencil",
    "price": 4.99,
    "category": "stationery",
    "description": "A premium writing instrument",
    "stock": 100,
    "brand": "BMW",
    "sku": "BMW-PNC-001",
    "tags": ["office", "writing"],
    "minimumQuantity": 10,
    "minimumOrderQuantity": 1
  }'
```

**Required:** `title`, `price`, `category`. All other writable product fields are optional.

**201** → success envelope wrapping the full product object.

**409** — duplicate SKU → `{ "message": "..." }`
**422** — missing required fields

---

### GET `/api/products/search`

Search products. Same query params and paginated response as `GET /api/products`.

```bash
curl "http://localhost:3000/api/products/search?q=pencil"
```

---

### GET `/api/products/categories`

```bash
curl http://localhost:3000/api/products/categories
```

**200**

```json
{
  "success": true,
  "data": [
    { "slug": "stationery", "name": "Stationery", "url": "/api/products/category/stationery" }
  ]
}
```

---

### GET `/api/products/category-list`

```bash
curl http://localhost:3000/api/products/category-list
```

**200**

```json
{ "success": true, "data": ["stationery", "electronics", "groceries"] }
```

---

### GET `/api/products/category/:category`

List products in a category (paginated, same shape as `GET /api/products`).

```bash
curl "http://localhost:3000/api/products/category/stationery?limit=10"
```

---

### GET `/api/products/sku/:sku`

Get a product by SKU. Reduced object (no `id`, `isDeleted`, `deletedOn`).

```bash
curl http://localhost:3000/api/products/sku/BMW-PNC-001
```

**200** → success envelope wrapping the SKU product object.
**404** — not found

---

### GET `/api/products/:id`

```bash
curl http://localhost:3000/api/products/1
```

**200** → success envelope wrapping the full product object.
**404** — not found

---

### PUT / PATCH `/api/products/:id`

Update a product. `PUT` and `PATCH` behave identically (partial update — send only
the fields to change).

```bash
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Content-Type: application/json" \
  -d '{ "price": 5.49, "stock": 80 }'
```

**200** → success envelope wrapping the updated product object.
**404** — not found

---

### DELETE `/api/products/:id`

Soft-delete a product. Returns the deleted product (`isDeleted: true`).

```bash
curl -X DELETE http://localhost:3000/api/products/1
```

**200**

```json
{
  "success": true,
  "data": { "id": 1, "title": "BMW Pencil", "isDeleted": true, "deletedOn": "2026-07-01T12:00:00.000Z" }
}
```

---

## Reviews

Reviews are nested under a product. The **review object**:

```json
{
  "id": 5,
  "productId": 1,
  "rating": 5,
  "comment": "Great pencil",
  "reviewerName": "Jane Doe",
  "reviewerEmail": "jane@example.com",
  "date": "2026-07-01T12:00:00.000Z"
}
```

### GET `/api/products/:id/reviews`

List all reviews for a product.

```bash
curl http://localhost:3000/api/products/1/reviews
```

**200**

```json
{
  "success": true,
  "data": { "reviews": [ { "id": 5, "productId": 1, "rating": 5 } ] }
}
```

---

### GET `/api/products/:id/reviews/:reviewId`

```bash
curl http://localhost:3000/api/products/1/reviews/5
```

**200** → success envelope wrapping a single review object.
**404** — not found

---

### POST `/api/products/:id/reviews`

Add a review to a product.

```bash
curl -X POST http://localhost:3000/api/products/1/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Great pencil",
    "reviewerName": "Jane Doe",
    "reviewerEmail": "jane@example.com"
  }'
```

**Request body**

| Field         | Type    | Required | Notes         |
| ------------- | ------- | -------- | ------------- |
| rating        | integer | yes      | 1–5           |
| comment       | string  | no       |               |
| reviewerName  | string  | no       |               |
| reviewerEmail | string  | no       |               |

**201** → success envelope wrapping the created review object.

---

### PUT / PATCH `/api/products/:id/reviews/:reviewId`

Partial update of a review (both verbs behave identically).

```bash
curl -X PATCH http://localhost:3000/api/products/1/reviews/5 \
  -H "Content-Type: application/json" \
  -d '{ "rating": 4, "comment": "Still good" }'
```

**200** → success envelope wrapping the updated review object.

---

### DELETE `/api/products/:id/reviews/:reviewId`

```bash
curl -X DELETE http://localhost:3000/api/products/1/reviews/5
```

**200** → success envelope wrapping the deleted review object.

---

## Carts

A cart is identified by its **user id**. The **cart object**:

```json
{
  "id": 1,
  "userId": 10,
  "products": [
    {
      "id": 1,
      "title": "BMW Pencil",
      "price": 4.99,
      "discountPercentage": 0,
      "thumbnail": "https://example.com/thumb.png",
      "sku": "BMW-PNC-001",
      "quantity": 3,
      "total": 14.97,
      "discountedTotal": 14.97
    }
  ],
  "total": 14.97,
  "discountedTotal": 14.97,
  "totalProducts": 1,
  "totalQuantity": 3
}
```

### GET `/api/carts/:id`

Get a user's cart with computed totals.

```bash
curl http://localhost:3000/api/carts/10
```

**200** → success envelope wrapping the cart object.

---

### PUT `/api/carts/:id`

Replace all items in the cart. Each item needs a product reference
(`id` or `productId`) and a positive `quantity`.

```bash
curl -X PUT http://localhost:3000/api/carts/10 \
  -H "Content-Type: application/json" \
  -d '{ "products": [ { "productId": 1, "quantity": 3 } ] }'
```

**200** → success envelope wrapping the recomputed cart object.
**400** — invalid items (non-positive quantity, missing product reference)

---

### DELETE `/api/carts/:id`

Clear the cart. Returns the emptied cart.

```bash
curl -X DELETE http://localhost:3000/api/carts/10
```

**200**

```json
{
  "success": true,
  "data": { "id": 1, "userId": 10, "products": [], "total": 0, "discountedTotal": 0, "totalProducts": 0, "totalQuantity": 0 }
}
```

---

## Orders

The **order object**:

```json
{
  "id": 1,
  "userId": 10,
  "products": [ { "productId": 1, "quantity": 3, "price": 4.99 } ],
  "total": 14.97,
  "discountedTotal": 14.97,
  "totalProducts": 1,
  "totalQuantity": 3,
  "status": "pending",
  "address": { "city": "Austin", "state": "TX" },
  "payment": { "method": "card", "status": "authorized" }
}
```

### GET `/api/orders`

List all orders.

```bash
curl http://localhost:3000/api/orders
```

**200**

```json
{
  "success": true,
  "data": { "orders": [ { "id": 1, "userId": 10, "status": "pending" } ] }
}
```

---

### GET `/api/orders/:id`

```bash
curl http://localhost:3000/api/orders/1
```

**200** → success envelope wrapping a single order object.
**404** — not found

---

### POST `/api/orders`

Create an order. All fields are optional at the schema level; the service applies
domain rules.

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 10,
    "products": [ { "productId": 1, "quantity": 3, "price": 4.99 } ],
    "total": 14.97,
    "discountedTotal": 14.97,
    "totalProducts": 1,
    "totalQuantity": 3,
    "status": "pending",
    "address": { "city": "Austin", "state": "TX" },
    "payment": { "method": "card" }
  }'
```

**200** → success envelope wrapping the created order object.

---

## Notes for frontend integration

- Read errors as `response.data.message` (flat), success payloads as `response.data.data`.
- Store `accessToken` and `refreshToken` from login; send `Authorization: Bearer <accessToken>`
  on 🔒 endpoints; call `POST /api/auth/refresh` when the access token expires.
- Carts are keyed by **user id**, not a separate cart id — use the logged-in user's id.
- CORS allows `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Rate limiting is active; on
  **429** back off using the `error.message` retry hint.

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
| 403    | Authenticated but lacking the required role (ADMIN)|
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

### Money & amounts

All monetary values are **integers in the smallest currency unit (cents)** — never
decimal dollars. A `price` of `499` means `$4.99`; `unitPrice`, `discountPrice`,
`totalItemPrices`, `totalItemDiscounts`, `total`, `discountedTotal` and Stripe's
`amountTotal` are all integer cents. Requests must send these fields as integers;
a fractional value (e.g. `4.99`) is rejected as a validation error.

`discountPercentage` is a **whole-number integer percent** (e.g. `15` = 15%). A
discount amount is derived as `floor(price * discountPercentage / 100)` — the
integer part only — so it never grants a fractional cent.

### Authentication

Protected endpoints require an HTTP header:

```
Authorization: Bearer <accessToken>
```

Obtain the token pair from `POST /api/auth/login`. Endpoints marked 🔒 below require it.

Endpoints marked **🔒 ADMIN** additionally require the authenticated user to have the
`ADMIN` role. A valid token belonging to a non-admin user returns **403**; a missing or
invalid token returns **401**.

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
| Wishlists| GET    | `/api/users/:id/wishlist`              | 🔒   |
| Wishlists| POST   | `/api/users/:id/wishlist`              | 🔒   |
| Wishlists| PUT    | `/api/users/:id/wishlist`              | 🔒   |
| Wishlists| PATCH  | `/api/users/:id/wishlist`              | 🔒   |
| Wishlists| DELETE | `/api/users/:id/wishlist`              | 🔒   |
| Products | GET    | `/api/products`                        | —    |
| Products | POST   | `/api/products`                        | 🔒 ADMIN |
| Products | GET    | `/api/products/search`                 | —    |
| Products | GET    | `/api/products/categories`             | —    |
| Products | GET    | `/api/products/category-list`          | —    |
| Products | POST   | `/api/products/categories`             | 🔒 ADMIN |
| Products | PUT    | `/api/products/categories/:slug`       | 🔒 ADMIN |
| Products | PATCH  | `/api/products/categories/:slug`       | 🔒 ADMIN |
| Products | DELETE | `/api/products/categories/:slug`       | 🔒 ADMIN |
| Products | GET    | `/api/products/category/:category`     | —    |
| Products | GET    | `/api/products/sku/:sku`               | —    |
| Products | POST   | `/api/products/sku/generate`           | —    |
| Products | GET    | `/api/products/:id`                    | —    |
| Products | PUT    | `/api/products/:id`                    | 🔒 ADMIN |
| Products | PATCH  | `/api/products/:id`                    | 🔒 ADMIN |
| Products | DELETE | `/api/products/:id`                    | 🔒 ADMIN |
| Reviews  | GET    | `/api/products/:id/reviews`            | —    |
| Reviews  | GET    | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | POST   | `/api/products/:id/reviews`            | —    |
| Reviews  | PUT    | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | PATCH  | `/api/products/:id/reviews/:reviewId`  | —    |
| Reviews  | DELETE | `/api/products/:id/reviews/:reviewId`  | —    |
| Images   | GET    | `/api/products/:id/images`             | —    |
| Images   | GET    | `/api/products/:id/images/:imageId`    | —    |
| Images   | POST   | `/api/products/:id/images`             | 🔒 ADMIN |
| Images   | DELETE | `/api/products/:id/images/:imageId`    | 🔒 ADMIN |
| Carts    | GET    | `/api/users/:id/cart`                  | 🔒   |
| Carts    | POST   | `/api/users/:id/cart`                  | 🔒   |
| Carts    | PUT    | `/api/users/:id/cart`                  | 🔒   |
| Carts    | PATCH  | `/api/users/:id/cart`                  | 🔒   |
| Carts    | DELETE | `/api/users/:id/cart`                  | 🔒   |
| Orders   | GET    | `/api/orders`                          | 🔒   |
| Orders   | GET    | `/api/orders/search`                   | 🔒   |
| Orders   | GET    | `/api/orders/status`                   | 🔒 ADMIN |
| Orders   | GET    | `/api/orders/:id`                      | 🔒   |
| Orders   | POST   | `/api/orders/:id/status`               | 🔒 ADMIN |
| Checkout | POST   | `/api/checkout`                        | 🔒   |
| Checkout | POST   | `/api/checkout/webhook`                | —    |
| Refunds  | POST   | `/api/refund`                          | 🔒 ADMIN |
| Refunds  | POST   | `/api/refund/webhook`                  | —    |

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
  "price": 499,
  "discountPercentage": 0,
  "rating": 4.5,
  "stock": 100,
  "minimumQuantity": 10,
  "tags": ["office", "writing"],
  "brand": "BMW",
  "sku": "BMW-PNC-001",
  "color": "Black",
  "size": "M",
  "attr1": "",
  "attr2": "",
  "attr3": "",
  "attr4": "",
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
  "thumbnail": "https://cdn.example.com/products/BMW-PNC-001/<uuid>.webp",
  "primaryImage": "https://cdn.example.com/products/BMW-PNC-001/<uuid>.webp",
  "images": ["https://cdn.example.com/products/BMW-PNC-001/<uuid>.webp"],
  "isDeleted": false,
  "deletedOn": null
}
```

> `availabilityStatus` is computed from stock. The `GET /sku/:sku` variant omits
> `id`, `isDeleted`, and `deletedOn`. `color`, `size` and `attr1`–`attr4` are
> free-form string attributes (default `""`).
>
> `thumbnail`, `primaryImage`, and `images` are **read-only, derived** fields —
> they are built at read time from the product's rows in the `product_images`
> table (see the [Images](#images) endpoints), not stored on the product:
> `thumbnail` is the `THUMBNAIL`-typed image's URL, `primaryImage` the `PRIMARY`
> one, and `images` the remaining (`OTHER`) image URLs. Each is `""` / `[]` when
> the product has no image of that type. They are **not** accepted in create /
> update bodies — manage images through the image upload endpoints.

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

### POST `/api/products` 🔒 ADMIN

Create a product. Requires an authenticated ADMIN.

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "BMW Pencil",
    "price": 499,
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
The image fields (`thumbnail`, `primaryImage`, `images`) are **not** writable here — images
are managed through the [image endpoints](#images).

**201** → success envelope wrapping the full product object.

**401** — missing/invalid token
**403** — authenticated but not an ADMIN
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

### POST `/api/products/categories` 🔒 ADMIN

Create a category. Requires an authenticated ADMIN.

```bash
curl -X POST http://localhost:3000/api/products/categories \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "slug": "home-decoration", "name": "Home Decoration" }'
```

**Required:** `slug`. `name` is optional — when omitted it is derived from the slug
(`home-decoration` → `Home Decoration`). The slug is normalized to lowercase/trimmed.

**201**

```json
{ "success": true, "data": { "slug": "home-decoration", "name": "Home Decoration" } }
```

**401** — missing/invalid token
**403** — authenticated but not an ADMIN
**409** — a category with that slug already exists
**422** — `slug` missing

---

### PUT / PATCH `/api/products/categories/:slug` 🔒 ADMIN

Update a category. `PUT` and `PATCH` behave identically (partial update). May change the
`name` and/or rename the `slug`. Requires an authenticated ADMIN.

```bash
curl -X PATCH http://localhost:3000/api/products/categories/home-decoration \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Home & Decoration" }'
```

**200**

```json
{ "success": true, "data": { "slug": "home-decoration", "name": "Home & Decoration" } }
```

**401** — missing/invalid token
**403** — authenticated but not an ADMIN
**404** — category not found
**409** — renaming to a slug that already exists

---

### DELETE `/api/products/categories/:slug` 🔒 ADMIN

Delete a category. Requires an authenticated ADMIN. A category still referenced by one or
more products cannot be deleted.

```bash
curl -X DELETE http://localhost:3000/api/products/categories/home-decoration \
  -H "Authorization: Bearer <accessToken>"
```

**200**

```json
{ "success": true, "data": { "slug": "home-decoration", "name": "Home Decoration" } }
```

**401** — missing/invalid token
**403** — authenticated but not an ADMIN
**404** — category not found
**409** — the category is still in use by one or more products

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

### POST `/api/products/sku/generate`

Generate a SKU code from product attributes. The code is the first three
characters of each supplied attribute, uppercased and joined with `-`, in this
order: `category`, `brand`, `size`, `color`, `attr1`, `attr2`, `attr3`, `attr4`.
Attributes that are empty or blank are skipped. All fields are optional strings.

```bash
curl -X POST http://localhost:3000/api/products/sku/generate \
  -H "Content-Type: application/json" \
  -d '{ "category": "electronics", "brand": "Sony", "color": "Black", "attr2": "waterproof" }'
```

**200**

```json
{ "success": true, "data": { "sku": "ELE-SON-BLA-WAT" } }
```

---

### GET `/api/products/:id`

```bash
curl http://localhost:3000/api/products/1
```

**200** → success envelope wrapping the full product object.
**404** — not found

---

### PUT / PATCH `/api/products/:id` 🔒 ADMIN

Update a product. `PUT` and `PATCH` behave identically (partial update — send only
the fields to change). Requires an authenticated ADMIN.

```bash
curl -X PATCH http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "price": 549, "stock": 80 }'
```

**200** → success envelope wrapping the updated product object.
**401** — missing/invalid token
**403** — authenticated but not an ADMIN
**404** — not found

---

### DELETE `/api/products/:id` 🔒 ADMIN

Soft-delete a product. Returns the deleted product (`isDeleted: true`). Requires an
authenticated ADMIN.

```bash
curl -X DELETE http://localhost:3000/api/products/1 \
  -H "Authorization: Bearer <accessToken>"
```

**200**

```json
{
  "success": true,
  "data": { "id": 1, "title": "BMW Pencil", "isDeleted": true, "deletedOn": "2026-07-01T12:00:00.000Z" }
}
```

**401** — missing/invalid token
**403** — authenticated but not an ADMIN
**404** — not found

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

## Images

Images are nested under a product. The binary files are **not** stored in the
database — they live in the configured storage backend (`IMAGE_STORAGE_PROVIDER`,
default `local` file system) under `products/<sku>/<uuid>.webp`. On upload
the file is validated, auto-rotated, downscaled, and **re-encoded to WebP**.

The **image object** (the response never exposes the internal `storageKey`; use
`url` instead):

```json
{
  "id": 10,
  "productId": 1,
  "url": "https://api.example.com/media/products/BEA-ESS-ESS-001/018f9a2c-7b3e-7c21-9e2a-3f1b6d4e5a90.webp",
  "originalFilename": "photo.png",
  "mimeType": "image/webp",
  "sizeBytes": 20480,
  "width": 1200,
  "height": 800,
  "altText": "Front view",
  "sortOrder": 0,
  "imageType": "PRIMARY",
  "createdAt": "2026-07-21T12:00:00.000Z"
}
```

- The database stores only the image UUID; the `url` is rederived at read time
  as `${IMAGE_PUBLIC_BASE_URL}/products/<sku>/<uuid>.<ext>` (the extension comes
  from the stored file — always `.webp`).
- `imageType` is one of `THUMBNAIL`, `PRIMARY`, `OTHER`. A product has **at most
  one** `PRIMARY` and **at most one** `THUMBNAIL` — uploading a new image of that
  type demotes the previous one to `OTHER`.
- The first image uploaded for a product defaults to `PRIMARY`; subsequent images
  default to `OTHER`. Deleting the `PRIMARY` promotes the next remaining image.

### GET `/api/products/:id/images`

List all images for a product (primary first, then by `sortOrder`).

```bash
curl http://localhost:3000/api/products/1/images
```

**200**

```json
{
  "success": true,
  "data": { "images": [ { "id": 10, "productId": 1, "imageType": "PRIMARY" } ] }
}
```

**404** — product not found

---

### GET `/api/products/:id/images/:imageId`

Fetch a single image's metadata.

```bash
curl http://localhost:3000/api/products/1/images/10
```

**200** → success envelope wrapping a single image object.
**404** — image not found for that product

---

### POST `/api/products/:id/images` 🔒 ADMIN

Upload an image. Body is **`multipart/form-data`** (not JSON).

```bash
curl -X POST http://localhost:3000/api/products/1/images \
  -H "Authorization: Bearer <admin-token>" \
  -F "image=@./photo.png" \
  -F "altText=Front view" \
  -F "imageType=PRIMARY"
```

**Multipart parts**

| Part      | Type   | Required | Notes                                                                          |
| --------- | ------ | -------- | ------------------------------------------------------------------------------ |
| image     | file   | yes      | The image file. Accepted: JPEG, PNG, WebP, GIF, AVIF.                          |
| altText   | text   | no       | Alternative text.                                                              |
| sortOrder | text   | no       | Integer; defaults to the next position after existing images.                  |
| imageType | text   | no       | `THUMBNAIL` / `PRIMARY` / `OTHER` (case-insensitive). Defaults to `PRIMARY` for the first image, else `OTHER`. A new `PRIMARY`/`THUMBNAIL` demotes the previous one. |

The uploaded file is optimized and stored as WebP, so the response `mimeType` is
always `image/webp` regardless of the source type. The field name for the file
part may be anything — the first file part in the request is used.

**201** → success envelope wrapping the created image object.
**401** — missing/invalid token · **403** — not an admin
**413** — file exceeds `IMAGE_MAX_SIZE_BYTES`
**415** — request was not `multipart/form-data`
**422** — no file part, unsupported image type, or invalid `imageType` value

---

### DELETE `/api/products/:id/images/:imageId` 🔒 ADMIN

Delete an image (removes both the metadata row and the stored file).

```bash
curl -X DELETE http://localhost:3000/api/products/1/images/10 \
  -H "Authorization: Bearer <admin-token>"
```

**200** → success envelope wrapping the deleted image object.
**401** — missing/invalid token · **403** — not an admin
**404** — image not found for that product

---

## Carts 🔒

A cart is a **singleton nested under a user**: `/api/users/:id/cart`. Each user
has **at most one** cart. Every route requires a Bearer token, and the `:id` in
the path **must be the authenticated user's own id** — accessing another user's
id returns `403`.

The link to the user is by **username** (not a database foreign key). Cart items
are a **denormalised snapshot** of the product — `sku`, `description`,
`unitPrice`, `discountPrice` (the discounted unit price) and `qty` are all stored
on the item, so the cart never joins back to products. The API only operates on
the whole cart — send the full parent/child structure; there are no item-level
endpoints.

Cart-level totals are stored on the cart and recomputed on every write:

- `totalItemPrices` = Σ `unitPrice` × `qty`
- `totalItemDiscounts` = Σ (`unitPrice` − `discountPrice`) × `qty`

The **cart object**:

```json
{
  "id": 7,
  "username": "walterp",
  "items": [
    {
      "id": 1,
      "sku": "BMW-PNC-001",
      "description": "BMW Pencil",
      "unitPrice": 1000,
      "discountPrice": 800,
      "qty": 3
    }
  ],
  "totalItemPrices": 3000,
  "totalItemDiscounts": 600,
  "createdAt": "2026-07-02T10:00:00.000Z",
  "updatedAt": "2026-07-02T10:00:00.000Z"
}
```

Each item requires `sku`, `description`, `unitPrice`, `discountPrice` and `qty`
(all positive integers; prices are integer cents — see **Money & amounts**).
`discountPrice` must be between `0` and `unitPrice`, and SKUs must be unique
within the cart.

### GET `/api/users/:id/cart` 🔒

Get the user's cart with its items and stored totals.

```bash
curl http://localhost:3000/api/users/10/cart \
  -H "Authorization: Bearer <token>"
```

**200** → success envelope wrapping the cart object.
**401** — missing/invalid token · **403** — `:id` is not your own user id · **404** — no cart yet

---

### POST `/api/users/:id/cart` 🔒

Create the user's cart with its items.

```bash
curl -X POST http://localhost:3000/api/users/10/cart \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "items": [ { "sku": "BMW-PNC-001", "description": "BMW Pencil", "unitPrice": 1000, "discountPrice": 800, "qty": 3 } ] }'
```

**201** → success envelope wrapping the created cart object.
**409** — a cart already exists (use PUT to replace it)
**422** — missing/invalid item field, duplicate sku, or `discountPrice` > `unitPrice`

---

### PUT / PATCH `/api/users/:id/cart` 🔒

Replace the user's cart. The body carries the **full** item set — the items and
totals are overwritten.

```bash
curl -X PUT http://localhost:3000/api/users/10/cart \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "items": [ { "sku": "BMW-PNC-001", "description": "BMW Pencil", "unitPrice": 1000, "discountPrice": 800, "qty": 1 } ] }'
```

**200** → success envelope wrapping the updated cart object.
**404** — no cart to replace · **422** — invalid body

---

### DELETE `/api/users/:id/cart` 🔒

Delete the user's cart and its items. Returns the deleted cart.

```bash
curl -X DELETE http://localhost:3000/api/users/10/cart \
  -H "Authorization: Bearer <token>"
```

**200** → success envelope wrapping the deleted cart object.
**404** — no cart to delete

---

## Wishlists 🔒

A wishlist is a **singleton nested under a user**: `/api/users/:id/wishlist`.
Each user has **at most one** wishlist. Every route requires a Bearer token, and
the `:id` in the path **must be the authenticated user's own id** — accessing
another user's id returns `403`.

The link to the user is by **username** and the link to products is by **sku**
(not database foreign keys). The API only operates on the whole wishlist — send
the full parent/child structure; there are no item-level endpoints.

The **wishlist object**:

```json
{
  "id": 5,
  "name": "Birthday ideas",
  "username": "walterp",
  "items": [
    { "id": 1, "sku": "RCH45Q1A" },
    { "id": 2, "sku": "BMW-PNC-001" }
  ],
  "createdAt": "2026-07-02T10:00:00.000Z",
  "updatedAt": "2026-07-02T10:00:00.000Z"
}
```

In request bodies, `items` may be a list of bare SKU strings **or** `{ "sku" }`
objects — they are normalised and de-duplicated. `name` is required.

### GET `/api/users/:id/wishlist` 🔒

Get the user's wishlist with its items.

```bash
curl http://localhost:3000/api/users/10/wishlist \
  -H "Authorization: Bearer <token>"
```

**200** → success envelope wrapping the wishlist object.
**401** — missing/invalid token · **403** — `:id` is not your own user id · **404** — no wishlist yet

---

### POST `/api/users/:id/wishlist` 🔒

Create the user's wishlist with its items.

```bash
curl -X POST http://localhost:3000/api/users/10/wishlist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Birthday ideas", "items": ["RCH45Q1A", "BMW-PNC-001"] }'
```

**201** → success envelope wrapping the created wishlist object.
**409** — a wishlist already exists (use PUT to replace it)
**422** — missing `name` or an item with an empty `sku`

---

### PUT / PATCH `/api/users/:id/wishlist` 🔒

Replace the user's wishlist. The body carries the **full** structure — the name
and the entire item set are overwritten.

```bash
curl -X PUT http://localhost:3000/api/users/10/wishlist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Birthday ideas (updated)", "items": ["RCH45Q1A"] }'
```

**200** → success envelope wrapping the updated wishlist object.
**404** — no wishlist to replace · **422** — invalid body

---

### DELETE `/api/users/:id/wishlist` 🔒

Delete the user's wishlist and its items. Returns the deleted wishlist.

```bash
curl -X DELETE http://localhost:3000/api/users/10/wishlist \
  -H "Authorization: Bearer <token>"
```

**200** → success envelope wrapping the deleted wishlist object.
**404** — no wishlist to delete

---

## Orders 🔒

Orders are a **read-only** resource — every route requires a Bearer token and is
scoped to the caller. Orders are **created by the checkout flow**
(`POST /api/checkout`), never from an order request body. This is what fixes the
front end generating duplicate orders.

**Status lifecycle** (`status`): `draft` → `pending_payment` → `paid` →
`fulfilled`, with `payment_failed`, `cancelled` and `refunded` as terminal
branches. A user may have only **one open order** (`draft` or `pending_payment`) at
a time.

The **order object**:

```json
{
  "id": 5,
  "orderId": "018f9a2c-7b3e-7c21-9e2a-3f1b6d4e5a90",
  "userId": 10,
  "products": [
    { "sku": "BMW-PNC-001", "description": "BMW Pencil", "unitPrice": 1000, "discountPrice": 800, "qty": 3 }
  ],
  "total": 3000,
  "discountedTotal": 2400,
  "totalProducts": 1,
  "totalQuantity": 3,
  "status": "pending_payment",
  "currency": "usd",
  "address": {},
  "payment": { "provider": "stripe", "sessionId": "cs_test_…", "status": "open", "amountTotal": 2400, "currency": "usd" },
  "paidOn": null,
  "amountRefunded": 0,
  "refundStatus": "none",
  "refundedOn": null
}
```

`total` is the gross item total (Σ `unitPrice` × `qty`); `discountedTotal` is the
net payable (gross − discounts). All amounts are integer cents; `amountTotal` in
the payment summary equals `discountedTotal` (Stripe's smallest-unit amount).

- `id` — the internal numeric primary key (used in `/api/orders/:id` paths).
- `orderId` — the **public, time-sortable UUID v7** identifier. This is the id
  shown in emails and sent to Stripe (in `metadata.orderId`); the payment and
  refund webhooks look the order up by it.
- `currency` — ISO 4217 currency the order is priced/charged in (the system
  currency, from the `CURRENCY` env var; defaults to `usd`).
- `paidOn` — timestamp set when Stripe confirms the payment; `null` until then.
- `amountRefunded` (cents), `refundStatus` (`none` → `pending` → `refunded`/`failed`)
  and `refundedOn` track a refund (see [Refunds](#refunds--admin)); new orders
  return `0` / `"none"` / `null`.

The Stripe identifiers `paymentId`, `paymentIntent`, `sessionId` and `refundId`
are stored server-side only and are **never** returned by the API.

### GET `/api/orders` 🔒

List the caller's own orders, newest first.

```bash
curl http://localhost:3000/api/orders -H "Authorization: Bearer <token>"
```

**200** → `{ success, data: { orders: [ … ] } }`

---

### GET `/api/orders/search` 🔒

Search the caller's own orders by **public order id** (`orderId`, the UUID),
matched as a case-insensitive substring. Scoped to the caller — another user's
order never appears. An empty/missing `q` returns all of the caller's orders
(same as `GET /api/orders`).

**Query params:** `q` (the `orderId` or a fragment of it).

```bash
curl "http://localhost:3000/api/orders/search?q=018f9a2c" -H "Authorization: Bearer <token>"
```

**200** → `{ success, data: { orders: [ … ] } }`

---

### GET `/api/orders/:id` 🔒

Get one of the caller's orders. Orders belonging to another user return `404`.

```bash
curl http://localhost:3000/api/orders/5 -H "Authorization: Bearer <token>"
```

**200** → success envelope wrapping a single order object.
**404** — not found (or not yours)

---

### GET `/api/orders/status` 🔒 ADMIN

List every possible order status. Admin only.

```bash
curl http://localhost:3000/api/orders/status -H "Authorization: Bearer <adminToken>"
```

**200**

```json
{
  "success": true,
  "data": {
    "statuses": ["draft", "pending_payment", "paid", "payment_failed", "cancelled", "fulfilled", "refunded"]
  }
}
```

**401** — missing/invalid token · **403** — not an ADMIN

---

### POST `/api/orders/:id/status` 🔒 ADMIN

**Emergency override** — force an order to a given status, bypassing the normal
lifecycle. Admin only; works on **any** order (not scoped to an owner).

**Body (required):** `status` — one of the values from `GET /api/orders/status`.

```bash
curl -X POST http://localhost:3000/api/orders/5/status \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "cancelled" }'
```

**200** → success envelope wrapping the updated order object.
**401** — missing/invalid token · **403** — not an ADMIN
**404** — no such order · **422** — missing or unknown `status`

---

## Checkout 🔒

Placing an order is a **separate operation** from the orders resource. Checkout
requires a Bearer token. The order is built from the caller's cart; the body
carries only the front-end **callback URLs** Stripe redirects to.

### POST `/api/checkout` 🔒

Register an order from the caller's cart and start payment. The flow: register the
order as `draft` from the cart snapshot → create a Stripe **hosted** Checkout
Session → clear the cart and move the order to `pending_payment`. If the
payment processor fails to start a session, the draft order is deleted (so it does
not linger as an open order) and the error is surfaced. The response carries both
the order and the checkout session; the front end **redirects the browser to
`checkout.url`** to collect payment.
Full flow and payment-platform details: [`docs/ORDER_PROCESSING.md`](docs/ORDER_PROCESSING.md).

**Body (required):** `successUrl`, `cancelUrl` — where Stripe sends the customer
after the payment form succeeds or is cancelled. `successUrl` is templated with
`?session_id={CHECKOUT_SESSION_ID}`; `cancelUrl` is used as-is.

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "successUrl": "https://shop.example/checkout/ok", "cancelUrl": "https://shop.example/cart" }'
```

**201**

```json
{
  "success": true,
  "data": {
    "order": { "id": 5, "status": "pending_payment", "total": 3000, "discountedTotal": 2400, "…": "…" },
    "checkout": {
      "provider": "stripe",
      "sessionId": "cs_test_…",
      "url": "https://checkout.stripe.com/c/pay/cs_test_…",
      "status": "open",
      "successUrl": "https://shop.example/checkout/ok?session_id={CHECKOUT_SESSION_ID}",
      "cancelUrl": "https://shop.example/cart",
      "amountTotal": 2400,
      "currency": "usd"
    }
  }
}
```

**401** — missing/invalid token
**409** — you already have an open order (`draft` / `pending_payment`)
**422** — missing `successUrl`/`cancelUrl`, or your cart is empty (nothing to order)

> **Real or mock Stripe.** When `STRIPE_SECRET_KEY` is set the session is created
> via the real Stripe API (`StripeService`); when it is empty a Stripe-shaped
> mock (`PaymentService`) is used instead — no keys or network required. Both
> implement the same interface, so callers are identical. See `CONFIGURATION.md`.

### POST `/api/checkout/webhook`

**Public** (no token) — Stripe calls this server-to-server to report the outcome
of a checkout session. The request is verified by **signature** (the raw body is
checked against the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`), and
the order's **public UUID** (`orderId`) is read from the session's
`metadata.orderId` — the order is looked up by it. Stripe events map to order
transitions as:

| Stripe event | order transitions to | side effect |
| --- | --- | --- |
| `checkout.session.completed` / `async_payment_succeeded` | `paid` | records `paidOn`, captures `paymentIntent` |
| `checkout.session.async_payment_failed` / `expired` | `payment_failed` | — |
| *(any other event)* | unchanged | acknowledged and ignored |

The event is matched to the order by **both** its order id *and* its checkout
session id: the session id in the event must equal the one captured on the order
at checkout. A mismatched (or missing) session id is rejected with **409** and
the order is left unchanged — an event for a different or stale session can never
settle it. Only an order currently in `pending_payment` can be settled.
Re-delivering the same event (order already in the target status) is a no-op and
still returns **200**, so Stripe's retries don't error.

```bash
# Real Stripe: send a signed event (use the Stripe CLI to forward + sign)
stripe listen --forward-to localhost:3000/api/checkout/webhook
stripe trigger checkout.session.completed
```

**200** — receipt acknowledgement only (the order update is a side effect):

```json
{ "received": true }
```

**404** — no order for the event's `orderId`
**409** — the order is not awaiting payment (not in `pending_payment`)
**422** — signature verification failed / unsupported event

> **Mock mode** (`STRIPE_SECRET_KEY` unset) — the mock processor skips signature
> verification and accepts a plain JSON body `{ "orderId": "018f9a2c-…"
> (the order UUID), "sessionId": "cs_test_…", "status": "payment_succeeded" |
> "payment_failed" }`, which is how the test suite drives the webhook. `sessionId`
> must match the order's stored session id. Full details:
> [`docs/ORDER_PROCESSING.md`](docs/ORDER_PROCESSING.md).

---

## Refunds 🔒 ADMIN

Refunding a **paid** order is an **admin-only** operation, separate from the
orders resource. Starting a refund hands off to Stripe and moves the order's
`refundStatus` to `pending`; the refund settles asynchronously via a webhook,
which updates `amountRefunded` / `refundedOn`, sets `refundStatus` to `refunded`,
and moves the order to `refunded`. (Refund fields on the order object are
described under [Orders](#orders-).)

### POST `/api/refund` 🔒 ADMIN

Start a refund for a paid order. Requires an authenticated ADMIN.

```bash
curl -X POST http://localhost:3000/api/refund \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{ "orderId": 5 }'
```

**Body:** `orderId` (required) — the order's internal numeric `id` (this
admin-facing lookup uses the numeric key; the UUID is what crosses the Stripe
boundary and settles the refund via the webhook).

**201**

```json
{
  "success": true,
  "data": {
    "order": { "id": 5, "status": "paid", "refundStatus": "pending", "…": "…" },
    "refund": { "provider": "stripe", "refundId": "re_…", "status": "pending", "amount": 2400, "currency": "usd" }
  }
}
```

**401** — missing/invalid token · **403** — not an ADMIN
**404** — no such order
**409** — the order is not `paid`, or a refund is already `pending`/`refunded`/`failed`

### POST `/api/refund/webhook`

**Public** (no token) — the payment processor calls this server-to-server to
report the refund outcome; verified by **signature** like the checkout webhook.
The event is matched to the order by **both** its order id *and* its refund id
(which must equal the one captured when the refund started). Refund events map as:

| Stripe event (refund status) | order refund settles to | side effect |
| --- | --- | --- |
| refund `succeeded` | `refunded` | records `amountRefunded` / `refundedOn`, order → `refunded` |
| refund `failed` / `canceled` | `failed` | order stays `paid` |
| *(still pending / other)* | unchanged | acknowledged and ignored |

Only an order with a `pending` refund can be settled. Re-delivery is idempotent
(**200**). A mismatched/unknown refund id → **409**; unknown order → **404**.

**200** — receipt acknowledgement only:

```json
{ "received": true }
```

> **Mock mode** (`STRIPE_SECRET_KEY` unset) accepts a plain JSON body
> `{ "orderId": "018f9a2c-…" (the order UUID), "refundId": "re_…", "amountRefunded": 2400, "status":
> "refund_succeeded" | "refund_failed" }`, which is how the test suite drives it.

---

## Notes for frontend integration

- Read errors as `response.data.message` (flat), success payloads as `response.data.data`.
- Store `accessToken` and `refreshToken` from login; send `Authorization: Bearer <accessToken>`
  on 🔒 endpoints; call `POST /api/auth/refresh` when the access token expires.
- **🔒 ADMIN** endpoints (product and category create/update/delete, starting a refund
  via `POST /api/refund`, and the order-status override `GET /api/orders/status` /
  `POST /api/orders/:id/status`) require the token's user to have the `ADMIN` role —
  non-admins get **403**, missing/invalid tokens get **401**.
- The cart and wishlist are per-user singletons under `/api/users/:id/…`; `:id` must be the
  logged-in user's own id. Place an order with `POST /api/checkout` (no body) — never post order
  data directly; `/api/orders` is read-only.
- CORS allows `GET, POST, PUT, PATCH, DELETE, OPTIONS`. Rate limiting is active; on
  **429** back off using the `error.message` retry hint.

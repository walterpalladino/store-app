# Shōp Store — API Contract

Complete specification of every HTTP endpoint consumed by the web application,
with exact request shapes, response shapes, and which feature uses each call.

All endpoints are relative to the base URLs configured in `src/config/api.js`
via environment variables (see `.env`).

---

## Base URL Variables

| Variable               | Default                    | Governs              |
|------------------------|----------------------------|----------------------|
| `VITE_API_AUTH`        | `https://dummyjson.com`    | Login / session      |
| `VITE_API_USERS`       | `https://dummyjson.com`    | User CRUD            |
| `VITE_API_PRODUCTS`    | `https://dummyjson.com`    | Product catalogue    |
| `VITE_API_CARTS`       | `https://dummyjson.com`    | Cart test data       |
| `VITE_API_TRANSACTIONS`| `https://dummyjson.com/c`  | Orders / checkout    |

---

## 1. Authentication

### 1.1 Login — Customer & Merchant

Both the customer login page and the merchant admin login use the same endpoint.
Customer tokens are stored under `shop_auth`; merchant tokens under `shop_merchant_auth`.

```
POST /auth/login
Content-Type: application/json
```

**Request body**
```json
{
  "username": "emilys",
  "password": "emilyspass",
  "expiresInMins": 60
}
```

| Field           | Type    | Required | Notes                              |
|-----------------|---------|----------|------------------------------------|
| `username`      | string  | ✅        |                                    |
| `password`      | string  | ✅        |                                    |
| `expiresInMins` | integer | ✅        | App always sends `60`              |

**Response — 200 OK**
```json
{
  "id": 1,
  "username": "emilys",
  "email": "emily.johnson@x.dummyjson.com",
  "firstName": "Emily",
  "lastName": "Johnson",
  "gender": "female",
  "image": "https://dummyjson.com/icon/emilys/128",
  "role": "admin",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The app splits the response: `accessToken` and `refreshToken` are stored separately;
everything else becomes the `user` object in context.

**Response — 400 / 401**
```json
{ "message": "Invalid credentials" }
```

---

### 1.2 Refresh Access Token

Called automatically when the JWT `exp` claim is in the past, before any
authenticated request.

```
POST /auth/refresh
Content-Type: application/json
```

**Request body**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresInMins": 60
}
```

**Response — 200 OK**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response — 401**
```json
{ "message": "Token expired" }
```

---

### 1.3 Get Current User (authenticated)

Used by Address panel and Payment Methods panel to retrieve the logged-in
user's saved address and bank card data.

```
GET /auth/me
Authorization: Bearer <accessToken>
```

**Request body** — none

**Response — 200 OK** (abridged — full DummyJSON user object)
```json
{
  "id": 1,
  "firstName": "Emily",
  "lastName": "Johnson",
  "username": "emilys",
  "email": "emily.johnson@x.dummyjson.com",
  "phone": "+81 965-431-3024",
  "image": "https://dummyjson.com/icon/emilys/128",
  "address": {
    "address": "626 Main Street",
    "city": "Phoenix",
    "state": "Mississippi",
    "stateCode": "MS",
    "postalCode": "29112",
    "country": "United States",
    "coordinates": { "lat": -77.4197, "lng": -143.6944 }
  },
  "bank": {
    "cardExpire": "03/26",
    "cardNumber": "9289760655481815",
    "cardType": "Elo",
    "currency": "Dirham",
    "iban": "PKEJ8719963015063543681733"
  },
  "company": {
    "department": "Engineering",
    "name": "Dooley, Kozey and Cronin",
    "title": "Sales Manager",
    "address": { "city": "San Diego" }
  },
  "role": "admin"
}
```

**Response — 401** — triggers a token refresh attempt.

---

## 2. Users

### 2.1 Register New User

Used on the customer registration page. DummyJSON accepts but does not
persist the new user; the app uses the response to confirm registration and
then redirects to login.

```
POST /users/add
Content-Type: application/json
```

**Request body**
```json
{
  "firstName": "Walter",
  "lastName": "Palladino",
  "username": "walterp",
  "email": "walter@example.com",
  "password": "secret123"
}
```

**Response — 201 Created**
```json
{
  "id": 209,
  "firstName": "Walter",
  "lastName": "Palladino",
  "username": "walterp",
  "email": "walter@example.com"
}
```

Note: No `accessToken` is returned — the app redirects to login after registration.

---

### 2.2 Update User Profile

Used by:
- **User Settings** — update firstName, lastName, email, phone
- **Address panel** — update address object
- **Payment Methods panel** — update bank object
- **Merchant Settings** — update firstName, lastName, email, phone
- **Checkout page** — reads address/bank but does not PATCH

The app sends only the fields being changed (partial PATCH).

```
PATCH /users/{id}
Authorization: Bearer <accessToken>    (customer panels)
Content-Type: application/json
```

#### 2.2a — Update profile fields
```json
{
  "firstName": "Emily",
  "lastName": "Johnson",
  "email": "emily.johnson@x.dummyjson.com",
  "phone": "+81 965-431-3024"
}
```

#### 2.2b — Update address
```json
{
  "address": {
    "address": "626 Main Street",
    "city": "Phoenix",
    "state": "Mississippi",
    "postalCode": "29112",
    "country": "United States"
  }
}
```

#### 2.2c — Update payment / bank card
```json
{
  "bank": {
    "cardExpire": "01/30",
    "cardNumber": "9289760655481815",
    "cardType": "Elo",
    "currency": "Dirham",
    "iban": "PKEJ8719963015063543681733"
  }
}
```

Note: The app always merges the existing `bank` object with the changed fields
to preserve `currency` and `iban` when only the card details change.

**Response — 200 OK** — echoes back the full updated user object (same shape
as `GET /auth/me` above). The app reads `updated.address` or `updated.bank`
from the response and falls back to the submitted values if absent.

**Response — 400 / 404**
```json
{ "message": "User not found" }
```

---

## 3. Products

### 3.1 List Products

Used by:
- **Home page** product grid (all products)
- **Admin Products** table (paginated)

```
GET /products?limit={limit}&skip={skip}
```

| Param   | Type    | Notes                                          |
|---------|---------|------------------------------------------------|
| `limit` | integer | Home page: `200` (then client-filters); Admin: `15` |
| `skip`  | integer | `(page - 1) * limit`                          |

**Response — 200 OK**
```json
{
  "products": [
    {
      "id": 1,
      "title": "Essence Mascara Lash Princess",
      "description": "The Essence Mascara Lash Princess is a popular mascara...",
      "category": "beauty",
      "price": 9.99,
      "discountPercentage": 7.17,
      "rating": 4.94,
      "stock": 5,
      "sku": "RCH45Q1A",
      "thumbnail": "https://cdn.dummyjson.com/products/images/beauty/Essence%20Mascara.../thumbnail.png",
      "brand": "Essence",
      "weight": 2,
      "availabilityStatus": "Low Stock",
      "warrantyInformation": "1 month warranty",
      "returnPolicy": "30 days return policy",
      "minimumOrderQuantity": 24
    }
  ],
  "total": 194,
  "skip": 0,
  "limit": 15
}
```

The home page applies client-side price filtering after receiving `200` results.

---

### 3.2 Search Products

Used by home page search and admin products search.

```
GET /products/search?q={query}&limit={limit}&skip={skip}
```

**Response** — same shape as `GET /products`.

---

### 3.3 Get Products by Category

Used by home page category filter and admin category filter.

```
GET /products/category/{slug}?limit={limit}&skip={skip}
```

Example: `GET /products/category/smartphones?limit=200&skip=0`

**Response** — same shape as `GET /products`.

---

### 3.4 List Categories

Used to populate the category filter chips (home page) and category dropdown
(admin products).

```
GET /products/categories
```

**Response — 200 OK**
```json
[
  { "slug": "beauty",       "name": "Beauty",       "url": "https://dummyjson.com/products/category/beauty"       },
  { "slug": "fragrances",   "name": "Fragrances",   "url": "https://dummyjson.com/products/category/fragrances"   },
  { "slug": "furniture",    "name": "Furniture",    "url": "https://dummyjson.com/products/category/furniture"     },
  { "slug": "smartphones",  "name": "Smartphones",  "url": "https://dummyjson.com/products/category/smartphones"   }
]
```

The app handles both `string[]` and `{slug, name}[]` shapes defensively.

---

### 3.5 Get Single Product

Used by:
- **Product detail page**
- **Cart "Load Test Data"** — fetches full product per stub in cart
- **Purchase history thumbnails** — fetches thumbnail for each product id
- **Admin product table thumbnails**

```
GET /products/{id}
```

**Response — 200 OK** — same product object shape as in the list, plus:
```json
{
  "id": 1,
  "title": "Essence Mascara Lash Princess",
  "description": "The Essence Mascara Lash Princess is a popular mascara...",
  "category": "beauty",
  "price": 9.99,
  "discountPercentage": 7.17,
  "rating": 4.94,
  "stock": 5,
  "sku": "RCH45Q1A",
  "thumbnail": "https://cdn.dummyjson.com/.../thumbnail.png",
  "images": [
    "https://cdn.dummyjson.com/.../1.png",
    "https://cdn.dummyjson.com/.../2.png"
  ],
  "brand": "Essence",
  "weight": 2,
  "dimensions": { "width": 2.85, "height": 7.07, "depth": 1.44 },
  "availabilityStatus": "Low Stock",
  "warrantyInformation": "1 month warranty",
  "returnPolicy": "30 days return policy",
  "minimumOrderQuantity": 24,
  "meta": {
    "barcode": "2817839095220",
    "createdAt": "2024-05-23T08:56:21.618Z",
    "updatedAt": "2024-05-23T08:56:21.618Z"
  },
  "reviews": [
    {
      "rating": 2,
      "comment": "Very unhappy with my purchase!",
      "date": "2024-05-23T08:56:21.618Z",
      "reviewerName": "John Doe",
      "reviewerEmail": "john.doe@x.dummyjson.com"
    }
  ]
}
```

**Response — 404**
```json
{ "message": "Product with id '999' not found" }
```

---

### 3.6 Add New Product (Admin)

Used by the **Admin → Products → Add New Product** drawer.

```
POST /products/add
Content-Type: application/json
```

**Request body**
```json
{
  "title": "Premium Leather Wallet",
  "description": "Hand-stitched full-grain leather bifold wallet.",
  "price": 89.99,
  "discountPercentage": 10,
  "stock": 150,
  "category": "accessories",
  "brand": "Bellroy",
  "sku": "BLY-WALLET-BLK-001",
  "thumbnail": "https://example.com/wallet-thumb.jpg",
  "weight": 75,
  "warrantyInformation": "2 year warranty",
  "returnPolicy": "60 days return policy",
  "minimumOrderQuantity": 1,
  "availabilityStatus": "In Stock"
}
```

| Field                  | Type    | Required | Notes                             |
|------------------------|---------|----------|-----------------------------------|
| `title`                | string  | ✅        |                                   |
| `category`             | string  | ✅        |                                   |
| `price`                | number  | ✅        | Positive                          |
| `discountPercentage`   | number  | ❌        | 0–100; defaults to `0`            |
| `stock`                | integer | ❌        | Defaults to `0`                   |
| `brand`                | string  | ❌        |                                   |
| `sku`                  | string  | ❌        |                                   |
| `thumbnail`            | string  | ❌        | Full URL                          |
| `weight`               | number  | ❌        | Grams                             |
| `warrantyInformation`  | string  | ❌        |                                   |
| `returnPolicy`         | string  | ❌        |                                   |
| `minimumOrderQuantity` | integer | ❌        | Defaults to `1`                   |
| `availabilityStatus`   | string  | ❌        | One of: In Stock, Low Stock, Out of Stock, Discontinued, Pre-order |
| `description`          | string  | ❌        |                                   |

**Response — 201 Created**
```json
{
  "id": 195,
  "title": "Premium Leather Wallet",
  "price": 89.99,
  "category": "accessories"
}
```

The app merges the response with the submitted body, using `id` from the
response and all other fields from the request.

---

### 3.7 Update Product (Admin)

Used by the **Admin → Products → Edit** drawer.

```
PATCH /products/{id}
Content-Type: application/json
```

**Request body** — same shape as `POST /products/add` above.
The `id` is never sent in the body; only changed fields need to be included.

**Response — 200 OK** — echoes back the full updated product object (same
shape as `GET /products/{id}`).

---

## 4. Carts

### 4.1 Get Cart by ID (Test Data)

Used by the **Cart page → "Load Test Data"** button.

```
GET /carts/{id}
```

The app always calls `/carts/1`.

**Response — 200 OK**
```json
{
  "id": 1,
  "products": [
    {
      "id": 144,
      "title": "Cricket Helmet",
      "price": 44.99,
      "quantity": 4,
      "total": 179.96,
      "discountPercentage": 17.59,
      "discountedTotal": 148.31,
      "thumbnail": "https://cdn.dummyjson.com/.../thumbnail.png"
    }
  ],
  "total": 2328.91,
  "discountedTotal": 1941.28,
  "userId": 97,
  "totalProducts": 5,
  "totalQuantity": 22
}
```

After receiving this response, the app fetches `GET /products/{id}` for each
product in the cart in parallel to get the full product record (stock, sku,
category, etc.) before adding to the cart context.

---

## 5. Transactions

These endpoints live under `VITE_API_TRANSACTIONS` (default: `https://dummyjson.com/c`).
They are custom DummyJSON mock response endpoints that always return the same
body regardless of request method or payload.

---

### 5.1 List Transactions

Used by:
- **User Account → Purchase History** (customer)
- **Admin → Sales** panel

```
GET /f26f-5bcf-4ffe-ab46
```

**Response — 200 OK**
```json
{
  "transactions": [
    {
      "id": 1,
      "userId": 1,
      "products": [
        {
          "id": 162,
          "sku": "TOP-BRD-BLU-162",
          "title": "Blue Frock",
          "price": 29.99,
          "quantity": 4,
          "total": 119.96,
          "discountPercentage": 12.13,
          "discountedTotal": 105.41
        },
        {
          "id": 113,
          "sku": "MOT-GEN-GEN-113",
          "title": "Generic Motorcycle",
          "price": 3999.99,
          "quantity": 3,
          "total": 11999.97,
          "discountPercentage": 12.10,
          "discountedTotal": 10547.97
        },
        {
          "id": 122,
          "sku": "SMA-APP-IPH-122",
          "title": "iPhone 6",
          "price": 299.99,
          "quantity": 3,
          "total": 899.97,
          "discountPercentage": 6.69,
          "discountedTotal": 839.76
        },
        {
          "id": 138,
          "sku": "SPO-BRD-BAS-138",
          "title": "Baseball Ball",
          "price": 8.99,
          "quantity": 2,
          "total": 17.98,
          "discountPercentage": 1.71,
          "discountedTotal": 17.67
        }
      ],
      "total": 13037.88,
      "discountedTotal": 11510.81,
      "totalProducts": 4,
      "totalQuantity": 12,
      "status": "Delivered",
      "payment": {
        "cardExpire": "01/30",
        "cardNumber": "3530633803003665",
        "cardType": "JCB",
        "currency": "USD"
      }
    }
  ]
}
```

**Expected fields per transaction**

| Field             | Type    | Required | Notes                                                   |
|-------------------|---------|----------|---------------------------------------------------------|
| `id`              | integer | ✅        | Used for order number display                           |
| `userId`          | integer | ✅        |                                                         |
| `products`        | array   | ✅        | See product line-item shape below                       |
| `total`           | number  | ✅        | Pre-discount subtotal                                   |
| `discountedTotal` | number  | ✅        | Amount actually charged                                 |
| `totalProducts`   | integer | ✅        | Count of unique product lines                           |
| `totalQuantity`   | integer | ✅        | Sum of all quantities                                   |
| `status`          | string  | ❌        | Optional — displayed as-is. Known values below          |
| `payment`         | object  | ❌        | Card details shown in order summary                     |

**Known `status` values and their display colours**

| Value                              | Colour  |
|------------------------------------|---------|
| `Delivered`                        | Green   |
| `Payment Completed`                | Green   |
| `Completed`                        | Green   |
| `Shipped`                          | Blue    |
| `Processing`                       | Gold    |
| `Pending`                          | Gold    |
| `Error`                            | Red     |
| `Payment could not be processed`   | Red     |
| `Cancelled`                        | Red     |
| *(any other value)*                | Grey    |
| *(absent)*                         | Derived from `id % 3` |

**Product line-item shape inside a transaction**

```json
{
  "id": 162,
  "sku": "TOP-BRD-BLU-162",
  "title": "Blue Frock",
  "price": 29.99,
  "quantity": 4,
  "total": 119.96,
  "discountPercentage": 12.13,
  "discountedTotal": 105.41
}
```

Note: `thumbnail` is not stored in transactions — the app fetches it separately
via `GET /products/{id}` in the background after loading the transaction list.

---

### 5.2 Get Transaction Detail

Used by **Purchase History → View** button.

```
GET /16cd-534f-49b7-be01
```

**Response — 200 OK** — same shape as a single transaction object (not wrapped
in `{ "transactions": [...] }`) — identical to one item from the list above:

```json
{
  "id": 1,
  "userId": 1,
  "products": [ ... ],
  "total": 13037.88,
  "discountedTotal": 11510.81,
  "totalProducts": 4,
  "totalQuantity": 12,
  "status": "Delivered",
  "payment": {
    "cardExpire": "01/30",
    "cardNumber": "3530633803003665",
    "cardType": "JCB",
    "currency": "USD"
  }
}
```

---

### 5.3 Submit Order (Checkout)

Used by the **Checkout page → Place Order** button.

```
POST /d31a-f3ea-4681-b50a
Content-Type: application/json
```

**Request body**
```json
{
  "userId": 1,
  "products": [
    {
      "id": 1,
      "sku": "RCH45Q1A",
      "title": "Essence Mascara Lash Princess",
      "thumbnail": "https://cdn.dummyjson.com/.../thumbnail.png",
      "price": 9.99,
      "quantity": 2,
      "total": 19.98,
      "discountPercentage": 7.17,
      "discountedTotal": 18.55
    }
  ],
  "address": {
    "address": "626 Main Street",
    "city": "Phoenix",
    "state": "Mississippi",
    "postalCode": "29112",
    "country": "United States"
  },
  "payment": {
    "cardExpire": "03/26",
    "cardNumber": "9289760655481815",
    "cardType": "Elo",
    "currency": "Dirham"
  },
  "total": 19.98,
  "discountedTotal": 18.55,
  "totalProducts": 1,
  "totalQuantity": 2
}
```

**Request body fields**

| Field             | Type    | Required | Notes                                       |
|-------------------|---------|----------|---------------------------------------------|
| `userId`          | integer | ✅        | From the logged-in user context             |
| `products`        | array   | ✅        | Assembled from cart items                   |
| `address`         | object  | ✅        | From user's saved address (editable)        |
| `payment`         | object  | ✅        | From user's saved bank card (editable)      |
| `total`           | number  | ✅        | Cart subtotal before shipping/tax           |
| `discountedTotal` | number  | ✅        | Same as `total` (discount already applied)  |
| `totalProducts`   | integer | ✅        | `cart.items.length`                         |
| `totalQuantity`   | integer | ✅        | Sum of all quantities                       |

**Response — 200 OK**
```json
{
  "id": 1,
  "products": [ ... ],
  "total": 13037.88,
  "discountedTotal": 11510.81,
  "totalProducts": 4,
  "totalQuantity": 12,
  "status": "Delivered",
  "payment": {
    "cardExpire": "01/30",
    "cardNumber": "3530633803003665",
    "cardType": "JCB",
    "currency": "USD"
  }
}
```

The app merges the response with the submitted payload: `status` and `id` are
taken from the response; `products`, `address`, `payment`, and totals are taken
from the request (to ensure the confirmation screen shows accurate data).

**Critical field — `status`**

The checkout result screen behaviour is driven entirely by this field:

| `status` value                         | UI outcome                                       |
|----------------------------------------|--------------------------------------------------|
| `Delivered`, `Payment Completed`, etc. | Green success screen with order summary          |
| `Error`, `Payment could not be processed`, `Cancelled` | Red error screen with "Review Order" button |

After a **successful** status the app calls `clearCart()`. On an **error** status the cart is preserved so the user can retry.

---

## 6. Password Reset (Simulated)

The **User Settings → Reset Password** section does **not** make a real API
call. It simulates a 900ms delay and shows a success message.

When you implement a real password-change endpoint, wire it here:

```
POST /auth/password-change          (suggested path — your choice)
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Suggested request body**
```json
{
  "currentPassword": "emilyspass",
  "newPassword": "newSecurePass123"
}
```

**Suggested response — 200 OK**
```json
{ "message": "Password updated successfully" }
```

**Suggested response — 400**
```json
{ "message": "Current password is incorrect" }
```

---

## 7. Authentication Headers

All endpoints under `/auth/me` and `PATCH /users/{id}` that the app calls with
`authFetch()` / `merchantFetch()` send:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

The app handles `401` responses by attempting a silent token refresh
(`POST /auth/refresh`) and retrying the original request once. If the refresh
also fails, the user is logged out.

---

## 8. Error Response Convention

The app reads `data.message` from error responses. Standardise on:

```json
{ "message": "Human-readable description of what went wrong" }
```

HTTP status codes the app specifically handles:

| Code | Meaning              | App behaviour                          |
|------|----------------------|----------------------------------------|
| 200  | OK                   | Normal                                 |
| 201  | Created              | Treated same as 200                    |
| 400  | Bad request          | Shows `data.message` to user           |
| 401  | Unauthorized         | Triggers token refresh then retry      |
| 404  | Not found            | Shows error state / "not found" screen |
| 5xx  | Server error         | Shows generic error with retry button  |

---

## 9. Summary Table

| # | Method | Path                          | Auth | Used by                                      |
|---|--------|-------------------------------|------|----------------------------------------------|
| 1 | POST   | `/auth/login`                 | ❌    | Customer login, Merchant admin login         |
| 2 | POST   | `/auth/refresh`               | ❌    | Auto token refresh                           |
| 3 | GET    | `/auth/me`                    | ✅    | Address panel, Payment methods panel         |
| 4 | POST   | `/users/add`                  | ❌    | Customer registration                        |
| 5 | PATCH  | `/users/{id}`                 | ✅    | Profile, address, payment method update      |
| 6 | GET    | `/products`                   | ❌    | Home page grid, Admin products table         |
| 7 | GET    | `/products/search`            | ❌    | Home page search, Admin product search       |
| 8 | GET    | `/products/category/{slug}`   | ❌    | Home page category filter, Admin filter      |
| 9 | GET    | `/products/categories`        | ❌    | Home page filter chips, Admin dropdown       |
|10 | GET    | `/products/{id}`              | ❌    | Product detail page, thumbnails, cart test   |
|11 | POST   | `/products/add`               | ❌    | Admin → Add New Product                      |
|12 | PATCH  | `/products/{id}`              | ❌    | Admin → Edit Product                         |
|13 | GET    | `/carts/{id}`                 | ❌    | Cart page "Load Test Data" (always id=1)     |
|14 | GET    | `/{LIST_HASH}`                | ❌    | Purchase history list, Admin sales panel     |
|15 | GET    | `/{DETAIL_HASH}`              | ❌    | Purchase history detail view                 |
|16 | POST   | `/{CHECKOUT_HASH}`            | ❌    | Checkout order submission                    |

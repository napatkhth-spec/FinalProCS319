# API Documentation

Base URL: `http://localhost:3000/api`

Protected endpoints use `Authorization: Bearer <access-token>`. Role and ownership checks are enforced by the backend.

## Health and authentication

- `GET /health`
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- Legacy `POST /auth/refresh` and `POST /auth/logout-all` return HTTP 410 and are not used by the frontend.

## Categories

- Public: `GET /categories`, `GET /categories/:id`
- Admin: `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`
- A category cannot be deleted while it has products or child categories.

## Products

- Public: `GET /products?search=&categoryId=&farmerId=&page=&pageSize=`, `GET /products/:id`
- Farmer: `GET /products/mine`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`
- Product writes require a FARMER role and an APPROVED farmer profile. Delete archives a product by setting its status to `INACTIVE`.

## Farmer profile

- Authenticated: `GET /farmers/profile`
- Buyer/Farmer: `POST /farmers/profile` opens a shop and adds FARMER without removing existing roles.
- Farmer: `PATCH /farmers/profile`; verification status is not client-editable.

## Addresses

- Buyer: `GET /addresses`, `GET /addresses/:id`, `POST /addresses`, `PATCH /addresses/:id`, `DELETE /addresses/:id`
- Address records are always scoped to the authenticated user. Default-address changes are transactional.

## Orders

- Buyer/Farmer/Admin: `GET /orders`, `GET /orders/:id`
- Buyer: `POST /orders` with `{ addressId, items: [{ productId, quantity }], paymentMethod, shippingFee?, note? }`.
- Buyer/Farmer/Admin: `PATCH /orders/:id/status`. Buyers may cancel unpaid pending orders; farmers advance fulfillment states. Creation and stock reservation run in a transaction.

## Reviews

- Public: `GET /reviews?productId=<uuid>`
- Buyer: `POST /reviews`, `PATCH /reviews/:id`, `DELETE /reviews/:id`
- Writes are scoped to the authenticated user; duplicate reviews for the same product are rejected.

## Not implemented

- `/users` is still an HTTP 501 placeholder.
- Product image upload/management and Payment processing endpoints are not implemented. Product responses include existing image metadata.
- Orders are cancelled through status transitions rather than deleted. Farmer profiles have no delete endpoint because other records may reference them.


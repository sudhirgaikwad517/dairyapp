# Shrishti Dairy Farm — API (v1)

Base URL (local): `http://localhost:3000`

All responses use this envelope:

```json
{
  "success": true,
  "data": {},
  "meta": { "timestamp": "...", "version": "v1" }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "..." },
  "meta": { "timestamp": "...", "version": "v1" }
}
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Server + database status |
| GET | `/api/v1/products` | All categories + products |
| GET | `/api/v1/products?category=a2` | Filter by category id |
| GET | `/api/v1/products/{id}` | Single product |
| GET | `/api/v1/categories` | Category list |
| GET | `/api/v1/contact` | Phones + address |
| GET | `/api/v1/cart` | Current session cart |
| POST | `/api/v1/cart` | Add item `{ productId, purchaseType?, quantity? }` |
| DELETE | `/api/v1/cart` | Clear cart |
| PATCH | `/api/v1/cart/items/{id}` | Update quantity `{ quantity }` |
| DELETE | `/api/v1/cart/items/{id}` | Remove line item |
| POST | `/api/v1/orders` | Place order from cart `{ customerName, phone, address }` |
| GET | `/api/v1/orders/{id}` | Order details |

## Category ids

- `a2`
- `buffalo`
- `high-protein`

## Mobile app usage

```ts
const res = await fetch("http://localhost:3000/api/v1/products");
const json = await res.json();
if (json.success) {
  console.log(json.data.products);
}
```

TypeScript types: `src/lib/api/types.ts` and `src/lib/api/response.ts`

Route constants: `API_ROUTES` in `src/lib/api/response.ts`

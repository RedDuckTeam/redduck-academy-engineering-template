# Solution

## Language

language: "typescript"

## The flaw

`createOrder` trusts the caller-supplied `item.price` when computing the order total (`total += item.quantity * item.price`), while completely ignoring the authoritative `CATALOG` defined in the service. Furthermore, unknown product identifiers are never checked against the catalog, allowing callers to place orders with arbitrary or nonexistent SKUs. For an honest buyer whose client copies the price and existing IDs from the catalog, totals look right. For a rational, self-interested buyer or attacker, the design lets the buyer dictate their own prices and buy unverified items.

### Concrete exploit steps

1. Inspect the catalog: `"sku-blue-tshirt"` costs `2000` cents (USD 20.00) and `"sku-red-mug"` costs `900` cents (USD 9.00).
2. Instead of paying the catalog price, submit an order request with a forged unit price:
   ```ts
   createOrder("order-1", {
     items: [{ productId: "sku-blue-tshirt", quantity: 1, price: 1 }],
   });
   ```
3. `createOrder` never consults `CATALOG["sku-blue-tshirt"]`; it multiplies `1 * 1` and persists `{ id: "order-1", items: [...], total: 1 }`.
4. The buyer gets a USD 20.00 Blue T-shirt for 1 cent — or for free by passing `price: 0`, or creates a negative total (`price: -10000`) so the store owes the buyer money.
5. In addition, an attacker can submit nonexistent or malicious product IDs (such as `productId: "unknown-item"` or JavaScript prototype properties like `"constructor"` or `"toString"`). Because `productId` was never checked against `CATALOG`, the order service blindly accepted them and computed totals on fake or corrupted catalog lookups.

Running the common-sense check on quantities also shows that unvalidated `quantity` fields permitted negative quantities (e.g., buying 1 shirt and -2 mugs to offset the bill) or fractional quantities.

## The fix

In `01-common-sense-check/src/`:

1. **Removed `price` from request models (Elimination)**: Separated request items from stored order items. Replaced `OrderItem` in `OrderRequest` with `OrderRequestItem` (`{ productId: string; quantity: number }`), removing `price` from the request contract entirely. Callers can no longer specify prices.
2. **Server-authoritative catalog pricing**: `createOrder` retrieves unit prices exclusively from `CATALOG` (`CATALOG[item.productId].price` in TypeScript/Python and `CATALOG.get(item.productId()).price()` in Java/C#). Fresh `OrderItem` records containing the official catalog price are populated on the server.
3. **Strict rejection of unknown products**: Every `productId` is verified against the catalog before processing (using `Object.hasOwn(CATALOG, item.productId)` in TS, `in CATALOG` in Python, `CATALOG.containsKey(...)` in Java, and `Catalog.TryGetValue(...)` in C#). If a product identifier is not in `CATALOG`, `createOrder` immediately throws an error and rejects the order.
4. **Input and quantity validation**: Validated non-empty order `id`, non-empty `items` list, positive integer quantities (`quantity > 0`), and integer bounds.

### Why the exploit no longer works

- The request models no longer expose a `price` field. Any unrequested `price` sent by an attacker at runtime is discarded; prices are strictly drawn from `CATALOG`.
- Submitting `price: 1`, `0`, or negative values has zero effect; the server charges the exact catalog amount.
- Any order containing an unknown product ID is immediately rejected with an exception and is never stored.
- Negative, zero, fractional, or overflowing quantities are rejected before any calculation occurs.

## Patch or elimination?

For the price-tampering flaw, this fix is an **elimination** — it removed the condition that made the flaw possible rather than merely guarding the input.

- A **patch** would keep `price` on the `OrderRequest` model and add a guard such as `if (item.price !== CATALOG[item.productId].price) throw new Error(...)`.
- **Elimination** removes `price` from `OrderRequestItem` entirely so the client only specifies *what* to buy and *how many* (`productId` and `quantity`), while the server determines *what it costs* from `CATALOG`.

Removing the condition is stronger than guarding it because a guard leaves two competing sources of truth and keeps dangerous authority in the caller's hands. Every present and future endpoint, caller, or downstream service must remember to check the guard, and race conditions (e.g., price updates while an order is in flight) or omitted guards reintroduce the vulnerability. By eliminating `price` from the request model and computing totals strictly from `CATALOG`, the exploit class cannot even be represented in the design.

(For `productId` and `quantity`, the values are legitimately chosen by the buyer and cannot be eliminated from the request, so those inputs are guarded and validated at the boundary.)


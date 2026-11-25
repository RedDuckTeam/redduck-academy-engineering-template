# Solution

## Language

language: "typescript"

## The flaw

`createOrder` trusts the caller-supplied `item.price` when computing the order total (`total += item.quantity * item.price`), while completely ignoring the authoritative `CATALOG` defined in the service. For an honest buyer whose client copies the price from the catalog, totals look right. For a rational, self-interested buyer, the design lets the buyer choose how much to pay.

### Concrete exploit steps

1. Inspect the catalog: `"sku-blue-tshirt"` costs `2000` cents (USD 20.00) and `"sku-red-mug"` costs `900` cents (USD 9.00).
2. Instead of sending the catalog price, submit an order request with a forged unit price:
   ```ts
   createOrder("order-1", {
     items: [{ productId: "sku-blue-tshirt", quantity: 1, price: 1 }],
   });
   ```
3. `createOrder` never consults `CATALOG["sku-blue-tshirt"]`; it multiplies `1 * 1` and persists `{ id: "order-1", items: [...], total: 1 }`.
4. The buyer gets a USD 20.00 Blue T-shirt for 1 cent — or for free by passing `price: 0`, or even creates a negative total (`price: -10000`) so the store owes the buyer money.

Running the same common-sense check on the remaining fields also shows that unchecked `quantity` and `productId` values allow abuse: a negative quantity (such as `1` Blue T-shirt plus `-2` Red mugs -> `2000 - 1800 = 200` cents), a fractional quantity (`0.001`), or a prototype key like `"constructor"` producing `NaN` totals.

## The fix

In `01-common-sense-check/src/checkout.ts`:

1. **Separated request items from stored order items**: Replaced `OrderItem` in `OrderRequest` with `OrderRequestItem` (`{ productId: string; quantity: number }`), removing `price` from the request type altogether. Stored `Order` records still hold `OrderItem` (`{ productId, quantity, price }`) populated by the server.
2. **Derived prices exclusively from `CATALOG`**: `createOrder` looks up `CATALOG[item.productId].price` on the server, computes `total` from that catalog price, and constructs fresh `OrderItem` objects instead of storing `request.items` directly. Even if an untyped caller passes an extra `price` property at runtime, it is ignored and never stored.
3. **Validated the remaining client-chosen inputs**: Verified a non-empty order `id`, at least one item in `request.items`, `Object.hasOwn(CATALOG, item.productId)` (blocking unknown SKUs and prototype keys such as `"toString"` or `"constructor"`), positive integer quantities (`Number.isInteger(item.quantity) && item.quantity > 0`), and `Number.isSafeInteger` bounds on line and order totals.

### Why the exploit no longer works

- TypeScript callers cannot supply a `price` field on `OrderRequestItem`, and any unrequested `price` sent at runtime is completely ignored because `CATALOG` is the sole source of unit prices.
- Submitting `price: 1`, `0`, or `-10000` still charges `2000` cents per `"sku-blue-tshirt"`.
- Negative, zero, fractional, `NaN`, or overflowing quantities and unknown/prototype `productId` values fail validation with an error before any order is stored.

## Patch or elimination?

For the price-tampering flaw, this fix is an **elimination** — it removes the condition that made the flaw possible rather than guarding the input.

- A **patch** would keep `price` on `OrderRequest`'s items and add a check such as `if (item.price !== CATALOG[item.productId].price) throw new Error(...)`.
- **Elimination** removes `price` from `OrderRequestItem` completely so the client only specifies *what* to buy and *how many* (`productId` and `quantity`), while the server determines *what it costs* from `CATALOG`.

Removing the condition is stronger than guarding it because a guard leaves two competing sources of truth and keeps dangerous authority in the caller's hands: every current and future caller, endpoint, or helper must remember to validate `price`, and a race condition (such as a catalog price update during checkout) or an omitted check reopens the bug. By removing `price` from the request contract and reading `CATALOG` directly, there is no client-supplied price left to spoof, drift, or forget to validate — the exploit class cannot be represented in the design. (By contrast, `productId` and `quantity` are legitimately chosen by the buyer and cannot be eliminated from the request, so those fields are validated at the boundary.)

// 01-common-sense-check/src/checkout.ts
// A minimal order service. Fix the flaw. No framework, no build step required.

export interface CatalogEntry { name: string; price: number } // price in cents
export interface OrderRequestItem { productId: string; quantity: number }
export interface OrderRequest { items: OrderRequestItem[] }
export interface OrderItem { productId: string; quantity: number; price: number }
export interface Order { id: string; items: OrderItem[]; total: number }

// Product catalog.
export const CATALOG: Readonly<Record<string, CatalogEntry>> = {
  "sku-blue-tshirt": { name: "Blue T-shirt", price: 2000 },
  "sku-red-mug": { name: "Red mug", price: 900 },
};

const orders: Order[] = [];

// Create an order from a request, store it, and return it.
export function createOrder(id: string, request: OrderRequest): Order {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Order id must be a non-empty string");
  }
  if (!request || !Array.isArray(request.items) || request.items.length === 0) {
    throw new Error("Order request must include at least one item");
  }

  let total = 0;
  const resolvedItems: OrderItem[] = [];

  for (const item of request.items) {
    if (!item || typeof item.productId !== "string" || !Object.hasOwn(CATALOG, item.productId)) {
      throw new Error(`Unknown product: ${String(item?.productId)}`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity for ${item.productId}: ${item.quantity}`);
    }

    const unitPrice = CATALOG[item.productId].price;
    const lineTotal = item.quantity * unitPrice;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) {
      throw new Error("Order total exceeds safe integer range");
    }

    total += lineTotal;
    resolvedItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: unitPrice,
    });
  }

  const order: Order = { id, items: resolvedItems, total };
  orders.push(order);
  return order;
}

// Look up a stored order by its id.
export function getOrder(id: string): Order | undefined {
  for (const order of orders) {
    if (order.id === id) {
      return order;
    }
  }
  return undefined;
}

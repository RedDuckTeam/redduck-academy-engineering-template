# 01-common-sense-check/src/checkout.py
# A minimal order service. Fix the flaw. No framework required.

# Product catalog.
CATALOG = {
    "sku-blue-tshirt": {"name": "Blue T-shirt", "price": 2000},  # price in cents
    "sku-red-mug": {"name": "Red mug", "price": 900},
}

_orders = []


def create_order(order_id, request):
    """request = {"items": [{"productId": str, "quantity": int}, ...]}.
    Creates an order, stores it, and returns it."""
    if not isinstance(order_id, str) or not order_id.strip():
        raise ValueError("Order id must be a non-empty string")
    if not request or "items" not in request or not isinstance(request["items"], list) or len(request["items"]) == 0:
        raise ValueError("Order request must include at least one item")

    total = 0
    resolved_items = []
    for item in request["items"]:
        product_id = item.get("productId") if isinstance(item, dict) else None
        if not product_id or product_id not in CATALOG:
            raise ValueError(f"Unknown product: {product_id}")
        quantity = item.get("quantity")
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
            raise ValueError(f"Invalid quantity for {product_id}: {quantity}")

        unit_price = CATALOG[product_id]["price"]
        total += quantity * unit_price
        resolved_items.append({
            "productId": product_id,
            "quantity": quantity,
            "price": unit_price,
        })

    order = {"id": order_id, "items": resolved_items, "total": total}
    _orders.append(order)
    return order


def get_order(order_id):
    """Look up a stored order by its id."""
    for order in _orders:
        if order["id"] == order_id:
            return order
    return None


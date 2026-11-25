// 01-common-sense-check/src/Checkout.java
// A minimal order service. Fix the flaw. Plain Java, no framework.
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Checkout {
    record CatalogEntry(String name, int price) {} // price in cents
    record OrderRequestItem(String productId, int quantity) {}
    record OrderRequest(List<OrderRequestItem> items) {}
    record OrderItem(String productId, int quantity, int price) {}
    record Order(String id, List<OrderItem> items, int total) {}

    // Product catalog.
    static final Map<String, CatalogEntry> CATALOG = Map.of(
        "sku-blue-tshirt", new CatalogEntry("Blue T-shirt", 2000),
        "sku-red-mug", new CatalogEntry("Red mug", 900)
    );

    static final List<Order> ORDERS = new ArrayList<>();

    // Create an order from a request, store it, and return it.
    static Order createOrder(String id, OrderRequest request) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Order id must be non-empty");
        }
        if (request == null || request.items() == null || request.items().isEmpty()) {
            throw new IllegalArgumentException("Order request must include at least one item");
        }

        int total = 0;
        List<OrderItem> resolvedItems = new ArrayList<>();
        for (OrderRequestItem item : request.items()) {
            if (item == null || item.productId() == null || !CATALOG.containsKey(item.productId())) {
                throw new IllegalArgumentException("Unknown product: " + (item == null ? "null" : item.productId()));
            }
            if (item.quantity() <= 0) {
                throw new IllegalArgumentException("Invalid quantity for " + item.productId() + ": " + item.quantity());
            }

            int unitPrice = CATALOG.get(item.productId()).price();
            total += item.quantity() * unitPrice;
            resolvedItems.add(new OrderItem(item.productId(), item.quantity(), unitPrice));
        }

        Order order = new Order(id, List.copyOf(resolvedItems), total);
        ORDERS.add(order);
        return order;
    }

    // Look up a stored order by its id.
    static Order getOrder(String id) {
        for (Order order : ORDERS) {
            if (order.id().equals(id)) {
                return order;
            }
        }
        return null;
    }
}


// 01-common-sense-check/src/Checkout.cs
// A minimal order service. Fix the flaw. Plain C#, no framework.
using System;
using System.Collections.Generic;

public record CatalogEntry(string Name, int Price); // price in cents
public record OrderRequestItem(string ProductId, int Quantity);
public record OrderRequest(List<OrderRequestItem> Items);
public record OrderItem(string ProductId, int Quantity, int Price);
public record Order(string Id, List<OrderItem> Items, int Total);

public static class Checkout
{
    // Product catalog.
    public static readonly Dictionary<string, CatalogEntry> Catalog = new()
    {
        ["sku-blue-tshirt"] = new CatalogEntry("Blue T-shirt", 2000),
        ["sku-red-mug"] = new CatalogEntry("Red mug", 900),
    };

    static readonly List<Order> Orders = new();

    // Create an order from a request, store it, and return it.
    public static Order CreateOrder(string id, OrderRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException("Order id must be non-empty", nameof(id));
        }
        if (request?.Items == null || request.Items.Count == 0)
        {
            throw new ArgumentException("Order request must include at least one item", nameof(request));
        }

        int total = 0;
        var resolvedItems = new List<OrderItem>();
        foreach (var item in request.Items)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.ProductId) || !Catalog.TryGetValue(item.ProductId, out var catalogEntry))
            {
                throw new ArgumentException($"Unknown product: {item?.ProductId}", nameof(request));
            }
            if (item.Quantity <= 0)
            {
                throw new ArgumentException($"Invalid quantity for {item.ProductId}: {item.Quantity}", nameof(request));
            }

            int unitPrice = catalogEntry.Price;
            total += item.Quantity * unitPrice;
            resolvedItems.Add(new OrderItem(item.ProductId, item.Quantity, unitPrice));
        }

        var order = new Order(id, resolvedItems, total);
        Orders.Add(order);
        return order;
    }

    // Look up a stored order by its id.
    public static Order? GetOrder(string id)
    {
        foreach (var order in Orders)
        {
            if (order.Id == id)
            {
                return order;
            }
        }
        return null;
    }
}


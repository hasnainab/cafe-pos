"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string | null;
  price: number | string;
  active: boolean | null;
};

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
};

type OrderRow = {
  id: number;
  order_number: string;
  status: string;
  total: number | string;
  created_at: string;
  ready_at: string | null;
  customer_id: number | null;
};

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string;
};

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function normalizePhoneForWhatsApp(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("0")) return `92${cleaned.slice(1)}`;
  return cleaned;
}

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  return `ORD-${y}${m}${d}-${h}${min}${s}`;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [activeOrders, setActiveOrders] = useState<
    (OrderRow & { customer: CustomerRow | null })[]
  >([]);
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  async function loadProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load products: ${error.message}`);
      return;
    }

    setProducts(data || []);
    setStatusMessage("Ready");
  }

  async function loadOrders() {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["Preparing", "Ready"])
      .order("created_at", { ascending: false });

    if (ordersError) {
      setStatusMessage(`Could not load orders: ${ordersError.message}`);
      return;
    }

    const orders = ordersData || [];

    const customerIds = orders
      .map((o) => o.customer_id)
      .filter((id): id is number => !!id);

    let customerMap = new Map<number, CustomerRow>();

    if (customerIds.length > 0) {
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);

      (customersData || []).forEach((c) => {
        customerMap.set(c.id, c);
      });
    }

    const merged = orders.map((order) => ({
      ...order,
      customer: order.customer_id ? customerMap.get(order.customer_id) || null : null,
    }));

    setActiveOrders(merged);
  }

  async function loadTodaySummary() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", startOfDay.toISOString());

    if (error) return;

    const rows = data || [];
    setTodayOrders(rows.length);
    setTodaySales(
      rows.reduce((sum, row) => sum + Number(row.total || 0), 0)
    );
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadOrders(), loadTodaySummary()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  function addToCart(product: Product) {
    const price = Number(product.price);

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQty(productId: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  function decreaseQty(productId: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function createOrder() {
    if (!customerPhone.trim()) {
      alert("Please enter customer phone number.");
      return;
    }

    if (cart.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    setSaving(true);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .insert({
          name: customerName || null,
          phone: customerPhone.trim(),
        })
        .select()
        .single();

      if (customerError) {
        alert(customerError.message);
        setSaving(false);
        return;
      }

      const orderNumber = generateOrderNumber();

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: customerData.id,
          status: "Preparing",
          subtotal: cartTotal,
          total: cartTotal,
        })
        .select()
        .single();

      if (orderError) {
        alert(orderError.message);
        setSaving(false);
        return;
      }

      const itemsToInsert = cart.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        alert(itemsError.message);
        setSaving(false);
        return;
      }

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setStatusMessage(`Order ${orderNumber} created successfully.`);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function markReadyAndOpenWhatsApp(
    order: OrderRow & { customer: CustomerRow | null }
  ) {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "Ready",
        ready_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      alert(error.message);
      return;
    }

    const customerPhone = order.customer?.phone || "";
    const normalizedPhone = normalizePhoneForWhatsApp(customerPhone);

    const message = `Hello${
      order.customer?.name ? " " + order.customer.name : ""
    }, your order ${order.order_number} is ready for pickup. Please collect it from the counter.`;

    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");

    await refreshAll();
  }

  async function markCollected(orderId: number) {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "Collected",
      })
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshAll();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cafe POS</h1>
            <p className="text-slate-600">Counter order entry and WhatsApp ready queue</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">Today Orders</div>
              <div className="text-2xl font-bold">{todayOrders}</div>
            </div>
            <div className="rounded-xl border bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">Today Sales</div>
              <div className="text-2xl font-bold">{formatCurrency(todaySales)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="font-medium">{statusMessage}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Menu</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="rounded-xl border p-4 text-left transition hover:bg-slate-50"
                >
                  <div className="font-semibold">{product.name}</div>
                  <div className="text-sm text-slate-500">
                    {product.category || "-"}
                  </div>
                  <div className="mt-2 text-lg font-bold">
                    {formatCurrency(Number(product.price))}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Cart</h2>

            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Customer Name</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Phone Number</label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="03001234567"
                />
              </div>
            </div>

            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-slate-500">No items added yet.</p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="rounded-xl border p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-slate-500">
                          {formatCurrency(item.price)} each
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(item.product_id)}
                          className="rounded-lg border px-3 py-1"
                        >
                          -
                        </button>
                        <span className="min-w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => increaseQty(item.product_id)}
                          className="rounded-lg border px-3 py-1"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-xl border bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>

            <button
              onClick={createOrder}
              disabled={saving}
              className="mt-4 w-full rounded-xl bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving Order..." : "Create Order"}
            </button>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Active Orders</h2>

            <div className="space-y-3">
              {activeOrders.length === 0 ? (
                <p className="text-slate-500">No active orders yet.</p>
              ) : (
                activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-bold">{order.order_number}</div>
                        <div className="text-sm text-slate-500">
                          {order.customer?.name || "Guest"} | {order.customer?.phone || "-"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatTime(order.created_at)}
                        </div>
                        <div className="mt-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-2 font-semibold">
                          {formatCurrency(Number(order.total))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {order.status !== "Ready" && (
                        <button
                          onClick={() => markReadyAndOpenWhatsApp(order)}
                          className="rounded-xl bg-green-600 px-4 py-2 font-medium text-white"
                        >
                          Ready + WhatsApp
                        </button>
                      )}

                      <button
                        onClick={() => markCollected(order.id)}
                        className="rounded-xl border px-4 py-2"
                      >
                        Mark Collected
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
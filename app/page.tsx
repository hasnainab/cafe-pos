"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  name: string;
  category: string | null;
  price: number;
  active: boolean | null;
};

type CartItem = {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
};

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string;
};

type OrderItemRow = {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type ActiveOrder = {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  ready_at: string | null;
  reminder1_sent_at: string | null;
  reminder2_sent_at: string | null;
  collected_at: string | null;
  customer_id: number | null;
  customer: CustomerRow | null;
  items: OrderItemRow[];
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

function formatDurationFromSeconds(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}m ${seconds}s`;
}

function getElapsedSeconds(start: string, end?: string | null) {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

    const safeProducts: Product[] = (data || []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name),
      category: item.category ?? null,
      price: Number(item.price),
      active: item.active ?? null,
    }));

    setProducts(safeProducts);
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

    const rawOrders: any[] = ordersData || [];

    const customerIds = rawOrders
      .map((o) => o.customer_id)
      .filter((id) => id !== null && id !== undefined);

    const orderIds = rawOrders.map((o) => o.id);

    const customerMap = new Map<number, CustomerRow>();
    const itemsMap = new Map<number, OrderItemRow[]>();

    if (customerIds.length > 0) {
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);

      if (!customersError) {
        (customersData || []).forEach((c: any) => {
          customerMap.set(Number(c.id), {
            id: Number(c.id),
            name: c.name ?? null,
            phone: String(c.phone),
          });
        });
      }
    }

    if (orderIds.length > 0) {
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      if (!orderItemsError) {
        (orderItemsData || []).forEach((item: any) => {
          const orderId = Number(item.order_id);
          const current = itemsMap.get(orderId) || [];
          current.push({
            product_name: String(item.product_name),
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
          });
          itemsMap.set(orderId, current);
        });
      }
    }

    const merged: ActiveOrder[] = rawOrders.map((order: any) => ({
      id: Number(order.id),
      order_number: String(order.order_number),
      status: String(order.status),
      total: Number(order.total || 0),
      created_at: String(order.created_at),
      ready_at: order.ready_at ?? null,
      reminder1_sent_at: order.reminder1_sent_at ?? null,
      reminder2_sent_at: order.reminder2_sent_at ?? null,
      collected_at: order.collected_at ?? null,
      customer_id:
        order.customer_id === null || order.customer_id === undefined
          ? null
          : Number(order.customer_id),
      customer:
        order.customer_id === null || order.customer_id === undefined
          ? null
          : customerMap.get(Number(order.customer_id)) || null,
      items: itemsMap.get(Number(order.id)) || [],
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

    const rows: any[] = data || [];
    setTodayOrders(rows.length);
    setTodaySales(rows.reduce((sum, row) => sum + Number(row.total || 0), 0));
  }

  async function refreshAll() {
    await Promise.all([loadProducts(), loadOrders(), loadTodaySummary()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  function addToCart(product: Product) {
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
          price: Number(product.price),
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

      if (customerError || !customerData) {
        alert(customerError?.message || "Could not create customer.");
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

      if (orderError || !orderData) {
        alert(orderError?.message || "Could not create order.");
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

  async function markReadyAndOpenWhatsApp(order: ActiveOrder) {
    const readyTimestamp = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "Ready",
        ready_at: readyTimestamp,
      })
      .eq("id", order.id);

    if (error) {
      alert(error.message);
      return;
    }

    const phone = order.customer?.phone || "";
    const normalizedPhone = normalizePhoneForWhatsApp(phone);

    const message = `Hello${
      order.customer?.name ? " " + order.customer.name : ""
    }, your order ${order.order_number} is ready for pickup. Please collect it from the counter.`;

    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");
    await refreshAll();
  }

  async function sendReminder1(order: ActiveOrder) {
    const { error } = await supabase
      .from("orders")
      .update({
        reminder1_sent_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      alert(error.message);
      return;
    }

    const phone = order.customer?.phone || "";
    const normalizedPhone = normalizePhoneForWhatsApp(phone);

    const message = `Hello${
      order.customer?.name ? " " + order.customer.name : ""
    }, your order ${order.order_number} is ready and waiting for pickup at the counter. Please collect it when convenient.`;

    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");
    await refreshAll();
  }

  async function sendReminder2(order: ActiveOrder) {
    const { error } = await supabase
      .from("orders")
      .update({
        reminder2_sent_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (error) {
      alert(error.message);
      return;
    }

    const phone = order.customer?.phone || "";
    const normalizedPhone = normalizePhoneForWhatsApp(phone);

    const message = `Hello${
      order.customer?.name ? " " + order.customer.name : ""
    }, this is a reminder that your order ${order.order_number} is still waiting for pickup at the counter. Please collect it as soon as possible.`;

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
        collected_at: new Date().toISOString(),
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
            <p className="text-slate-600">
              Counter order entry and WhatsApp ready queue
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">Today Orders</div>
              <div className="text-2xl font-bold">{todayOrders}</div>
            </div>
            <div className="rounded-xl border bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">Today Sales</div>
              <div className="text-2xl font-bold">
                {formatCurrency(todaySales)}
              </div>
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
                    {formatCurrency(product.price)}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Cart</h2>

            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Customer Name
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Phone Number
                </label>
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
                  <div key={item.product_id} className="rounded-xl border p-3">
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
                        <span className="min-w-6 text-center">
                          {item.quantity}
                        </span>
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
                activeOrders.map((order) => {
                  const elapsedSeconds =
                    order.status === "Ready" && order.ready_at
                      ? getElapsedSeconds(order.created_at, order.ready_at)
                      : getElapsedSeconds(order.created_at);

                  return (
                    <div key={order.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full">
                          <div className="text-lg font-bold">
                            {order.order_number}
                          </div>

                          <div className="text-sm text-slate-500">
                            {order.customer?.name || "Guest"} |{" "}
                            {order.customer?.phone || "-"}
                          </div>

                          <div className="text-sm text-slate-500">
                            Created: {formatTime(order.created_at)}
                          </div>

                          {order.ready_at && (
                            <div className="text-sm text-slate-500">
                              Ready: {formatTime(order.ready_at)}
                            </div>
                          )}

                          <div className="mt-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                              {order.status}
                            </span>
                          </div>

                          <div className="mt-2 font-semibold">
                            {formatCurrency(order.total)}
                          </div>

                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <div className="font-medium">
                              {order.status === "Ready"
                                ? "Time taken to fulfill"
                                : "Elapsed time"}
                            </div>
                            <div className="text-lg font-bold">
                              {formatDurationFromSeconds(elapsedSeconds)}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                            <div className="mb-2 text-sm font-medium">
                              Order Details
                            </div>
                            {order.items.length === 0 ? (
                              <div className="text-sm text-slate-500">
                                No item details found.
                              </div>
                            ) : (
                              <div className="space-y-1 text-sm">
                                {order.items.map((item, index) => (
                                  <div
                                    key={`${order.id}-${index}`}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <span>
                                      {item.product_name} x {item.quantity}
                                    </span>
                                    <span>{formatCurrency(item.line_total)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {order.reminder1_sent_at && (
                            <div className="mt-2 text-xs text-amber-700">
                              Reminder 1 sent:{" "}
                              {formatTime(order.reminder1_sent_at)}
                            </div>
                          )}

                          {order.reminder2_sent_at && (
                            <div className="mt-1 text-xs text-orange-700">
                              Reminder 2 sent:{" "}
                              {formatTime(order.reminder2_sent_at)}
                            </div>
                          )}
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

                        {order.status === "Ready" && !order.reminder1_sent_at && (
                          <button
                            onClick={() => sendReminder1(order)}
                            className="rounded-xl bg-amber-500 px-4 py-2 font-medium text-white"
                          >
                            Reminder 1
                          </button>
                        )}

                        {order.status === "Ready" &&
                          order.reminder1_sent_at &&
                          !order.reminder2_sent_at && (
                            <button
                              onClick={() => sendReminder2(order)}
                              className="rounded-xl bg-orange-600 px-4 py-2 font-medium text-white"
                            >
                              Reminder 2
                            </button>
                          )}

                        {order.status === "Ready" && order.reminder1_sent_at && (
                          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
                            Reminder 1 sent
                          </div>
                        )}

                        {order.status === "Ready" && order.reminder2_sent_at && (
                          <div className="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm">
                            Reminder 2 sent
                          </div>
                        )}

                        <button
                          onClick={() => markCollected(order.id)}
                          className="rounded-xl border px-4 py-2"
                        >
                          Mark Collected
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
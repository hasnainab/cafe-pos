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

type OrderView = {
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

type TopItem = {
  name: string;
  qty: number;
  sales: number;
};

type ViewMode = "pos" | "history" | "reports";

function formatCurrency(value: number) {
  return `Rs ${value.toFixed(0)}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function normalizePhoneForStorage(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

function normalizePhoneForWhatsApp(phone: string) {
  const cleaned = normalizePhoneForStorage(phone);

  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("0")) return `92${cleaned.slice(1)}`;
  return cleaned;
}

function formatDurationFromSeconds(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function getElapsedSeconds(start: string, end?: string | null) {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function getShortOrderNumber(orderId: number) {
  return `STT-${String(orderId).padStart(6, "0")}`;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("pos");

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [activeOrders, setActiveOrders] = useState<OrderView[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderView[]>([]);

  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayCompletedOrders, setTodayCompletedOrders] = useState(0);
  const [averageFulfillmentSeconds, setAverageFulfillmentSeconds] = useState(0);
  const [topItemsToday, setTopItemsToday] = useState<TopItem[]>([]);

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
  }

  async function buildOrdersWithRelations(rawOrders: any[]): Promise<OrderView[]> {
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

    return rawOrders.map((order: any) => ({
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
  }

  async function loadActiveOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["Preparing", "Ready"])
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMessage(`Could not load active orders: ${error.message}`);
      return;
    }

    const merged = await buildOrdersWithRelations(data || []);
    setActiveOrders(merged);
  }

  async function loadCompletedOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "Collected")
      .order("collected_at", { ascending: false })
      .limit(50);

    if (error) {
      setStatusMessage(`Could not load completed orders: ${error.message}`);
      return;
    }

    const merged = await buildOrdersWithRelations(data || []);
    setCompletedOrders(merged);
  }

  async function loadReportData() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: todayOrderRows, error: todayOrderError } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startOfDay.toISOString());

    if (todayOrderError) return;

    const todayRows: any[] = todayOrderRows || [];

    setTodayOrders(todayRows.length);
    setTodaySales(todayRows.reduce((sum, row) => sum + Number(row.total || 0), 0));

    const completedToday = todayRows.filter((row) => row.status === "Collected");
    setTodayCompletedOrders(completedToday.length);

    const completedWithReady = completedToday.filter(
      (row) => row.ready_at && row.created_at
    );

    if (completedWithReady.length > 0) {
      const totalSeconds = completedWithReady.reduce((sum, row) => {
        return sum + getElapsedSeconds(String(row.created_at), String(row.ready_at));
      }, 0);

      setAverageFulfillmentSeconds(
        Math.floor(totalSeconds / completedWithReady.length)
      );
    } else {
      setAverageFulfillmentSeconds(0);
    }

    const todayOrderIds = todayRows.map((row) => row.id);

    if (todayOrderIds.length === 0) {
      setTopItemsToday([]);
      return;
    }

    const { data: todayItems, error: todayItemsError } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", todayOrderIds);

    if (todayItemsError) {
      setTopItemsToday([]);
      return;
    }

    const itemMap = new Map<string, TopItem>();

    (todayItems || []).forEach((item: any) => {
      const key = String(item.product_name);
      const existing = itemMap.get(key);

      if (existing) {
        existing.qty += Number(item.quantity || 0);
        existing.sales += Number(item.line_total || 0);
      } else {
        itemMap.set(key, {
          name: key,
          qty: Number(item.quantity || 0),
          sales: Number(item.line_total || 0),
        });
      }
    });

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    setTopItemsToday(topItems);
  }

  async function refreshAll() {
    await Promise.all([
      loadProducts(),
      loadActiveOrders(),
      loadCompletedOrders(),
      loadReportData(),
    ]);
    setStatusMessage("Ready");
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
    const normalizedPhone = normalizePhoneForStorage(customerPhone);

    if (!normalizedPhone) {
      alert("Please enter customer phone number.");
      return;
    }

    if (cart.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    setSaving(true);

    try {
      let customerId: number | null = null;

      const { data: existingCustomers, error: existingCustomerError } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", normalizedPhone)
        .order("id", { ascending: false })
        .limit(1);

      if (existingCustomerError) {
        alert(existingCustomerError.message);
        setSaving(false);
        return;
      }

      if (existingCustomers && existingCustomers.length > 0) {
        customerId = Number(existingCustomers[0].id);

        if (customerName.trim()) {
          await supabase
            .from("customers")
            .update({ name: customerName.trim() })
            .eq("id", customerId);
        }
      } else {
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerName.trim() || null,
            phone: normalizedPhone,
          })
          .select()
          .single();

        if (customerError || !customerData) {
          alert(customerError?.message || "Could not create customer.");
          setSaving(false);
          return;
        }

        customerId = Number(customerData.id);
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: `TEMP-${Date.now()}`,
          customer_id: customerId,
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

      const shortOrderNumber = getShortOrderNumber(Number(orderData.id));

      const { error: orderNumberUpdateError } = await supabase
        .from("orders")
        .update({
          order_number: shortOrderNumber,
        })
        .eq("id", orderData.id);

      if (orderNumberUpdateError) {
        alert(orderNumberUpdateError.message);
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
      setStatusMessage(`Order ${shortOrderNumber} created successfully.`);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  }

  async function markReadyAndOpenWhatsApp(order: OrderView) {
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

  async function sendReminder1(order: OrderView) {
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

  async function sendReminder2(order: OrderView) {
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

  function renderOrderCard(order: OrderView, isCompleted = false) {
    const elapsedSeconds =
      order.status === "Ready" && order.ready_at
        ? getElapsedSeconds(order.created_at, order.ready_at)
        : getElapsedSeconds(order.created_at, new Date(nowTick).toISOString());

    return (
      <div key={order.id} className="rounded-xl border p-4">
        <div className="w-full">
          <div className="text-lg font-bold">{order.order_number}</div>

          <div className="text-sm text-slate-500">
            {order.customer?.name || "Guest"} | {order.customer?.phone || "-"}
          </div>

          <div className="text-sm text-slate-500">
            Created: {formatTime(order.created_at)}
          </div>

          {order.ready_at && (
            <div className="text-sm text-slate-500">
              Ready: {formatTime(order.ready_at)}
            </div>
          )}

          {order.collected_at && (
            <div className="text-sm text-slate-500">
              Collected: {formatTime(order.collected_at)}
            </div>
          )}

          <div className="mt-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {order.status}
            </span>
          </div>

          <div className="mt-2 font-semibold">{formatCurrency(order.total)}</div>

          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="font-medium">
              {order.status === "Ready" || order.status === "Collected"
                ? "Time taken to fulfill"
                : "Elapsed time"}
            </div>
            <div className="text-lg font-bold">
              {formatDurationFromSeconds(
                order.ready_at
                  ? getElapsedSeconds(order.created_at, order.ready_at)
                  : elapsedSeconds
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg border bg-slate-50 p-3">
            <div className="mb-2 text-sm font-medium">Order Details</div>
            {order.items.length === 0 ? (
              <div className="text-sm text-slate-500">No item details found.</div>
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
              Reminder 1 sent: {formatTime(order.reminder1_sent_at)}
            </div>
          )}

          {order.reminder2_sent_at && (
            <div className="mt-1 text-xs text-orange-700">
              Reminder 2 sent: {formatTime(order.reminder2_sent_at)}
            </div>
          )}
        </div>

        {!isCompleted && (
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
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cafe POS</h1>
            <p className="text-slate-600">
              Counter POS, completed history, and reporting dashboard
            </p>
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
            <div className="rounded-xl border bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-500">Active Orders</div>
              <div className="text-2xl font-bold">{activeOrders.length}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode("pos")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "pos"
                  ? "bg-black text-white"
                  : "border bg-white text-black"
              }`}
            >
              POS
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "history"
                  ? "bg-black text-white"
                  : "border bg-white text-black"
              }`}
            >
              Completed Orders
            </button>
            <button
              onClick={() => setViewMode("reports")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "reports"
                  ? "bg-black text-white"
                  : "border bg-white text-black"
              }`}
            >
              Reports
            </button>
          </div>

          <p className="font-medium">{statusMessage}</p>
        </div>

        {viewMode === "pos" && (
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
                  activeOrders.map((order) => renderOrderCard(order, false))
                )}
              </div>
            </section>
          </div>
        )}

        {viewMode === "history" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Completed Orders History</h2>

            <div className="space-y-3">
              {completedOrders.length === 0 ? (
                <p className="text-slate-500">No completed orders yet.</p>
              ) : (
                completedOrders.map((order) => renderOrderCard(order, true))
              )}
            </div>
          </section>
        )}

        {viewMode === "reports" && (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Today Orders</div>
                <div className="mt-2 text-3xl font-bold">{todayOrders}</div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Today Sales</div>
                <div className="mt-2 text-3xl font-bold">
                  {formatCurrency(todaySales)}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Completed Today</div>
                <div className="mt-2 text-3xl font-bold">
                  {todayCompletedOrders}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Avg Fulfillment Time Today
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {averageFulfillmentSeconds > 0
                    ? formatDurationFromSeconds(averageFulfillmentSeconds)
                    : "-"}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Top Selling Items Today</h2>

              {topItemsToday.length === 0 ? (
                <p className="text-slate-500">No item sales today yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Qty Sold</th>
                        <th className="px-3 py-2">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItemsToday.map((item) => (
                        <tr key={item.name} className="border-b">
                          <td className="px-3 py-2">{item.name}</td>
                          <td className="px-3 py-2">{item.qty}</td>
                          <td className="px-3 py-2">
                            {formatCurrency(item.sales)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Product = {
  id: number;
  name: string;
  price: number;
  active: boolean | null;
  categories: Category[];
};

type Category = {
  id: number;
  name: string;
  active: boolean | null;
};

type ModifierLibraryItem = {
  id: number;
  name: string;
  price_delta: number;
  active: boolean | null;
};

type CartItem = {
  line_id: string;
  product_id: number;
  name: string;
  base_price: number;
  quantity: number;
  modifiers: ModifierLibraryItem[];
  notes: string;
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
  modifiers_text: string | null;
  notes: string | null;
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

type ViewMode = "pos" | "products" | "history" | "reports";

type ProductForm = {
  id: number | null;
  name: string;
  price: string;
  active: boolean;
  categoryIds: number[];
  modifierIds: number[];
};

type CategoryForm = {
  id: number | null;
  name: string;
  active: boolean;
};

type ModifierForm = {
  id: number | null;
  name: string;
  price_delta: string;
  active: boolean;
};

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

function randomLineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function getNextDailyOrderNumber() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) throw new Error(error.message);

  const nextNumber = (data?.length || 0) + 1;
  return `STT-${String(nextNumber).padStart(6, "0")}`;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("pos");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierLibrary, setModifierLibrary] = useState<ModifierLibraryItem[]>([]);

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

  const [selectedProductForCart, setSelectedProductForCart] = useState<Product | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [lineNotes, setLineNotes] = useState("");

  const [productForm, setProductForm] = useState<ProductForm>({
    id: null,
    name: "",
    price: "",
    active: true,
    categoryIds: [],
    modifierIds: [],
  });

  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    id: null,
    name: "",
    active: true,
  });

  const [modifierForm, setModifierForm] = useState<ModifierForm>({
    id: null,
    name: "",
    price_delta: "",
    active: true,
  });

  const [productModifierMap, setProductModifierMap] = useState<Record<number, number[]>>({});

  const activeProductModifiers = useMemo(() => {
    if (!selectedProductForCart) return [];
    const allowedIds = productModifierMap[selectedProductForCart.id] || [];
    return modifierLibrary.filter(
      (m) => allowedIds.includes(m.id) && m.active !== false
    );
  }, [modifierLibrary, productModifierMap, selectedProductForCart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const modifierTotal = item.modifiers.reduce(
        (modSum, mod) => modSum + Number(mod.price_delta),
        0
      );
      return sum + (item.base_price + modifierTotal) * item.quantity;
    }, 0);
  }, [cart]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load categories: ${error.message}`);
      return;
    }

    const rows: Category[] = (data || []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name),
      active: item.active ?? null,
    }));

    setCategories(rows);
  }

  async function loadModifierLibrary() {
    const { data, error } = await supabase
      .from("modifier_library")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load modifiers: ${error.message}`);
      return;
    }

    const rows: ModifierLibraryItem[] = (data || []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name),
      price_delta: Number(item.price_delta || 0),
      active: item.active ?? null,
    }));

    setModifierLibrary(rows);
  }

  async function loadProducts() {
    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productError) {
      setStatusMessage(`Could not load products: ${productError.message}`);
      return;
    }

    const { data: productCategoryLinks, error: productCategoryLinkError } =
      await supabase.from("product_categories").select("*");

    if (productCategoryLinkError) {
      setStatusMessage(`Could not load product categories: ${productCategoryLinkError.message}`);
      return;
    }

    const { data: productModifierLinks, error: productModifierLinkError } =
      await supabase.from("product_modifier_links").select("*");

    if (productModifierLinkError) {
      setStatusMessage(`Could not load product modifiers: ${productModifierLinkError.message}`);
      return;
    }

    const productToCategoryIds: Record<number, number[]> = {};
    (productCategoryLinks || []).forEach((link: any) => {
      const productId = Number(link.product_id);
      const categoryId = Number(link.category_id);
      if (!productToCategoryIds[productId]) productToCategoryIds[productId] = [];
      productToCategoryIds[productId].push(categoryId);
    });

    const productToModifierIds: Record<number, number[]> = {};
    (productModifierLinks || []).forEach((link: any) => {
      const productId = Number(link.product_id);
      const modifierId = Number(link.modifier_id);
      if (!productToModifierIds[productId]) productToModifierIds[productId] = [];
      productToModifierIds[productId].push(modifierId);
    });

    setProductModifierMap(productToModifierIds);

    const categoryMap = new Map<number, Category>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat));

    const rows: Product[] = (productData || []).map((item: any) => {
      const productId = Number(item.id);
      const categoryIds = productToCategoryIds[productId] || [];
      return {
        id: productId,
        name: String(item.name),
        price: Number(item.price),
        active: item.active ?? null,
        categories: categoryIds
          .map((id) => categoryMap.get(id))
          .filter((cat): cat is Category => !!cat),
      };
    });

    setProducts(rows);
  }

  async function buildOrdersWithRelations(rawOrders: any[]): Promise<OrderView[]> {
    const customerIds = rawOrders
      .map((o) => o.customer_id)
      .filter((id) => id !== null && id !== undefined);

    const orderIds = rawOrders.map((o) => o.id);

    const customerMap = new Map<number, CustomerRow>();
    const itemsMap = new Map<number, OrderItemRow[]>();

    if (customerIds.length > 0) {
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .in("id", customerIds);

      (customersData || []).forEach((c: any) => {
        customerMap.set(Number(c.id), {
          id: Number(c.id),
          name: c.name ?? null,
          phone: String(c.phone),
        });
      });
    }

    if (orderIds.length > 0) {
      const { data: orderItemsData } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      (orderItemsData || []).forEach((item: any) => {
        const orderId = Number(item.order_id);
        const current = itemsMap.get(orderId) || [];
        current.push({
          product_name: String(item.product_name),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_total: Number(item.line_total),
          modifiers_text: item.modifiers_text ?? null,
          notes: item.notes ?? null,
        });
        itemsMap.set(orderId, current);
      });
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

    const { data: todayOrderRows, error } = await supabase
      .from("orders")
      .select("*")
      .gte("created_at", startOfDay.toISOString());

    if (error) return;

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

    const { data: todayItems } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", todayOrderIds);

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

    setTopItemsToday(
      Array.from(itemMap.values()).sort((a, b) => b.qty - a.qty).slice(0, 10)
    );
  }

  async function refreshAll() {
    await Promise.all([
      loadCategories(),
      loadModifierLibrary(),
      loadReportData(),
      loadActiveOrders(),
      loadCompletedOrders(),
    ]);
    await loadProducts();
    setStatusMessage("Ready");
  }

  useEffect(() => {
    refreshAll();
  }, [categories.length]);

  function openProductConfigurator(product: Product) {
    setSelectedProductForCart(product);
    setSelectedModifierIds([]);
    setLineNotes("");
  }

  function toggleModifier(modifierId: number) {
    setSelectedModifierIds((prev) =>
      prev.includes(modifierId)
        ? prev.filter((id) => id !== modifierId)
        : [...prev, modifierId]
    );
  }

  function toggleProductCategory(categoryId: number) {
    setProductForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...prev.categoryIds, categoryId],
    }));
  }

  function toggleProductModifier(modifierId: number) {
    setProductForm((prev) => ({
      ...prev,
      modifierIds: prev.modifierIds.includes(modifierId)
        ? prev.modifierIds.filter((id) => id !== modifierId)
        : [...prev.modifierIds, modifierId],
    }));
  }

  function addConfiguredProductToCart() {
    if (!selectedProductForCart) return;

    const chosenModifiers = modifierLibrary.filter((m) =>
      selectedModifierIds.includes(m.id)
    );

    setCart((prev) => [
      ...prev,
      {
        line_id: randomLineId(),
        product_id: selectedProductForCart.id,
        name: selectedProductForCart.name,
        base_price: selectedProductForCart.price,
        quantity: 1,
        modifiers: chosenModifiers,
        notes: lineNotes.trim(),
      },
    ]);

    setSelectedProductForCart(null);
    setSelectedModifierIds([]);
    setLineNotes("");
  }

  function increaseQty(lineId: string) {
    setCart((prev) =>
      prev.map((item) =>
        item.line_id === lineId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }

  function decreaseQty(lineId: string) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.line_id === lineId ? { ...item, quantity: item.quantity - 1 } : item
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
        return;
      }

      const shortOrderNumber = await getNextDailyOrderNumber();

      const { error: updateOrderError } = await supabase
        .from("orders")
        .update({ order_number: shortOrderNumber })
        .eq("id", orderData.id);

      if (updateOrderError) {
        alert(updateOrderError.message);
        return;
      }

      const itemsToInsert = cart.map((item) => {
        const modifierTotal = item.modifiers.reduce(
          (sum, mod) => sum + Number(mod.price_delta),
          0
        );
        const unitPrice = item.base_price + modifierTotal;

        return {
          order_id: orderData.id,
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: unitPrice,
          line_total: unitPrice * item.quantity,
          modifiers_text:
            item.modifiers.length > 0
              ? item.modifiers
                  .map((mod) =>
                    Number(mod.price_delta) === 0
                      ? mod.name
                      : `${mod.name} (+${formatCurrency(Number(mod.price_delta))})`
                  )
                  .join(", ")
              : null,
          notes: item.notes || null,
        };
      });

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        alert(itemsError.message);
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

  async function saveCategory() {
    if (!categoryForm.name.trim()) {
      alert("Please enter category name.");
      return;
    }

    if (categoryForm.id) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: categoryForm.name.trim(),
          active: categoryForm.active,
        })
        .eq("id", categoryForm.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("categories").insert({
        name: categoryForm.name.trim(),
        active: categoryForm.active,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    setCategoryForm({ id: null, name: "", active: true });
    await refreshAll();
  }

  async function deleteCategory(categoryId: number) {
    if (!window.confirm("Delete this category?")) return;

    await supabase.from("product_categories").delete().eq("category_id", categoryId);

    const { error } = await supabase.from("categories").delete().eq("id", categoryId);
    if (error) {
      alert(error.message);
      return;
    }

    await refreshAll();
  }

  async function saveModifierLibraryItem() {
    if (!modifierForm.name.trim()) {
      alert("Please enter modifier name.");
      return;
    }

    if (modifierForm.id) {
      const { error } = await supabase
        .from("modifier_library")
        .update({
          name: modifierForm.name.trim(),
          price_delta: Number(modifierForm.price_delta || 0),
          active: modifierForm.active,
        })
        .eq("id", modifierForm.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("modifier_library").insert({
        name: modifierForm.name.trim(),
        price_delta: Number(modifierForm.price_delta || 0),
        active: modifierForm.active,
      });

      if (error) {
        alert(error.message);
        return;
      }
    }

    setModifierForm({ id: null, name: "", price_delta: "", active: true });
    await refreshAll();
  }

  async function deleteModifierLibraryItem(modifierId: number) {
    if (!window.confirm("Delete this modifier?")) return;

    await supabase.from("product_modifier_links").delete().eq("modifier_id", modifierId);

    const { error } = await supabase
      .from("modifier_library")
      .delete()
      .eq("id", modifierId);

    if (error) {
      alert(error.message);
      return;
    }

    await refreshAll();
  }

  async function saveProduct() {
    if (!productForm.name.trim() || !productForm.price.trim()) {
      alert("Please enter product name and price.");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      active: productForm.active,
      category: null,
    };

    let productId = productForm.id;

    if (productForm.id) {
      const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", productForm.id);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select()
        .single();

      if (error || !data) {
        alert(error?.message || "Could not create product.");
        return;
      }

      productId = Number(data.id);
    }

    if (!productId) return;

    await supabase.from("product_categories").delete().eq("product_id", productId);
    await supabase.from("product_modifier_links").delete().eq("product_id", productId);

    if (productForm.categoryIds.length > 0) {
      await supabase.from("product_categories").insert(
        productForm.categoryIds.map((categoryId) => ({
          product_id: productId,
          category_id: categoryId,
        }))
      );
    }

    if (productForm.modifierIds.length > 0) {
      await supabase.from("product_modifier_links").insert(
        productForm.modifierIds.map((modifierId) => ({
          product_id: productId,
          modifier_id: modifierId,
        }))
      );
    }

    setProductForm({
      id: null,
      name: "",
      price: "",
      active: true,
      categoryIds: [],
      modifierIds: [],
    });

    await refreshAll();
  }

  async function deleteProduct(productId: number) {
    if (!window.confirm("Delete this product?")) return;

    await supabase.from("product_categories").delete().eq("product_id", productId);
    await supabase.from("product_modifier_links").delete().eq("product_id", productId);

    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) {
      alert(error.message);
      return;
    }

    await refreshAll();
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

    window.open(
      `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    await refreshAll();
  }

  async function sendReminder1(order: OrderView) {
    const { error } = await supabase
      .from("orders")
      .update({ reminder1_sent_at: new Date().toISOString() })
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

    window.open(
      `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
    await refreshAll();
  }

  async function sendReminder2(order: OrderView) {
    const { error } = await supabase
      .from("orders")
      .update({ reminder2_sent_at: new Date().toISOString() })
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

    window.open(
      `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
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
              <div className="space-y-2 text-sm">
                {order.items.map((item, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    className="rounded-lg border bg-white p-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {item.product_name} x {item.quantity}
                      </span>
                      <span>{formatCurrency(item.line_total)}</span>
                    </div>

                    {item.modifiers_text && (
                      <div className="mt-1 text-xs text-slate-600">
                        Modifiers: {item.modifiers_text}
                      </div>
                    )}

                    {item.notes && (
                      <div className="mt-1 text-xs text-slate-600">
                        Notes: {item.notes}
                      </div>
                    )}
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
              User-defined categories, modifiers, notes, history, and reporting
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
                viewMode === "pos" ? "bg-black text-white" : "border bg-white"
              }`}
            >
              POS
            </button>
            <button
              onClick={() => setViewMode("products")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "products" ? "bg-black text-white" : "border bg-white"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "history" ? "bg-black text-white" : "border bg-white"
              }`}
            >
              Completed Orders
            </button>
            <button
              onClick={() => setViewMode("reports")}
              className={`rounded-xl px-4 py-2 font-medium ${
                viewMode === "reports" ? "bg-black text-white" : "border bg-white"
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
                {products
                  .filter((product) => product.active !== false)
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => openProductConfigurator(product)}
                      className="rounded-xl border p-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm text-slate-500">
                        {product.categories.length > 0
                          ? product.categories.map((c) => c.name).join(", ")
                          : "-"}
                      </div>
                      <div className="mt-2 text-lg font-bold">
                        {formatCurrency(product.price)}
                      </div>
                    </button>
                  ))}
              </div>

              {selectedProductForCart && (
                <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">
                        {selectedProductForCart.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        Base price: {formatCurrency(selectedProductForCart.price)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProductForCart(null);
                        setSelectedModifierIds([]);
                        setLineNotes("");
                      }}
                      className="rounded-lg border px-3 py-1"
                    >
                      Close
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Modifiers</div>
                    {activeProductModifiers.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No modifiers for this product.
                      </div>
                    ) : (
                      activeProductModifiers.map((modifier) => (
                        <label
                          key={modifier.id}
                          className="flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedModifierIds.includes(modifier.id)}
                              onChange={() => toggleModifier(modifier.id)}
                            />
                            <span>{modifier.name}</span>
                          </div>
                          <span className="text-sm">
                            {Number(modifier.price_delta) === 0
                              ? "Free"
                              : `+ ${formatCurrency(Number(modifier.price_delta))}`}
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium">
                      Special Instructions
                    </label>
                    <textarea
                      value={lineNotes}
                      onChange={(e) => setLineNotes(e.target.value)}
                      className="min-h-24 w-full rounded-xl border px-3 py-2"
                      placeholder="Examples: more ice, no sugar, allergy"
                    />
                  </div>

                  <button
                    onClick={addConfiguredProductToCart}
                    className="mt-4 rounded-xl bg-black px-4 py-2 font-medium text-white"
                  >
                    Add to Cart
                  </button>
                </div>
              )}
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
                  cart.map((item) => {
                    const modifierTotal = item.modifiers.reduce(
                      (sum, mod) => sum + Number(mod.price_delta),
                      0
                    );
                    const unitPrice = item.base_price + modifierTotal;

                    return (
                      <div key={item.line_id} className="rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-slate-500">
                              {formatCurrency(unitPrice)} each
                            </div>

                            {item.modifiers.length > 0 && (
                              <div className="mt-1 text-xs text-slate-600">
                                Modifiers:{" "}
                                {item.modifiers
                                  .map((mod) =>
                                    Number(mod.price_delta) === 0
                                      ? mod.name
                                      : `${mod.name} (+${formatCurrency(
                                          Number(mod.price_delta)
                                        )})`
                                  )
                                  .join(", ")}
                              </div>
                            )}

                            {item.notes && (
                              <div className="mt-1 text-xs text-slate-600">
                                Notes: {item.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decreaseQty(item.line_id)}
                              className="rounded-lg border px-3 py-1"
                            >
                              -
                            </button>
                            <span className="min-w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => increaseQty(item.line_id)}
                              className="rounded-lg border px-3 py-1"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
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

        {viewMode === "products" && (
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Categories</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Name</label>
                    <input
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, name: e.target.value })
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={categoryForm.active}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, active: e.target.checked })
                      }
                    />
                    <span>Active</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={saveCategory}
                      className="rounded-xl bg-black px-4 py-2 font-medium text-white"
                    >
                      {categoryForm.id ? "Update Category" : "Add Category"}
                    </button>
                    <button
                      onClick={() => setCategoryForm({ id: null, name: "", active: true })}
                      className="rounded-xl border px-4 py-2"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span>
                        {category.name} | {category.active === false ? "Inactive" : "Active"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setCategoryForm({
                              id: category.id,
                              name: category.name,
                              active: category.active !== false,
                            })
                          }
                          className="rounded-lg border px-3 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          className="rounded-lg border px-3 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Modifier Library</h2>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Name</label>
                    <input
                      value={modifierForm.name}
                      onChange={(e) =>
                        setModifierForm({ ...modifierForm, name: e.target.value })
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="More Ice, No Sugar, Extra Shot"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Price Change
                    </label>
                    <input
                      value={modifierForm.price_delta}
                      onChange={(e) =>
                        setModifierForm({ ...modifierForm, price_delta: e.target.value })
                      }
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="0 or 50"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={modifierForm.active}
                      onChange={(e) =>
                        setModifierForm({ ...modifierForm, active: e.target.checked })
                      }
                    />
                    <span>Active</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={saveModifierLibraryItem}
                      className="rounded-xl bg-black px-4 py-2 font-medium text-white"
                    >
                      {modifierForm.id ? "Update Modifier" : "Add Modifier"}
                    </button>
                    <button
                      onClick={() =>
                        setModifierForm({
                          id: null,
                          name: "",
                          price_delta: "",
                          active: true,
                        })
                      }
                      className="rounded-xl border px-4 py-2"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {modifierLibrary.map((modifier) => (
                    <div
                      key={modifier.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <span>
                        {modifier.name} |{" "}
                        {Number(modifier.price_delta) === 0
                          ? "Free"
                          : formatCurrency(Number(modifier.price_delta))}{" "}
                        | {modifier.active === false ? "Inactive" : "Active"}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setModifierForm({
                              id: modifier.id,
                              name: modifier.name,
                              price_delta: String(modifier.price_delta),
                              active: modifier.active !== false,
                            })
                          }
                          className="rounded-lg border px-3 py-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteModifierLibraryItem(modifier.id)}
                          className="rounded-lg border px-3 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Add / Edit Product</h2>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Name</label>
                    <input
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm({ ...productForm, name: e.target.value })
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Price</label>
                    <input
                      value={productForm.price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, price: e.target.value })
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={productForm.active}
                      onChange={(e) =>
                        setProductForm({ ...productForm, active: e.target.checked })
                      }
                    />
                    <span>Active</span>
                  </label>

                  <div className="rounded-xl border p-3">
                    <div className="mb-2 font-medium">Categories</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {categories
                        .filter((category) => category.active !== false)
                        .map((category) => (
                          <label key={category.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={productForm.categoryIds.includes(category.id)}
                              onChange={() => toggleProductCategory(category.id)}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="mb-2 font-medium">Allowed Modifiers</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {modifierLibrary
                        .filter((modifier) => modifier.active !== false)
                        .map((modifier) => (
                          <label key={modifier.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={productForm.modifierIds.includes(modifier.id)}
                              onChange={() => toggleProductModifier(modifier.id)}
                            />
                            <span>
                              {modifier.name}{" "}
                              {Number(modifier.price_delta) === 0
                                ? "(Free)"
                                : `(+${formatCurrency(Number(modifier.price_delta))})`}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={saveProduct}
                      className="rounded-xl bg-black px-4 py-2 font-medium text-white"
                    >
                      {productForm.id ? "Update Product" : "Add Product"}
                    </button>
                    <button
                      onClick={() =>
                        setProductForm({
                          id: null,
                          name: "",
                          price: "",
                          active: true,
                          categoryIds: [],
                          modifierIds: [],
                        })
                      }
                      className="rounded-xl border px-4 py-2"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Products</h2>

                <div className="space-y-3">
                  {products.length === 0 ? (
                    <p className="text-slate-500">No products found.</p>
                  ) : (
                    products.map((product) => {
                      const allowedModifierIds = productModifierMap[product.id] || [];
                      const allowedModifiers = modifierLibrary.filter((m) =>
                        allowedModifierIds.includes(m.id)
                      );

                      return (
                        <div key={product.id} className="rounded-xl border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <div className="font-semibold">{product.name}</div>
                              <div className="text-sm text-slate-500">
                                {formatCurrency(product.price)} |{" "}
                                {product.active === false ? "Inactive" : "Active"}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Categories:{" "}
                                {product.categories.length > 0
                                  ? product.categories.map((c) => c.name).join(", ")
                                  : "-"}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                Modifiers:{" "}
                                {allowedModifiers.length > 0
                                  ? allowedModifiers.map((m) => m.name).join(", ")
                                  : "-"}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setProductForm({
                                    id: product.id,
                                    name: product.name,
                                    price: String(product.price),
                                    active: product.active !== false,
                                    categoryIds: product.categories.map((c) => c.id),
                                    modifierIds: allowedModifierIds,
                                  })
                                }
                                className="rounded-xl border px-4 py-2"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteProduct(product.id)}
                                className="rounded-xl border px-4 py-2"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
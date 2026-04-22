"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuth } from "../lib/auth";
import type { StaffProfile } from "../lib/auth";
import { supabase } from "../lib/supabase";
import {
  buildKitchenHtml,
  buildReceiptHtml,
  buildStickerHtml,
  expandDrinkStickers,
} from "../lib/print-helpers";

type Category = {
  id: string;
  name: string;
  active: boolean | null;
};

type ModifierLibraryItem = {
  id: number;
  name: string;
  price_delta: number;
  active: boolean | null;
};

type PaymentMethod = {
  id: number;
  name: string;
  active: boolean | null;
};

type SalesTax = {
  id: number;
  name: string;
  rate_percent: number;
  active: boolean | null;
};

type LoyaltyPromotion = {
  id: number;
  name: string;
  start_at: string;
  end_at: string;
  multiplier: number;
  active: boolean | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  active: boolean | null;
  categories: Category[];
};

type CartItem = {
  line_id: string;
  product_id: number;
  name: string;
  base_price: number;
  quantity: number;
  modifiers: ModifierLibraryItem[];
  notes: string;
  pricing_mode: "normal" | "discounted" | "complimentary";
  discounted_unit_price: number | null;
};

type CustomerRow = {
  id: number;
  name: string | null;
  phone: string;
  reward_points: number;
  lifetime_eligible_spend: number;
  manual_bonus_percent: number;
};

type OrderItemRow = {
  product_id?: number | null;
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
  subtotal: number;
  tax_total: number;
  discount_total: number;
  points_earned: number;
  points_redeemed: number;
  eligible_subtotal: number;
  non_eligible_subtotal: number;
  effective_reward_percent: number;
  reward_multiplier: number;
  created_at: string;
  ready_at: string | null;
  reminder1_sent_at: string | null;
  reminder2_sent_at: string | null;
  collected_at: string | null;
  customer_id: number | null;
  customer: CustomerRow | null;
  items: OrderItemRow[];
  payment_method_id: number | null;
  payment_method_name: string | null;
};

type TopItem = {
  name: string;
  qty: number;
  sales: number;
};

type CustomerLedgerEntry = {
  id: number;
  entry_type: string;
  points: number;
  note: string | null;
  created_at: string;
};

type CustomerSummary = {
  customer: CustomerRow;
  total_visits: number;
  total_spend: number;
  last_visit: string | null;
  total_points_earned: number;
  total_points_redeemed: number;
};

type ViewMode = "pos" | "active" | "setup" | "inventory" | "audit" | "recipes" | "customers" | "campaigns" | "history" | "profitability" | "reports" | "dayClose" | "reorder" | "recipePricing";

type ProductForm = {
  id: number | null;
  name: string;
  price: string;
  active: boolean;
  categoryIds: string[];
  modifierIds: number[];
};

type CategoryForm = {
  id: string | null;
  name: string;
  active: boolean;
};

type ModifierForm = {
  id: number | null;
  name: string;
  price_delta: string;
  active: boolean;
  inventory_effect_item_id: string;
  inventory_effect_unit: string;
  inventory_effect_quantity: string;
};

type ModifierInventoryEffect = {
  modifier_id: number;
  inventory_item_id: number;
  quantity_delta: number;
  deduction_unit: string;
};

type PaymentMethodForm = {
  id: number | null;
  name: string;
  active: boolean;
  salesTaxIds: number[];
};

type SalesTaxForm = {
  id: number | null;
  name: string;
  rate_percent: string;
  active: boolean;
};

type PromotionForm = {
  id: number | null;
  name: string;
  start_at: string;
  end_at: string;
  multiplier: string;
  active: boolean;
};

type Vendor = {
  id: number;
  vendor_name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  active: boolean | null;
};

type InventoryItemCategory = {
  id: number;
  category_name: string;
  active: boolean | null;
};

type InventoryItem = {
  id: number;
  item_name: string;
  sku: string | null;
  unit: string;
  item_type: string;
  measurement_mode: string | null;
  case_size_each: number | null;
  category_id: number | null;
  category_name: string | null;
  default_vendor_id: number | null;
  default_vendor_name: string | null;
  current_stock: number;
  low_stock_threshold: number;
  reorder_level: number;
  active: boolean | null;
};

type VendorShipmentSummary = {
  id: number;
  vendor_id: number;
  vendor_name: string;
  shipment_number: string | null;
  invoice_number: string | null;
  delivery_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  payment_status: string;
  fully_paid_at: string | null;
};

type VendorShipmentLineRow = {
  id: number;
  shipment_id: number;
  inventory_item_id: number;
  quantity: number;
  unit_cost: number | null;
  line_total: number;
  supply_model: string;
  revenue_share_percent: number | null;
  expiry_date: string | null;
};

type OrderCostRow = {
  order_id: number;
  actual_cogs: number;
  gross_profit: number;
  deducted_at: string | null;
  notes: string | null;
};

type InventoryMovementRow = {
  id: number;
  inventory_item_id: number;
  order_id: number | null;
  product_id: number | null;
  product_name: string | null;
  movement_type: string;
  quantity_change: number;
  unit: string | null;
  batch_id: number | null;
  unit_cost: number;
  line_cost: number;
  note: string | null;
  created_at: string | null;
};

type InventoryCostSummary = {
  latest_unit_cost: number;
  previous_unit_cost: number;
  average_unit_cost: number;
  last_purchase_date: string | null;
  total_purchased_qty: number;
};

type InventoryPurchaseHistoryRow = {
  shipment_line_id: number;
  shipment_id: number;
  inventory_item_id: number;
  quantity: number;
  unit_cost: number;
  line_total: number;
  supply_model: string;
  expiry_date: string | null;
  shipment_date: string | null;
  vendor_name: string | null;
  invoice_number: string | null;
  shipment_number: string | null;
};

type StockAuditRow = {
  id: number;
  audit_date: string;
  audit_mode: "opening" | "closing";
  notes: string | null;
  created_at: string | null;
};

type StockAuditLineRow = {
  id: number;
  audit_id: number;
  inventory_item_id: number;
  display_unit: string;
  opening_stock_raw: number;
  purchases_raw: number;
  sales_raw: number;
  adjustments_raw: number;
  system_stock_raw: number;
  actual_stock_raw: number;
  variance_raw: number;
  wastage_raw: number;
  damages_raw: number;
  variance_reason: string | null;
  note: string | null;
};

type StockAuditEditorRow = {
  inventory_item_id: number;
  item_name: string;
  display_unit: string;
  opening_stock_display: number;
  purchases_display: number;
  sales_display: number;
  adjustments_display: number;
  system_stock_display: number;
  actual_stock_input: string;
  variance_display: number;
  wastage_input: string;
  damages_input: string;
  variance_reason: string;
  note: string;
};


type FixedCostRow = {
  id: string;
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
};

type ProductRecipeDbRow = {
  id: number;
  product_id: number;
  inventory_item_id: number;
  quantity_required: number;
  wastage_percent: number;
};

type RecipeEditorRow = {
  row_id: string;
  inventory_item_id: string;
  recipe_unit: string;
  quantity_input: string;
  wastage_percent: string;
};

function makeRecipeEditorRow(seed: number): RecipeEditorRow {
  return {
    row_id: `recipe-row-${Date.now()}-${seed}`,
    inventory_item_id: "",
    recipe_unit: "",
    quantity_input: "",
    wastage_percent: "0",
  };
}



type VendorPaymentRow = {
  id: number;
  vendor_id: number;
  vendor_name: string;
  shipment_id: number | null;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
};

type VendorPayableRow = {
  id: number;
  vendor_id: number;
  shipment_id: number | null;
  amount_total: number;
  amount_paid: number;
  amount_outstanding: number;
  status: string;
};

type InventoryBatchRow = {
  id: number;
  inventory_item_id: number;
  item_name: string;
  vendor_id: number | null;
  vendor_name: string | null;
  shipment_id: number | null;
  batch_code: string | null;
  delivery_date: string;
  expiry_date: string | null;
  quantity_received: number;
  quantity_remaining: number;
  status: string;
};

type VendorForm = {
  id: number | null;
  vendor_name: string;
  contact_person: string;
  phone: string;
  email: string;
  payment_terms: string;
  active: boolean;
};

type InventoryItemForm = {
  id: number | null;
  item_name: string;
  sku: string;
  unit: string;
  item_type: string;
  measurement_mode: string;
  case_size_each: string;
  category_id: number | null;
  default_vendor_id: number | null;
  current_stock: string;
  low_stock_threshold: string;
  reorder_level: string;
  active: boolean;
};

type InventoryCategoryForm = {
  category_name: string;
};

type ShipmentLineForm = {
  inventory_item_id: number | null;
  quantity: string;
  unit_cost: string;
  line_total: string;
  batch_code: string;
  expiry_date: string;
  supply_model: string;
};

type ShipmentForm = {
  vendor_id: number | null;
  shipment_number: string;
  invoice_number: string;
  delivery_date: string;
  notes: string;
};

type VendorPaymentForm = {
  vendor_id: number | null;
  shipment_id: number | null;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
};

type AllowedRole = "admin" | "manager" | "cashier";

type StockIntakeRowForm = {
  row_id: string;
  inventory_item_id: string;
  item_search: string;
  new_item_name: string;
  vendor_id: string;
  vendor_search: string;
  new_vendor_name: string;
  price: string;
  packing_qty_number: string;
  packing_qty_unit: string;
  number_of_packs: string;
  one_unit_size_number: string;
  one_unit_size_unit: string;
  inventory_category_id: string;
  item_type: "ingredient" | "finished_product";
  supply_model: "buy_out" | "credit_purchase" | "percentage_of_sales" | "consignment";
  expiry_date: string;
  unit_mode: "single_unit" | "pack";
  total_qty: string;
  qty_per_pack: string;
  cost_or_percent: string;
};

function makeStockIntakeRow(seed: number): StockIntakeRowForm {
  return {
    row_id: `stock-intake-${Date.now()}-${seed}`,
    inventory_item_id: "",
    item_search: "",
    new_item_name: "",
    vendor_id: "",
    vendor_search: "",
    new_vendor_name: "",
    price: "",
    packing_qty_number: "",
    packing_qty_unit: "eaches",
    number_of_packs: "",
    one_unit_size_number: "1",
    one_unit_size_unit: "eaches",
    inventory_category_id: "",
    item_type: "ingredient",
    supply_model: "buy_out",
    expiry_date: "",
    unit_mode: "single_unit",
    total_qty: "",
    qty_per_pack: "",
    cost_or_percent: "",
  };
}


type InventoryBatchRowForm = {
  row_id: string;
  selected_item_id: string;
  new_item_name: string;
  unit_mode: "single_unit" | "pack";
  total_qty: string;
  qty_per_pack: string;
  number_of_packs: string;
  inventory_category_id: string;
  new_inventory_category_name: string;
  item_type: "ingredient" | "finished_product";
  reorder_threshold: string;
  default_vendor_id: string;
};

function makeInventoryBatchRow(idSeed: number): InventoryBatchRowForm {
  return {
    row_id: `inv-row-${Date.now()}-${idSeed}`,
    selected_item_id: "new",
    new_item_name: "",
    unit_mode: "single_unit",
    total_qty: "",
    qty_per_pack: "",
    number_of_packs: "",
    inventory_category_id: "",
    new_inventory_category_name: "",
    item_type: "ingredient",
    reorder_threshold: "",
    default_vendor_id: "",
  };
}

function normalizeRole(role: string | null | undefined): AllowedRole {
  if (role === "admin" || role === "manager" || role === "cashier") return role;
  return "cashier";
}

function formatCurrency(value: number) {
  return `Rs ${Number(value || 0).toFixed(0)}`;
}

function formatSmallCurrency(value: number) {
  const num = Number(value || 0);
  if (num === 0) return "Rs 0";
  if (Math.abs(num) >= 1) return `Rs ${num.toFixed(2)}`;
  return `Rs ${num.toFixed(4)}`;
}

function formatConvertedCurrency(value: number) {
  const num = Number(value || 0);
  if (num === 0) return "Rs 0";
  if (Math.abs(num) < 1) return `Rs ${num.toFixed(4)}`;
  if (Number.isInteger(num)) return `Rs ${num.toFixed(0)}`;
  return `Rs ${num.toFixed(2)}`;
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatDateTime(value: string | null | undefined) {
  return formatTime(value);
}

function escapeCsvValue(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const needsQuotes = raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r");
  if (!needsQuotes) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function normalizePhoneForStorage(phone: string) {
  return phone.replace(/[^\d+]/g, "").trim();
}

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

function getPhoneLookupCandidates(phone: string) {
  const raw = normalizePhoneForStorage(phone);
  const digits = digitsOnly(raw);
  const candidates = new Set<string>();

  if (raw) candidates.add(raw);
  if (digits) candidates.add(digits);
  if (raw.startsWith("+")) candidates.add(raw.slice(1));
  if (raw.startsWith("00")) candidates.add(raw.slice(2));
  if (digits.startsWith("00")) candidates.add(digits.slice(2));

  if (digits.startsWith("92")) {
    candidates.add(`+${digits}`);
    candidates.add(`0${digits.slice(2)}`);
    candidates.add(digits.slice(2));
  }

  if (digits.startsWith("0")) {
    candidates.add(`92${digits.slice(1)}`);
    candidates.add(`+92${digits.slice(1)}`);
    candidates.add(digits.slice(1));
  }

  if (digits.length === 10 && !digits.startsWith("92")) {
    candidates.add(`0${digits}`);
    candidates.add(`92${digits}`);
    candidates.add(`+92${digits}`);
  }

  return Array.from(candidates).filter(Boolean);
}

function normalizePhoneForWhatsApp(phone: string) {
  const cleaned = normalizePhoneForStorage(phone);
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("00")) return cleaned.slice(2);
  if (cleaned.startsWith("0")) return `92${cleaned.slice(1)}`;
  return cleaned;
}

function formatDurationFromSeconds(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
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
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const prefix = `STT-${dd}-`;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select("order_number, created_at")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) throw new Error(error.message);

  const maxSerial = (data || []).reduce((max, row: any) => {
    const orderNumber = String(row.order_number || "");
    if (!orderNumber.startsWith(prefix)) return max;
    const serialPart = orderNumber.slice(prefix.length);
    const parsed = Number(serialPart);
    if (!Number.isFinite(parsed)) return max;
    return Math.max(max, parsed);
  }, 0);

  const nextSerial = maxSerial + 1;
  return `${prefix}${String(nextSerial).padStart(4, "0")}`;
}

function getTierRateFromSpend(lifetimeEligibleSpend: number) {
  const increments = Math.floor(Math.max(0, lifetimeEligibleSpend) / 15000);
  return Math.min(5 + increments, 10);
}

function getEffectiveRewardRate(
  lifetimeEligibleSpend: number,
  manualBonusPercent: number
) {
  return Math.min(
    getTierRateFromSpend(lifetimeEligibleSpend) + Math.max(0, manualBonusPercent),
    10
  );
}

async function applyInventoryDeductionAndCogs({
  orderId,
  orderTotal,
  inventoryItems,
  supabase,
}: {
  orderId: number;
  orderTotal: number;
  products: Array<{ id: number; name: string }>;
  inventoryItems: Array<{ id: number; item_name: string; unit: string }>;
  supabase: any;
}) {
  try {
    const { data: existingCost } = await supabase
      .from("order_costs")
      .select("order_id, actual_cogs, gross_profit")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingCost) {
      return {
        applied: true,
        actualCogs: Number(existingCost.actual_cogs || 0),
        grossProfit: Number(existingCost.gross_profit || 0),
      };
    }

    const { data: orderItems, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, product_id, product_name, quantity, modifiers_text")
      .eq("order_id", orderId);

    if (orderItemsError) throw new Error(orderItemsError.message);
    if (!orderItems || orderItems.length === 0) {
      return { applied: false, actualCogs: 0, grossProfit: Number(orderTotal || 0) };
    }

    const productIds = Array.from(
      new Set(
        orderItems
          .map((item: any) => item.product_id)
          .filter((id: any) => id != null)
      )
    );

    if (productIds.length === 0) {
      await supabase.from("order_costs").insert({
        order_id: orderId,
        actual_cogs: 0,
        gross_profit: Number(orderTotal || 0),
        deducted_at: new Date().toISOString(),
        notes: "No product ids found on order items",
      });
      return { applied: false, actualCogs: 0, grossProfit: Number(orderTotal || 0) };
    }

    const { data: recipes, error: recipeError } = await supabase
      .from("product_recipes")
      .select("product_id, inventory_item_id, quantity_required, wastage_percent")
      .in("product_id", productIds);

    if (recipeError) throw new Error(recipeError.message);
    if (!recipes || recipes.length === 0) {
      await supabase.from("order_costs").insert({
        order_id: orderId,
        actual_cogs: 0,
        gross_profit: Number(orderTotal || 0),
        deducted_at: new Date().toISOString(),
        notes: "No product recipe configured",
      });
      return { applied: false, actualCogs: 0, grossProfit: Number(orderTotal || 0) };
    }

    let actualCogs = 0;
    const movementRows: any[] = [];

    const { data: modifierRows } = await supabase
      .from("modifier_library")
      .select("id, name");

    let modifierEffectRows: Array<{ modifier_id: number; inventory_item_id: number; quantity_delta: number; deduction_unit: string }> = [];
    const { data: modifierEffectsData, error: modifierEffectsError } = await supabase
      .from("modifier_inventory_effects")
      .select("modifier_id, inventory_item_id, quantity_delta, deduction_unit");

    if (!modifierEffectsError && Array.isArray(modifierEffectsData)) {
      modifierEffectRows = modifierEffectsData.map((row: any) => ({
        modifier_id: Number(row.modifier_id),
        inventory_item_id: Number(row.inventory_item_id),
        quantity_delta: Number(row.quantity_delta || 0),
        deduction_unit: String(row.deduction_unit || ""),
      }));
    }

    const modifierIdByName = new Map<string, number>();
    (modifierRows || []).forEach((row: any) => {
      const name = String(row.name || "").trim().toLowerCase();
      if (name) modifierIdByName.set(name, Number(row.id));
    });

    const effectsByModifierId = new Map<number, Array<{ inventory_item_id: number; quantity_delta: number; deduction_unit: string }>>();
    modifierEffectRows.forEach((row) => {
      if (!effectsByModifierId.has(row.modifier_id)) effectsByModifierId.set(row.modifier_id, []);
      effectsByModifierId.get(row.modifier_id)!.push({
        inventory_item_id: row.inventory_item_id,
        quantity_delta: row.quantity_delta,
        deduction_unit: row.deduction_unit,
      });
    });

    for (const item of orderItems) {
      const itemRecipes = recipes.filter((recipe: any) => Number(recipe.product_id) === Number(item.product_id));
      for (const recipe of itemRecipes) {
        const qtyRequired =
          Number(item.quantity || 0) *
          Number(recipe.quantity_required || 0) *
          (1 + Number(recipe.wastage_percent || 0) / 100);

        if (qtyRequired <= 0) continue;

        const { data: latestCostRow } = await supabase
          .from("vendor_shipment_lines")
          .select("unit_cost")
          .eq("inventory_item_id", Number(recipe.inventory_item_id))
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();

        const unitCost = Number(latestCostRow?.unit_cost || 0);
        const lineCost = qtyRequired * unitCost;
        actualCogs += lineCost;

        movementRows.push({
          inventory_item_id: Number(recipe.inventory_item_id),
          order_id: orderId,
          product_id: item.product_id == null ? null : Number(item.product_id),
          product_name: item.product_name ?? null,
          movement_type: "sale_deduction",
          quantity_change: -qtyRequired,
          unit_cost: unitCost,
          line_cost: lineCost,
          note: `Auto deduction for order ${orderId}`,
        });
      }

      const modifierNames = String(item.modifiers_text || "")
        .split(",")
        .map((name: string) => name.trim())
        .filter(Boolean);

      for (const modifierName of modifierNames) {
        const modifierId = modifierIdByName.get(modifierName.toLowerCase());
        if (!modifierId) continue;
        const modifierEffects = effectsByModifierId.get(modifierId) || [];

        for (const effect of modifierEffects) {
          const effectItem = inventoryItems.find(
            (inventoryItem) => Number(inventoryItem.id) === Number(effect.inventory_item_id)
          );
          if (!effectItem) continue;

          const basisUnit = getRecipeCostBasisUnit(effectItem.unit);
          const normalizedEffectQty = convertQuantityBetweenUnits(
            Number(effect.quantity_delta || 0),
            effect.deduction_unit || basisUnit,
            basisUnit
          );

          const qtyRequired = Number(item.quantity || 0) * Number(normalizedEffectQty || 0);
          if (qtyRequired <= 0) continue;

          const { data: latestCostRow } = await supabase
            .from("vendor_shipment_lines")
            .select("unit_cost")
            .eq("inventory_item_id", Number(effect.inventory_item_id))
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();

          const unitCost = Number(latestCostRow?.unit_cost || 0);
          const lineCost = qtyRequired * unitCost;
          actualCogs += lineCost;

          movementRows.push({
            inventory_item_id: Number(effect.inventory_item_id),
            order_id: orderId,
            product_id: item.product_id == null ? null : Number(item.product_id),
            product_name: item.product_name ?? null,
            movement_type: "modifier_deduction",
            quantity_change: -qtyRequired,
            unit_cost: unitCost,
            line_cost: lineCost,
            note: `Modifier ${modifierName} deduction for order ${orderId}`,
          });
        }
      }
    }

    if (movementRows.length > 0) {
      const { error: movementInsertError } = await supabase.from("inventory_movements").insert(movementRows);
      if (movementInsertError) throw new Error(movementInsertError.message);

      const stockDeltaByItem = new Map<number, number>();
      for (const movement of movementRows) {
        const itemId = Number(movement.inventory_item_id || 0);
        if (!itemId) continue;
        stockDeltaByItem.set(
          itemId,
          Number(stockDeltaByItem.get(itemId) || 0) + Number(movement.quantity_change || 0)
        );
      }

      for (const [inventoryItemId, qtyChange] of stockDeltaByItem.entries()) {
        const { data: stockRow, error: stockReadError } = await supabase
          .from("inventory_items")
          .select("current_stock")
          .eq("id", inventoryItemId)
          .single();

        if (stockReadError) throw new Error(stockReadError.message);

        const nextStock = Number(stockRow?.current_stock || 0) + Number(qtyChange || 0);

        const { error: stockWriteError } = await supabase
          .from("inventory_items")
          .update({ current_stock: nextStock })
          .eq("id", inventoryItemId);

        if (stockWriteError) throw new Error(stockWriteError.message);
      }
    }

    const grossProfit = Number(orderTotal || 0) - actualCogs;
    await supabase.from("order_costs").insert({
      order_id: orderId,
      actual_cogs: actualCogs,
      gross_profit: grossProfit,
      deducted_at: new Date().toISOString(),
      notes: movementRows.length > 0 ? "Auto-calculated from recipe unit costs" : "No recipe movement rows created",
    });

    return { applied: movementRows.length > 0, actualCogs, grossProfit };
  } catch (error) {
    return {
      applied: false,
      actualCogs: 0,
      grossProfit: Number(orderTotal || 0),
      error: error instanceof Error ? error.message : "Inventory deduction failed",
    };
  }
}

export default function Home() {
  const router = useRouter();

const [authChecked, setAuthChecked] = useState(false);
const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
const [lockScreen, setLockScreen] = useState(false);
const [unlockPin, setUnlockPin] = useState("");

useEffect(() => {
  const loadAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabaseAuth.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabaseAuth
        .from("staff_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error || !data || data.is_active === false) {
        await supabaseAuth.auth.signOut();
        router.push("/login");
        return;
      }

      setStaffProfile(data as StaffProfile);
      setAuthChecked(true);
    } catch (err) {
      console.error("AUTH CHECK EXCEPTION:", err);
      router.push("/login");
    }
  };

  loadAuth();
}, [router]);

const authLoading = !authChecked || !staffProfile;
const currentRole = normalizeRole(staffProfile?.role);
const canViewCustomers = currentRole === "admin" || currentRole === "manager";
const canViewReports = currentRole === "admin" || currentRole === "manager";
const canViewSetup = currentRole === "admin";
const canViewInventory = currentRole === "admin";
const canViewRecipes = currentRole === "admin";
const canEditCustomerBonus = currentRole === "admin" || currentRole === "manager";
const canEditSetup = currentRole === "admin";

  const [viewMode, setViewMode] = useState<ViewMode>("pos");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierLibrary, setModifierLibrary] = useState<ModifierLibraryItem[]>([]);
  const [modifierInventoryEffects, setModifierInventoryEffects] = useState<ModifierInventoryEffect[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [salesTaxes, setSalesTaxes] = useState<SalesTax[]>([]);
  const [promotions, setPromotions] = useState<LoyaltyPromotion[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | null>(null);
  const [cashReceivedInput, setCashReceivedInput] = useState("");

  const [activeOrders, setActiveOrders] = useState<OrderView[]>([]);
  const [completedOrders, setCompletedOrders] = useState<OrderView[]>([]);
  const preparingOrders = useMemo(
    () =>
      activeOrders.filter(
        (order) =>
          order.status === "Preparing" &&
          !order.collected_at
      ),
    [activeOrders]
  );
  const queueOrders = useMemo(
    () =>
      activeOrders.filter(
        (order) =>
          (order.status === "Preparing" || order.status === "Ready") &&
          !order.collected_at &&
          order.status !== "Completed" &&
          order.status !== "Collected"
      ),
    [activeOrders]
  );

  const [todaySales, setTodaySales] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [todayCompletedOrders, setTodayCompletedOrders] = useState(0);
  const [averageFulfillmentSeconds, setAverageFulfillmentSeconds] = useState(0);
  const [topItemsToday, setTopItemsToday] = useState<TopItem[]>([]);

  const [statusMessage, setStatusMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [mounted, setMounted] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<Array<{ name: string; displayName?: string; isDefault?: boolean }>>([]);
  const [receiptKitchenPrinter, setReceiptKitchenPrinter] = useState("");
  const [stickerPrinter, setStickerPrinter] = useState("");
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(true);
  const [autoPrintStickers, setAutoPrintStickers] = useState(true);

  const [selectedProductForCart, setSelectedProductForCart] = useState<Product | null>(null);
  const [selectedQueueOrder, setSelectedQueueOrder] = useState<OrderView | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<number[]>([]);
  const [lineNotes, setLineNotes] = useState("");
  const [linePricingMode, setLinePricingMode] = useState<"normal" | "discounted" | "complimentary">("normal");
  const [lineDiscountedUnitPrice, setLineDiscountedUnitPrice] = useState("");

  const [currentCustomer, setCurrentCustomer] = useState<CustomerRow | null>(null);
  const [customerRecentOrders, setCustomerRecentOrders] = useState<OrderView[]>([]);
  const [customerPointsLedger, setCustomerPointsLedger] = useState<CustomerLedgerEntry[]>([]);
  const [redeemPointsInput, setRedeemPointsInput] = useState("0");
  const [manualBonusInput, setManualBonusInput] = useState("");

  const [customersSearch, setCustomersSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignSegment, setCampaignSegment] = useState<"all" | "vip" | "active" | "atRisk">("all");
  const [campaignMessage, setCampaignMessage] = useState("Assalam o Alaikum. We would love to welcome you back to Spill The Tea. Visit us soon for your next favorite cup.");
  const [selectedCampaignCustomerIds, setSelectedCampaignCustomerIds] = useState<number[]>([]);
  const [customerList, setCustomerList] = useState<CustomerSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomerSummary, setSelectedCustomerSummary] = useState<CustomerSummary | null>(null);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<OrderView[]>([]);
  const [selectedCustomerLedger, setSelectedCustomerLedger] = useState<CustomerLedgerEntry[]>([]);
  const [selectedCustomerBonusInput, setSelectedCustomerBonusInput] = useState("");

  useEffect(() => {
    if (!authChecked || !staffProfile) return;

    if ((viewMode === "reports" || viewMode === "dayClose" || viewMode === "reorder" || viewMode === "recipePricing") && !canViewReports) {
      setViewMode("pos");
      setStatusMessage("Reports are restricted for your role");
      return;
    }

    if ((viewMode === "customers" || viewMode === "campaigns") && !canViewCustomers) {
      setViewMode("pos");
      setStatusMessage("Customers view is restricted for your role");
      return;
    }

    if (viewMode === "setup" && !canViewSetup) {
      setViewMode("pos");
      setStatusMessage("Setup is restricted for your role");
      return;
    }

    if (viewMode === "inventory" && !canViewInventory) {
      setViewMode("pos");
      setStatusMessage("Inventory is restricted for your role");
      return;
    }

    if (viewMode === "audit" && !canViewInventory) {
      setViewMode("pos");
      setStatusMessage("Stock Audit is restricted for your role");
      return;
    }

    if (viewMode === "recipes" && !canViewRecipes) {
      setViewMode("pos");
      setStatusMessage("Recipes is restricted for your role");
    }
  }, [
    authChecked,
    staffProfile,
    viewMode,
    canViewReports,
    canViewCustomers,
    canViewSetup,
    canViewInventory,
    canViewRecipes,
  ]);

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
    inventory_effect_item_id: "",
    inventory_effect_unit: "",
    inventory_effect_quantity: "",
  });

  const [paymentMethodForm, setPaymentMethodForm] = useState<PaymentMethodForm>({
    id: null,
    name: "",
    active: true,
    salesTaxIds: [],
  });

  const [salesTaxForm, setSalesTaxForm] = useState<SalesTaxForm>({
    id: null,
    name: "",
    rate_percent: "",
    active: true,
  });

  const [promotionForm] = useState<PromotionForm>({
    id: null,
    name: "",
    start_at: "",
    end_at: "",
    multiplier: "2",
    active: true,
  });

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryItemCategories, setInventoryItemCategories] = useState<InventoryItemCategory[]>([]);
  const [vendorShipments, setVendorShipments] = useState<VendorShipmentSummary[]>([]);
  const [vendorShipmentLines, setVendorShipmentLines] = useState<VendorShipmentLineRow[]>([]);
  const [orderCosts, setOrderCosts] = useState<OrderCostRow[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovementRow[]>([]);
  const [selectedProfitOrderId, setSelectedProfitOrderId] = useState<string>("");
  const [profitabilityPeriod, setProfitabilityPeriod] = useState<"day" | "week" | "month" | "quarter" | "year">("day");
  const [fixedCosts, setFixedCosts] = useState<FixedCostRow[]>([]);
  const [fixedCostForm, setFixedCostForm] = useState({
    name: "",
    amount: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  });
  const [dayCloseOpeningCashInput, setDayCloseOpeningCashInput] = useState("0");
  const [dayCloseActualCashInput, setDayCloseActualCashInput] = useState("");
  const [dayCloseDepositCashInput, setDayCloseDepositCashInput] = useState("");
  const [dayCloseFloatCashInput, setDayCloseFloatCashInput] = useState("");
  const [dayCloseNotes, setDayCloseNotes] = useState("");
  const [dayCloseDifferenceNotes, setDayCloseDifferenceNotes] = useState("");
  const [vendorPayments, setVendorPayments] = useState<VendorPaymentRow[]>([]);
  const [vendorPayables, setVendorPayables] = useState<VendorPayableRow[]>([]);
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatchRow[]>([]);
  const [selectedInventoryHistoryItemId, setSelectedInventoryHistoryItemId] = useState<number | null>(null);
  const inventoryCostSummaryByItem = useMemo<Record<number, InventoryCostSummary>>(() => {
    const summary: Record<number, InventoryCostSummary> = {};
    const shipmentDateById = new Map<number, string>();

    vendorShipments.forEach((shipment) => {
      shipmentDateById.set(Number(shipment.id), String(shipment.delivery_date || ""));
    });

    vendorShipmentLines.forEach((line) => {
      const itemId = Number(line.inventory_item_id || 0);
      if (!itemId) return;

      if (!summary[itemId]) {
        summary[itemId] = {
          latest_unit_cost: 0,
          previous_unit_cost: 0,
          average_unit_cost: 0,
          last_purchase_date: null,
          total_purchased_qty: 0,
        };
      }

      const qty = Math.max(0, Number(line.quantity || 0));
      const unitCost = Math.max(0, Number(line.unit_cost || 0));
      const shipmentDate = shipmentDateById.get(Number(line.shipment_id || 0)) || null;
      const row = summary[itemId];

      row.total_purchased_qty += qty;
      row.average_unit_cost += qty * unitCost;

      if (!row.last_purchase_date || ((shipmentDate && new Date(shipmentDate).getTime()) > new Date(row.last_purchase_date).getTime())) {
        if (row.last_purchase_date) {
          row.previous_unit_cost = row.latest_unit_cost;
        }
        row.last_purchase_date = shipmentDate;
        row.latest_unit_cost = unitCost;
      } else if (shipmentDate && row.last_purchase_date && new Date(shipmentDate).getTime() < new Date(row.last_purchase_date).getTime()) {
        row.previous_unit_cost = Math.max(row.previous_unit_cost, unitCost);
      }
    });

    Object.keys(summary).forEach((key) => {
      const itemId = Number(key);
      const row = summary[itemId];
      row.average_unit_cost = row.total_purchased_qty > 0 ? row.average_unit_cost / row.total_purchased_qty : 0;

      const sortedForItem = vendorShipmentLines
        .filter((line) => Number(line.inventory_item_id || 0) === itemId)
        .sort((a, b) => {
          const shipmentA = vendorShipments.find((shipment) => Number(shipment.id) === Number(a.shipment_id || 0));
          const shipmentB = vendorShipments.find((shipment) => Number(shipment.id) === Number(b.shipment_id || 0));
          const dateA = new Date(shipmentA?.delivery_date || 0).getTime();
          const dateB = new Date(shipmentB?.delivery_date || 0).getTime();
          return dateB - dateA || Number(b.id) - Number(a.id);
        });

      row.latest_unit_cost = Number(sortedForItem[0]?.unit_cost || row.latest_unit_cost || 0);
      row.previous_unit_cost = Number(sortedForItem[1]?.unit_cost || 0);
    });

    return summary;
  }, [vendorShipmentLines, vendorShipments]);

  const inventoryPurchaseHistoryByItem = useMemo<Record<number, InventoryPurchaseHistoryRow[]>>(() => {
    const shipmentById = new Map<number, VendorShipmentSummary>();
    vendorShipments.forEach((shipment) => {
      shipmentById.set(Number(shipment.id), shipment);
    });

    const history: Record<number, InventoryPurchaseHistoryRow[]> = {};
    vendorShipmentLines.forEach((line) => {
      const itemId = Number(line.inventory_item_id || 0);
      if (!itemId) return;
      const shipment = shipmentById.get(Number(line.shipment_id || 0)) || null;
      const row: InventoryPurchaseHistoryRow = {
        shipment_line_id: Number(line.id),
        shipment_id: Number(line.shipment_id || 0),
        inventory_item_id: itemId,
        quantity: Number(line.quantity || 0),
        unit_cost: Number(line.unit_cost || 0),
        line_total: Number(line.line_total || 0),
        supply_model: String(line.supply_model || ""),
        expiry_date: line.expiry_date ?? null,
        shipment_date: shipment?.delivery_date || null,
        vendor_name: shipment?.vendor_name || null,
        invoice_number: shipment?.invoice_number || null,
        shipment_number: shipment?.shipment_number || null,
      };
      history[itemId] = [...(history[itemId] || []), row];
    });

    Object.keys(history).forEach((key) => {
      history[Number(key)] = history[Number(key)].sort(
        (a, b) => new Date(b.shipment_date || 0).getTime() - new Date(a.shipment_date || 0).getTime() || b.shipment_line_id - a.shipment_line_id
      );
    });

    return history;
  }, [vendorShipmentLines, vendorShipments]);

  const selectedInventoryHistoryItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedInventoryHistoryItemId) || null,
    [inventoryItems, selectedInventoryHistoryItemId]
  );
  const selectedInventoryPurchaseHistory = useMemo(
    () => (selectedInventoryHistoryItemId ? inventoryPurchaseHistoryByItem[selectedInventoryHistoryItemId] || [] : []),
    [inventoryPurchaseHistoryByItem, selectedInventoryHistoryItemId]
  );

  const [stockAudits, setStockAudits] = useState<StockAuditRow[]>([]);
  const [stockAuditLines, setStockAuditLines] = useState<StockAuditLineRow[]>([]);
  const [selectedStockAuditId, setSelectedStockAuditId] = useState<number | null>(null);
  const [stockAuditDate, setStockAuditDate] = useState(new Date().toISOString().slice(0, 10));
  const [stockAuditMode, setStockAuditMode] = useState<"opening" | "closing">("closing");
  const [stockAuditNotes, setStockAuditNotes] = useState("");
  const [stockAuditEditorRows, setStockAuditEditorRows] = useState<StockAuditEditorRow[]>([]);

  const selectedStockAudit = useMemo(
    () => stockAudits.find((audit) => audit.id === selectedStockAuditId) || null,
    [stockAudits, selectedStockAuditId]
  );
  const selectedStockAuditLineRows = useMemo(
    () => (selectedStockAuditId ? stockAuditLines.filter((line) => line.audit_id === selectedStockAuditId) : []),
    [stockAuditLines, selectedStockAuditId]
  );
  const previousClosingAudit = useMemo(
    () =>
      stockAudits
        .filter((audit) => audit.audit_mode === "closing" && String(audit.audit_date) < String(stockAuditDate))
        .sort((a, b) => {
          const dateDiff = String(b.audit_date).localeCompare(String(a.audit_date));
          if (dateDiff !== 0) return dateDiff;
          return Number(b.id) - Number(a.id);
        })[0] || null,
    [stockAudits, stockAuditDate]
  );
  const latestAuditBeforeDate = useMemo(
    () =>
      stockAudits
        .filter((audit) => String(audit.audit_date) < String(stockAuditDate))
        .sort((a, b) => {
          const dateDiff = String(b.audit_date).localeCompare(String(a.audit_date));
          if (dateDiff !== 0) return dateDiff;
          return Number(b.id) - Number(a.id);
        })[0] || null,
    [stockAudits, stockAuditDate]
  );

  const [productRecipes, setProductRecipes] = useState<ProductRecipeDbRow[]>([]);
  const [allProductRecipes, setAllProductRecipes] = useState<ProductRecipeDbRow[]>([]);
  const [selectedRecipeProductId, setSelectedRecipeProductId] = useState<string>("");
  const [recipePricingTargetMarginInput, setRecipePricingTargetMarginInput] = useState("70");
  const [selectedRecipePricingProductId, setSelectedRecipePricingProductId] = useState<string>("");
  const [recipeEditorRows, setRecipeEditorRows] = useState<RecipeEditorRow[]>([makeRecipeEditorRow(1)]);

  function resetRecipeEditorRows() {
    setRecipeEditorRows([makeRecipeEditorRow(1)]);
  }


  function normalizeUnit(rawUnit: string | null | undefined) {
    const unit = String(rawUnit || "").trim().toLowerCase();
    if (["piece", "pieces", "pc", "pcs", "unit", "units", "each", "eaches"].includes(unit)) return "pcs";
    if (["g", "gram", "grams"].includes(unit)) return "g";
    if (["kg", "kilogram", "kilograms"].includes(unit)) return "kg";
    if (["ml", "milliliter", "milliliters"].includes(unit)) return "ml";
    if (["l", "ltr", "liter", "liters"].includes(unit)) return "l";
    if (["lb", "lbs", "pound", "pounds"].includes(unit)) return "lb";
    return unit || "pcs";
  }

  function getCompatibleRecipeUnits(itemUnitRaw: string | null | undefined) {
    const unit = normalizeUnit(itemUnitRaw);
    if (["g", "kg", "lb"].includes(unit)) return ["g", "kg", "lb"];
    if (["ml", "l"].includes(unit)) return ["ml", "l"];
    return ["pcs"];
  }

  function getInventoryDisplayUnit(item: InventoryItem) {
    const unit = normalizeUnit(item.unit);
    if (["g", "kg"].includes(unit)) return "kg";
    if (["ml", "l"].includes(unit)) return "l";
    if (unit === "pcs" || unit === "case") return "eaches";
    return unit || "eaches";
  }

  function getInventoryDisplayScale(item: InventoryItem) {
    const unit = normalizeUnit(item.unit);
    if (["g", "kg"].includes(unit)) return 1000;
    if (["ml", "l"].includes(unit)) return 1000;
    return 1;
  }

  function getInventoryDisplayQuantity(value: number, item: InventoryItem) {
    return Number(value || 0) / getInventoryDisplayScale(item);
  }

  function getInventoryDisplayPrice(unitCost: number, item: InventoryItem) {
    return Number(unitCost || 0) * getInventoryDisplayScale(item);
  }

  function getInventoryStockSummaryText(item: InventoryItem) {
    const displayQty = getInventoryDisplayQuantity(Number(item.current_stock || 0), item);
    const displayUnit = getInventoryDisplayUnit(item);
    const caseSize = Number(item.case_size_each || 0);

    if (displayUnit === "eaches" && caseSize > 1) {
      const fullPacks = Math.floor(displayQty / caseSize);
      const looseEaches = Math.round(displayQty - fullPacks * caseSize);
      if (fullPacks > 0 && looseEaches > 0) return `${fullPacks} packs x ${caseSize} + ${looseEaches} each`;
      if (fullPacks > 0) return `${fullPacks} packs x ${caseSize}`;
    }

    if (displayUnit === "kg" || displayUnit === "l") {
      return `${displayQty.toFixed(2)} ${displayUnit}`;
    }

    return `${displayQty.toFixed(0)} ${displayUnit}`;
  }

  function getInventoryPriceLabel(item: InventoryItem) {
    const displayUnit = getInventoryDisplayUnit(item);
    const caseSize = Number(item.case_size_each || 0);
    if (displayUnit === "eaches" && caseSize > 1) return `per ${caseSize} each`;
    if (displayUnit === "eaches") return "per each";
    return `per ${displayUnit}`;
  }

  function convertInventoryDisplayToRaw(quantity: number, item: InventoryItem) {
    return Number(quantity || 0) * getInventoryDisplayScale(item);
  }

  function getDateOnly(value: string | null | undefined) {
    if (!value) return "";
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  }

  function formatAuditQty(value: number, unit: string) {
    if (unit === "kg" || unit === "l") return Number(value || 0).toFixed(2);
    return Number(value || 0).toFixed(0);
  }

  function convertQuantityBetweenUnits(
    quantity: number,
    fromUnitRaw: string | null | undefined,
    toUnitRaw: string | null | undefined
  ) {
    const fromUnit = normalizeUnit(fromUnitRaw);
    const toUnit = normalizeUnit(toUnitRaw);

    if (!Number.isFinite(quantity)) return null;
    if (fromUnit === toUnit) return quantity;

    const weightToGram: Record<string, number> = { g: 1, kg: 1000, lb: 453.59237 };
    const volumeToMl: Record<string, number> = { ml: 1, l: 1000 };

    if (fromUnit in weightToGram && toUnit in weightToGram) {
      const grams = quantity * weightToGram[fromUnit];
      return grams / weightToGram[toUnit];
    }

    if (fromUnit in volumeToMl && toUnit in volumeToMl) {
      const ml = quantity * volumeToMl[fromUnit];
      return ml / volumeToMl[toUnit];
    }

    if (fromUnit === "pcs" && toUnit === "pcs") return quantity;

    return null;
  }

  function getLatestItemUnitCost(inventoryItemId: number) {
    const latestLine = (vendorShipmentLines || [])
      .filter(
        (line) =>
          Number(line.inventory_item_id) === Number(inventoryItemId) &&
          line.unit_cost != null &&
          Number(line.unit_cost) > 0
      )
      .sort((a, b) => Number(b.id) - Number(a.id))[0];

    return latestLine ? Number(latestLine.unit_cost || 0) : 0;
  }

  function getRecipeCostBasisUnit(itemUnitRaw: string | null | undefined) {
    const unit = normalizeUnit(itemUnitRaw);
    if (unit === "kg" || unit === "g" || unit === "lb") return "g";
    if (unit === "l" || unit === "ml") return "ml";
    return "pcs";
  }

  function getRecipeLineComputedCost(row: RecipeEditorRow) {
    const item = inventoryItems.find((inventoryItem) => String(inventoryItem.id) === row.inventory_item_id);
    if (!item) return 0;

    const quantityInput = Number(row.quantity_input || 0);
    if (quantityInput <= 0) return 0;

    const costBasisUnit = getRecipeCostBasisUnit(item.unit);

    const normalizedQty = convertQuantityBetweenUnits(
      quantityInput,
      row.recipe_unit || costBasisUnit,
      costBasisUnit
    );

    if (normalizedQty == null) return 0;

    const latestUnitCost = getLatestItemUnitCost(item.id);
    const wastageMultiplier = 1 + Number(row.wastage_percent || 0) / 100;

    return normalizedQty * latestUnitCost * wastageMultiplier;
  }

  function updateRecipeEditorRow(rowId: string, patch: Partial<RecipeEditorRow>) {
    setRecipeEditorRows((prev) =>
      prev.map((row) => {
        if (row.row_id !== rowId) return row;
        const next = { ...row, ...patch };

        if (patch.inventory_item_id) {
          const item = inventoryItems.find((inventoryItem) => String(inventoryItem.id) === patch.inventory_item_id);
          if (item && !patch.recipe_unit) {
            next.recipe_unit = getRecipeCostBasisUnit(item.unit);
          }
        }

        return next;
      })
    );
  }

  function addRecipeEditorRow() {
    setRecipeEditorRows((prev) => [...prev, makeRecipeEditorRow(prev.length + 1)]);
  }

  function removeRecipeEditorRow(rowId: string) {
    setRecipeEditorRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.row_id !== rowId)
    );
  }

  async function loadProductRecipes(productId?: number) {
    const targetProductId = productId ?? Number(selectedRecipeProductId || 0);

    if (!targetProductId) {
      setProductRecipes([]);
      resetRecipeEditorRows();
      return;
    }

    const { data, error } = await supabase
      .from("product_recipes")
      .select("id, product_id, inventory_item_id, quantity_required, wastage_percent")
      .eq("product_id", targetProductId)
      .order("id", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load product recipes: ${error.message}`);
      return;
    }

    const rows = ((data || []) as any[]).map((row, index) => {
      const item = inventoryItems.find(
        (inventoryItem) => Number(inventoryItem.id) === Number(row.inventory_item_id)
      );

      return {
        row_id: `recipe-load-${Date.now()}-${index + 1}`,
        inventory_item_id: String(row.inventory_item_id),
        recipe_unit: getRecipeCostBasisUnit(item?.unit),
        quantity_input: String(row.quantity_required ?? ""),
        wastage_percent: String(row.wastage_percent ?? 0),
      } as RecipeEditorRow;
    });

    setProductRecipes(
      ((data || []) as any[]).map((row: any) => ({
        id: Number(row.id),
        product_id: Number(row.product_id),
        inventory_item_id: Number(row.inventory_item_id),
        quantity_required: Number(row.quantity_required || 0),
        wastage_percent: Number(row.wastage_percent || 0),
      }))
    );

    setRecipeEditorRows(rows.length > 0 ? rows : [makeRecipeEditorRow(1)]);
  }

  async function loadAllProductRecipes() {
    const { data, error } = await supabase
      .from("product_recipes")
      .select("id, product_id, inventory_item_id, quantity_required, wastage_percent")
      .order("product_id", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load all product recipes: ${error.message}`);
      return;
    }

    setAllProductRecipes(
      ((data || []) as any[]).map((row: any) => ({
        id: Number(row.id),
        product_id: Number(row.product_id),
        inventory_item_id: Number(row.inventory_item_id),
        quantity_required: Number(row.quantity_required || 0),
        wastage_percent: Number(row.wastage_percent || 0),
      }))
    );
  }

  async function saveProductRecipe() {
    try {
      const productId = Number(selectedRecipeProductId || 0);
      if (!productId) {
        setStatusMessage("Select a product first");
        return;
      }

      const validRows = recipeEditorRows.filter(
        (row) => row.inventory_item_id && Number(row.quantity_input || 0) > 0
      );

      if (validRows.length === 0) {
        setStatusMessage("Add at least one ingredient line");
        return;
      }

      const payload = validRows.map((row) => {
        const item = inventoryItems.find(
          (inventoryItem) => String(inventoryItem.id) === row.inventory_item_id
        );

        if (!item) {
          throw new Error("Recipe ingredient item not found");
        }

        const costBasisUnit = getRecipeCostBasisUnit(item.unit);

        const normalizedQty = convertQuantityBetweenUnits(
          Number(row.quantity_input || 0),
          row.recipe_unit || costBasisUnit,
          costBasisUnit
        );

        if (normalizedQty == null) {
          throw new Error(`Could not convert units for ${item.item_name}`);
        }

        return {
          product_id: productId,
          inventory_item_id: Number(row.inventory_item_id),
          quantity_required: normalizedQty,
          wastage_percent: Number(row.wastage_percent || 0),
        };
      });

      const { error: deleteError } = await supabase
        .from("product_recipes")
        .delete()
        .eq("product_id", productId);

      if (deleteError) {
        throw new Error(`Could not clear old recipe: ${deleteError.message}`);
      }

      const { error: insertError } = await supabase
        .from("product_recipes")
        .insert(payload);

      if (insertError) {
        throw new Error(`Could not save recipe: ${insertError.message}`);
      }

      setStatusMessage("Product recipe saved");
      await loadProductRecipes(productId);
      await loadAllProductRecipes();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save recipe");
    }
  }


  const [vendorForm, setVendorForm] = useState<VendorForm>({
    id: null,
    vendor_name: "",
    contact_person: "",
    phone: "",
    email: "",
    payment_terms: "",
    active: true,
  });

  const [inventoryItemForm, setInventoryItemForm] = useState<InventoryItemForm>({
    id: null,
    item_name: "",
    sku: "",
    unit: "pcs",
    item_type: "ingredient",
    measurement_mode: "each",
    case_size_each: "",
    category_id: null,
    default_vendor_id: null,
    current_stock: "0",
    low_stock_threshold: "0",
    reorder_level: "0",
    active: true,
  });
  const [inventoryItemPicker, setInventoryItemPicker] = useState<string>("new");
  const [inventoryCategoryForm, setInventoryCategoryForm] = useState<InventoryCategoryForm>({
    category_name: "",
  });

  const [shipmentForm, setShipmentForm] = useState<ShipmentForm>({
    vendor_id: null,
    shipment_number: "",
    invoice_number: "",
    delivery_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [shipmentLines, setShipmentLines] = useState<ShipmentLineForm[]>([
    {
      inventory_item_id: null,
      quantity: "",
      unit_cost: "",
      line_total: "",
      batch_code: "",
      expiry_date: "",
      supply_model: "outright_purchase",
    },
  ]);

  const [vendorPaymentForm, setVendorPaymentForm] = useState<VendorPaymentForm>({
    vendor_id: null,
    shipment_id: null,
    amount: "",
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const [productModifierMap, setProductModifierMap] = useState<Record<number, number[]>>({});
  const [paymentMethodTaxMap, setPaymentMethodTaxMap] = useState<Record<number, number[]>>({});
  const [autoLookupEnabled] = useState(true);

  const [stockIntakeForm, setStockIntakeForm] = useState({
    vendor_id: "",
    delivery_date: "",
    invoice_number: "",
    payment_type: "cash",
    amount_paid_today: "",
    notes: "",
  });

  const [stockIntakeRows, setStockIntakeRows] = useState<StockIntakeRowForm[]>([
    makeStockIntakeRow(1),
  ]);

  const [selectedShipmentHistoryId, setSelectedShipmentHistoryId] = useState<string>("");
  const [stockIntakeHistoryFilterVendorId, setStockIntakeHistoryFilterVendorId] = useState<string>("");
  const [stockIntakeHistoryFilterStatus, setStockIntakeHistoryFilterStatus] = useState<string>("");
  const [stockIntakeHistoryTab, setStockIntakeHistoryTab] = useState<"unpaid" | "paid">("unpaid");
  const [vendorPaymentMode, setVendorPaymentMode] = useState<"full_intake" | "specific_lines">("full_intake");
  const [selectedShipmentPaymentLineIds, setSelectedShipmentPaymentLineIds] = useState<string[]>([]);

  const filteredShipmentHistory = vendorShipments.filter((shipment: any) => {
    const vendorMatch = stockIntakeHistoryFilterVendorId
      ? String(shipment.vendor_id) === stockIntakeHistoryFilterVendorId
      : true;

    const paymentStatus = String(shipment.payment_status || "");
    const tabMatch =
      stockIntakeHistoryTab === "paid"
        ? paymentStatus === "paid"
        : paymentStatus === "unpaid" || paymentStatus === "partially_paid";

    const statusMatch = stockIntakeHistoryFilterStatus
      ? String(shipment.payment_status) === stockIntakeHistoryFilterStatus
      : true;

    return vendorMatch && tabMatch && statusMatch;
  });

  const selectedShipmentHistory =
    filteredShipmentHistory.find((shipment: any) => String(shipment.id) === selectedShipmentHistoryId) ||
    vendorShipments.find((shipment: any) => String(shipment.id) === selectedShipmentHistoryId) ||
    null;

  const selectedShipmentLines = (vendorShipmentLines || []).filter(
    (line: any) => String(line.shipment_id) === String(selectedShipmentHistory?.id || "")
  );

  const selectedShipmentPayments = (vendorPayments || []).filter(
    (payment: any) => String(payment.shipment_id) === String(selectedShipmentHistory?.id || "")
  );

  const totalPendingVendorPayments = filteredShipmentHistory.reduce(
    (sum: number, shipment: any) => sum + Number(shipment.outstanding_amount || 0),
    0
  );

  function openShipmentHistory(shipmentId: string) {
    setSelectedShipmentHistoryId(shipmentId);
  }


  const [inventoryBatchRows, setInventoryBatchRows] = useState<InventoryBatchRowForm[]>([
    makeInventoryBatchRow(1),
  ]);

  const activePromotion = useMemo(() => {
    const now = Date.now();
    return (
      promotions.find((promo) => {
        const start = new Date(promo.start_at).getTime();
        const end = new Date(promo.end_at).getTime();
        return promo.active !== false && now >= start && now <= end;
      }) || null
    );
  }, [promotions]);

  const activeProductModifiers = useMemo(() => {
    if (!selectedProductForCart) return [];
    const allowedIds = productModifierMap[selectedProductForCart.id] || [];
    return modifierLibrary.filter(
      (m) => allowedIds.includes(m.id) && m.active !== false
    );
  }, [modifierLibrary, productModifierMap, selectedProductForCart]);

  const modifierEffectByModifierId = useMemo(() => {
    const map = new Map<number, ModifierInventoryEffect>();
    modifierInventoryEffects.forEach((effect) => {
      map.set(effect.modifier_id, effect);
    });
    return map;
  }, [modifierInventoryEffects]);

  const selectedModifierEffectItem = useMemo(
    () => inventoryItems.find((item) => String(item.id) === modifierForm.inventory_effect_item_id) || null,
    [inventoryItems, modifierForm.inventory_effect_item_id]
  );

  const modifierEffectUnitOptions = useMemo(
    () => getCompatibleRecipeUnits(selectedModifierEffectItem?.unit),
    [selectedModifierEffectItem]
  );

  const modifierEffectUnitLabel = useMemo(() => {
    if (!selectedModifierEffectItem) return "Unit";
    const normalized = normalizeUnit(selectedModifierEffectItem.unit);
    if (["g", "kg", "lb"].includes(normalized)) return "Deduct Unit";
    if (["ml", "l"].includes(normalized)) return "Deduct Unit";
    return "Deduct Unit";
  }, [selectedModifierEffectItem]);

  const linePricingPreview = useMemo(() => {
    if (!selectedProductForCart) return 0;
    const chosenModifiers = modifierLibrary.filter((m) =>
      selectedModifierIds.includes(m.id)
    );
    const modifierTotal = chosenModifiers.reduce(
      (sum, mod) => sum + Number(mod.price_delta),
      0
    );
    const normalUnit = selectedProductForCart.price + modifierTotal;

    if (linePricingMode === "complimentary") return 0;
    if (linePricingMode === "discounted") return Math.max(0, Number(lineDiscountedUnitPrice || 0));
    return normalUnit;
  }, [
    selectedProductForCart,
    selectedModifierIds,
    modifierLibrary,
    linePricingMode,
    lineDiscountedUnitPrice,
  ]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const modifierTotal = item.modifiers.reduce(
        (modSum, mod) => modSum + Number(mod.price_delta),
        0
      );
      const normalUnit = item.base_price + modifierTotal;

      let unit = normalUnit;
      if (item.pricing_mode === "complimentary") unit = 0;
      if (item.pricing_mode === "discounted") unit = Math.max(0, Number(item.discounted_unit_price || 0));

      return sum + unit * item.quantity;
    }, 0);
  }, [cart]);

  const eligibleSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.pricing_mode !== "normal") return sum;
      const modifierTotal = item.modifiers.reduce(
        (modSum, mod) => modSum + Number(mod.price_delta),
        0
      );
      const unit = item.base_price + modifierTotal;
      return sum + unit * item.quantity;
    }, 0);
  }, [cart]);

  const nonEligibleSubtotal = useMemo(() => {
    return Math.max(0, cartSubtotal - eligibleSubtotal);
  }, [cartSubtotal, eligibleSubtotal]);

  const availableRewardPoints = Number(currentCustomer?.reward_points || 0);
  const requestedRedeemPoints = Math.max(0, Number(redeemPointsInput || 0));
  const redeemablePoints = Math.min(
    availableRewardPoints,
    eligibleSubtotal,
    requestedRedeemPoints
  );

  const taxableSubtotalAfterRedemption = Math.max(0, cartSubtotal - redeemablePoints);

  const selectedPaymentTaxes = useMemo(() => {
    if (!selectedPaymentMethodId) return [];
    const taxIds = paymentMethodTaxMap[selectedPaymentMethodId] || [];
    return salesTaxes.filter((tax) => taxIds.includes(tax.id) && tax.active !== false);
  }, [selectedPaymentMethodId, paymentMethodTaxMap, salesTaxes]);

  const selectedPaymentMethod = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethodId) || null,
    [paymentMethods, selectedPaymentMethodId]
  );

  const isCashPayment = useMemo(() => {
    const name = String(selectedPaymentMethod?.name || "").toLowerCase();
    return name.includes("cash");
  }, [selectedPaymentMethod]);

  const taxBreakdown = useMemo(() => {
    return selectedPaymentTaxes.map((tax) => {
      const amount = (taxableSubtotalAfterRedemption * Number(tax.rate_percent || 0)) / 100;
      return {
        id: tax.id,
        name: tax.name,
        rate_percent: Number(tax.rate_percent || 0),
        amount,
      };
    });
  }, [selectedPaymentTaxes, taxableSubtotalAfterRedemption]);

  const cartTaxTotal = useMemo(
    () => taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0),
    [taxBreakdown]
  );

  const cartGrandTotal = useMemo(
    () => taxableSubtotalAfterRedemption + cartTaxTotal,
    [taxableSubtotalAfterRedemption, cartTaxTotal]
  );

  const cashReceived = Math.max(0, Number(cashReceivedInput || 0));
  const cashChange = Math.max(0, cashReceived - cartGrandTotal);

  const currentRewardRate = useMemo(() => {
    if (!currentCustomer) return 5;
    return getEffectiveRewardRate(
      Number(currentCustomer.lifetime_eligible_spend || 0),
      Number(currentCustomer.manual_bonus_percent || 0)
    );
  }, [currentCustomer]);

  const activePromotionMultiplier = Number(activePromotion?.multiplier || 1);

  const projectedPointsEarned = useMemo(() => {
    const eligiblePaidAmount = Math.max(0, eligibleSubtotal - redeemablePoints);
    return (eligiblePaidAmount * currentRewardRate * activePromotionMultiplier) / 100;
  }, [eligibleSubtotal, redeemablePoints, currentRewardRate, activePromotionMultiplier]);

  const filteredCustomers = useMemo(() => {
    const q = customersSearch.trim().toLowerCase();
    if (!q) return customerList;
    return customerList.filter((row) => {
      const name = String(row.customer.name || "").toLowerCase();
      const phone = String(row.customer.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [customerList, customersSearch]);


  function exportCustomerContactsCsv(rows: CustomerSummary[], mode: "all" | "filtered") {
    const exportRows = rows.filter((row) => String(row.customer.phone || "").trim() !== "");
    if (exportRows.length === 0) {
      setStatusMessage("No customer contacts available to export");
      return;
    }

    const headers = [
      "Name",
      "Phone",
      "Reward Points",
      "Lifetime Spend",
      "Visits",
      "Last Visit",
      "Segment",
    ];

    const lines = [
      headers.join(","),
      ...exportRows.map((row) => [
        escapeCsvValue(row.customer.name || "Customer"),
        escapeCsvValue(row.customer.phone),
        escapeCsvValue(Number(row.customer.reward_points || 0).toFixed(0)),
        escapeCsvValue(Number(row.total_spend || 0).toFixed(2)),
        escapeCsvValue(row.total_visits),
        escapeCsvValue(row.last_visit ? formatTime(row.last_visit) : ""),
        escapeCsvValue(getCustomerTag(row)),
      ].join(",")),
    ];

    downloadTextFile(
      `spill-the-tea-customers-${mode}-${new Date().toISOString().slice(0,10)}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8;"
    );
    setStatusMessage(`Exported ${exportRows.length} customer contacts to CSV`);
  }

  function exportCustomerContactsVcf(rows: CustomerSummary[], mode: "all" | "filtered") {
    const exportRows = rows.filter((row) => String(row.customer.phone || "").trim() !== "");
    if (exportRows.length === 0) {
      setStatusMessage("No customer contacts available to export");
      return;
    }

    const cards = exportRows.map((row, index) => {
      const fullName = sanitizeVcfText(row.customer.name || `Customer ${index + 1}`);
      const phone = sanitizeVcfText(row.customer.phone);
      const note = sanitizeVcfText(
        `Spill The Tea customer | Segment: ${getCustomerTag(row)} | Visits: ${row.total_visits} | Lifetime Spend: ${formatCurrency(row.total_spend)}`
      );
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${fullName}`,
        `N:${fullName};;;;`,
        `TEL;TYPE=CELL:${phone}`,
        "CATEGORIES:Spill The Tea Customers",
        `NOTE:${note}`,
        "END:VCARD",
      ].join("\n");
    });

    downloadTextFile(
      `spill-the-tea-customers-${mode}-${new Date().toISOString().slice(0,10)}.vcf`,
      cards.join("\n"),
      "text/vcard;charset=utf-8;"
    );
    setStatusMessage(`Exported ${exportRows.length} customer contacts to VCF`);
  }


  const customerHealthInsights = useMemo(() => {
    const now = Date.now();
    const enriched = customerList.map((summary) => {
      const orders = selectedCustomerId === summary.customer.id ? selectedCustomerOrders : [];
      const daysSinceLastVisit = summary.last_visit ? Math.floor((now - new Date(summary.last_visit).getTime()) / 86400000) : null;
      const avgTicket = summary.total_visits > 0 ? summary.total_spend / summary.total_visits : 0;
      return { ...summary, daysSinceLastVisit, avgTicket, orders };
    });

    const topBySpend = [...enriched].sort((a, b) => b.total_spend - a.total_spend).slice(0, 5);
    const topByVisits = [...enriched].sort((a, b) => b.total_visits - a.total_visits).slice(0, 5);
    const atRisk = [...enriched]
      .filter((item) => item.total_visits > 0 && (item.daysSinceLastVisit == null || item.daysSinceLastVisit >= 21))
      .sort((a, b) => (b.daysSinceLastVisit || 0) - (a.daysSinceLastVisit || 0))
      .slice(0, 5);

    return {
      totalCustomers: customerList.length,
      activeLast30: enriched.filter((item) => item.daysSinceLastVisit !== null && item.daysSinceLastVisit <= 30).length,
      vipCount: enriched.filter((item) => item.total_spend >= 5000 || item.total_visits >= 8).length,
      topBySpend,
      topByVisits,
      atRisk,
    };
  }, [customerList, selectedCustomerId, selectedCustomerOrders]);

  const campaignEligibleCustomers = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase();
    return customerList.filter((summary) => {
      const phone = String(summary.customer.phone || "").trim();
      if (!phone) return false;
      const daysSinceLastVisit = summary.last_visit ? Math.floor((Date.now() - new Date(summary.last_visit).getTime()) / 86400000) : null;
      const isVip = summary.total_spend >= 5000 || summary.total_visits >= 8;
      const isActive = daysSinceLastVisit !== null && daysSinceLastVisit <= 30;
      const isAtRisk = summary.total_visits > 0 && (daysSinceLastVisit == null || daysSinceLastVisit >= 21);

      const segmentMatch =
        campaignSegment === "all"
          ? true
          : campaignSegment === "vip"
          ? isVip
          : campaignSegment === "active"
          ? isActive
          : isAtRisk;

      if (!segmentMatch) return false;

      if (!q) return true;
      const name = String(summary.customer.name || "").toLowerCase();
      return name.includes(q) || phone.toLowerCase().includes(q);
    });
  }, [campaignSearch, campaignSegment, customerList]);

  function toggleCampaignCustomer(customerId: number) {
    setSelectedCampaignCustomerIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  }

  function selectAllCampaignCustomers() {
    setSelectedCampaignCustomerIds(campaignEligibleCustomers.map((item) => item.customer.id));
  }

  function clearCampaignSelection() {
    setSelectedCampaignCustomerIds([]);
  }

  function openCampaignWhatsApp(customer: CustomerSummary) {
    const phone = customer.customer.phone ? normalizePhoneForWhatsApp(customer.customer.phone) : "";
    if (!phone) {
      setStatusMessage("No customer phone available");
      return;
    }
    const textMessage = encodeURIComponent(campaignMessage.trim());
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${textMessage}`;
    window.open(url, "_blank");
    setStatusMessage(`WhatsApp opened for ${customer.customer.name || customer.customer.phone}`);
  }

  function openSelectedCampaignCustomers() {
    const selected = campaignEligibleCustomers.filter((item) => selectedCampaignCustomerIds.includes(item.customer.id));
    if (selected.length === 0) {
      setStatusMessage("Select at least one customer for the campaign");
      return;
    }
    selected.slice(0, 25).forEach((item, index) => {
      const phone = item.customer.phone ? normalizePhoneForWhatsApp(item.customer.phone) : "";
      if (!phone) return;
      const textMessage = encodeURIComponent(campaignMessage.trim());
      const url = `https://web.whatsapp.com/send?phone=${phone}&text=${textMessage}`;
      setTimeout(() => window.open(url, "_blank"), index * 250);
    });
    setStatusMessage(`Opened WhatsApp for ${Math.min(selected.length,25)} selected customers`);
  }

  function getCustomerFavoriteItems(orders: OrderView[]) {
    const counts = new Map<string, number>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = String(item.product_name || '').trim();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + Number(item.quantity || 0));
      });
    });
    return Array.from(counts.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }

  function getCustomerTag(summary: CustomerSummary | null) {
    if (!summary) return 'New';
    if (summary.total_spend >= 10000 || summary.total_visits >= 12) return 'VIP';
    if (summary.total_visits >= 6) return 'Loyal';
    if (summary.total_visits >= 2) return 'Returning';
    return 'New';
  }

  const stockAuditSummaryByItem = useMemo(() => {
    const summary: Record<number, { purchases: number; sales: number; adjustments: number }> = {};

    inventoryItems.forEach((item) => {
      summary[item.id] = { purchases: 0, sales: 0, adjustments: 0 };
    });

    vendorShipmentLines.forEach((line) => {
      const shipment = vendorShipments.find((row) => Number(row.id) === Number(line.shipment_id));
      if (!shipment || getDateOnly(shipment.delivery_date) !== stockAuditDate) return;
      const itemId = Number(line.inventory_item_id || 0);
      if (!summary[itemId]) summary[itemId] = { purchases: 0, sales: 0, adjustments: 0 };
      summary[itemId].purchases += Number(line.quantity || 0);
    });

    inventoryMovements.forEach((movement) => {
      if (getDateOnly(movement.created_at) !== stockAuditDate) return;
      const itemId = Number(movement.inventory_item_id || 0);
      if (!summary[itemId]) summary[itemId] = { purchases: 0, sales: 0, adjustments: 0 };
      const qty = Number(movement.quantity_change || 0);
      if (movement.movement_type === "purchase_addition") return;
      if (movement.movement_type === "sale_deduction" || movement.movement_type === "modifier_deduction") {
        summary[itemId].sales += Math.abs(qty);
      } else {
        summary[itemId].adjustments += qty;
      }
    });

    return summary;
  }, [inventoryItems, inventoryMovements, stockAuditDate, vendorShipmentLines, vendorShipments]);

  useEffect(() => {
    const rows: StockAuditEditorRow[] = inventoryItems
      .slice()
      .sort((a, b) => a.item_name.localeCompare(b.item_name))
      .map((item) => {
        const summary = stockAuditSummaryByItem[item.id] || { purchases: 0, sales: 0, adjustments: 0 };
        const openingRaw = Number(item.current_stock || 0) - summary.purchases + summary.sales - summary.adjustments;
        const displayUnit = getInventoryDisplayUnit(item);
        const openingDisplay = getInventoryDisplayQuantity(openingRaw, item);
        const purchasesDisplay = getInventoryDisplayQuantity(summary.purchases, item);
        const salesDisplay = getInventoryDisplayQuantity(summary.sales, item);
        const adjustmentsDisplay = getInventoryDisplayQuantity(summary.adjustments, item);
        const systemDisplay = getInventoryDisplayQuantity(Number(item.current_stock || 0), item);
        return {
          inventory_item_id: item.id,
          item_name: item.item_name,
          display_unit: displayUnit,
          opening_stock_display: openingDisplay,
          purchases_display: purchasesDisplay,
          sales_display: salesDisplay,
          adjustments_display: adjustmentsDisplay,
          system_stock_display: systemDisplay,
          actual_stock_input: formatAuditQty(systemDisplay, displayUnit),
          variance_display: 0,
          wastage_input: "",
          damages_input: "",
          variance_reason: "count_correction",
          note: "",
        };
      });
    setStockAuditEditorRows(rows);
  }, [inventoryItems, stockAuditDate, stockAuditSummaryByItem]);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadElectronPrinting = async () => {
      const electronPOS = (window as any).electronPOS;
      if (!electronPOS) return;

      try {
        const printers = await electronPOS.listPrinters();
        setAvailablePrinters(printers || []);

        const settings = await electronPOS.loadPrintSettings();
        if (!settings) return;

        setReceiptKitchenPrinter(settings.receiptKitchenPrinter || "");
        setStickerPrinter(settings.stickerPrinter || "");
        setAutoPrintReceipt(settings.autoPrintReceipt ?? true);
        setAutoPrintKitchen(settings.autoPrintKitchen ?? true);
        setAutoPrintStickers(settings.autoPrintStickers ?? true);
      } catch (error) {
        console.error("Could not load Electron printing settings", error);
      }
    };

    loadElectronPrinting();
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

    setCategories(
      (data || []).map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        active: item.active ?? null,
      }))
    );
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

    setModifierLibrary(
      (data || []).map((item: any) => ({
        id: Number(item.id),
        name: String(item.name),
        price_delta: Number(item.price_delta || 0),
        active: item.active ?? null,
      }))
    );
  }

  async function loadModifierInventoryEffects() {
    const { data, error } = await supabase
      .from("modifier_inventory_effects")
      .select("modifier_id, inventory_item_id, quantity_delta, deduction_unit");

    if (error) {
      setModifierInventoryEffects([]);
      return;
    }

    setModifierInventoryEffects(
      (data || []).map((row: any) => ({
        modifier_id: Number(row.modifier_id),
        inventory_item_id: Number(row.inventory_item_id),
        quantity_delta: Number(row.quantity_delta || 0),
        deduction_unit: String(row.deduction_unit || ""),
      }))
    );
  }


  async function loadPaymentMethods() {
    const { data: methodsData, error: methodsError } = await supabase
      .from("payment_methods")
      .select("*")
      .order("name", { ascending: true });

    if (methodsError) {
      setStatusMessage(`Could not load payment methods: ${methodsError.message}`);
      return;
    }

    const methods: PaymentMethod[] = (methodsData || []).map((item: any) => ({
      id: Number(item.id),
      name: String(item.name),
      active: item.active ?? null,
    }));
    setPaymentMethods(methods);

    if (!selectedPaymentMethodId) {
      const firstActive = methods.find((m) => m.active !== false);
      if (firstActive) setSelectedPaymentMethodId(firstActive.id);
    }

    const { data: linkData, error: linkError } = await supabase
      .from("payment_method_taxes")
      .select("*");

    if (linkError) {
      setStatusMessage(`Could not load payment method taxes: ${linkError.message}`);
      return;
    }

    const map: Record<number, number[]> = {};
    (linkData || []).forEach((link: any) => {
      const paymentMethodId = Number(link.payment_method_id);
      const salesTaxId = Number(link.sales_tax_id);
      if (!map[paymentMethodId]) map[paymentMethodId] = [];
      map[paymentMethodId].push(salesTaxId);
    });

    setPaymentMethodTaxMap(map);
  }

  async function loadSalesTaxes() {
    const { data, error } = await supabase
      .from("sales_taxes")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load sales taxes: ${error.message}`);
      return;
    }

    setSalesTaxes(
      (data || []).map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        rate_percent: Number(item.rate_percent || 0),
        active: item.active ?? null,
      }))
    );
  }

  async function loadPromotions() {
    const { data, error } = await supabase
      .from("loyalty_promotions")
      .select("*")
      .order("start_at", { ascending: false });

    if (error) {
      setStatusMessage(`Could not load promotions: ${error.message}`);
      return;
    }

    setPromotions(
      (data || []).map((item: any) => ({
        id: String(item.id),
        name: String(item.name),
        start_at: String(item.start_at),
        end_at: String(item.end_at),
        multiplier: Number(item.multiplier || 1),
        active: item.active ?? null,
      }))
    );
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

    const productToCategoryIds: Record<number, string[]> = {};
    (productCategoryLinks || []).forEach((link: any) => {
      const productId = Number(link.product_id);
      const categoryId = String(link.category_id);
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

    const categoryMap = new Map<string, Category>();
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
    const paymentMethodIds = rawOrders
      .map((o) => o.payment_method_id)
      .filter((id) => id !== null && id !== undefined);

    const customerMap = new Map<number, CustomerRow>();
    const itemsMap = new Map<number, OrderItemRow[]>();
    const paymentMethodNameMap = new Map<number, string>();

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
          reward_points: Number(c.reward_points || 0),
          lifetime_eligible_spend: Number(c.lifetime_eligible_spend || 0),
          manual_bonus_percent: Number(c.manual_bonus_percent || 0),
        });
      });
    }

    if (paymentMethodIds.length > 0) {
      const { data: paymentMethodsData } = await supabase
        .from("payment_methods")
        .select("*")
        .in("id", paymentMethodIds);

      (paymentMethodsData || []).forEach((pm: any) => {
        paymentMethodNameMap.set(Number(pm.id), String(pm.name));
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
      subtotal: Number(order.subtotal || 0),
      tax_total: Number(order.tax_total || 0),
      discount_total: Number(order.discount_total || 0),
      points_earned: Number(order.points_earned || 0),
      points_redeemed: Number(order.points_redeemed || 0),
      eligible_subtotal: Number(order.eligible_subtotal || 0),
      non_eligible_subtotal: Number(order.non_eligible_subtotal || 0),
      effective_reward_percent: Number(order.effective_reward_percent || 0),
      reward_multiplier: Number(order.reward_multiplier || 1),
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
      payment_method_id:
        order.payment_method_id === null || order.payment_method_id === undefined
          ? null
          : Number(order.payment_method_id),
      payment_method_name:
        order.payment_method_id === null || order.payment_method_id === undefined
          ? null
          : paymentMethodNameMap.get(Number(order.payment_method_id)) || null,
    }));
  }

  async function loadActiveOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["Preparing", "Ready"])
      .is("collected_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      setStatusMessage(`Could not load active orders: ${error.message}`);
      return;
    }

    setActiveOrders(await buildOrdersWithRelations(data || []));
  }

  async function loadCompletedOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .in("status", ["Completed", "Collected"])
      .order("collected_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatusMessage(`Could not load completed orders: ${error.message}`);
      return;
    }

    setCompletedOrders(await buildOrdersWithRelations(data || []));
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

    const completedWithReady = completedToday.filter((row) => row.ready_at && row.created_at);

    if (completedWithReady.length > 0) {
      const totalSeconds = completedWithReady.reduce((sum, row) => {
        return sum + getElapsedSeconds(String(row.created_at), String(row.ready_at));
      }, 0);
      setAverageFulfillmentSeconds(Math.floor(totalSeconds / completedWithReady.length));
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

  async function loadCustomerList() {
    const { data: customersData, error } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false })
      .limit(300);

    if (error) {
      setStatusMessage(`Could not load customer list: ${error.message}`);
      return;
    }

    const customerRows: CustomerRow[] = (customersData || []).map((c: any) => ({
      id: Number(c.id),
      name: c.name ?? null,
      phone: String(c.phone),
      reward_points: Number(c.reward_points || 0),
      lifetime_eligible_spend: Number(c.lifetime_eligible_spend || 0),
      manual_bonus_percent: Number(c.manual_bonus_percent || 0),
    }));

    const customerIds = customerRows.map((c) => c.id);

    let orders: any[] = [];
    let ledger: any[] = [];

    if (customerIds.length > 0) {
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .in("customer_id", customerIds);

      orders = orderData || [];

      const { data: ledgerData } = await supabase
        .from("customer_points_ledger")
        .select("*")
        .in("customer_id", customerIds);

      ledger = ledgerData || [];
    }

    const summaryList: CustomerSummary[] = customerRows.map((customer) => {
      const customerOrders = orders.filter((o) => Number(o.customer_id) === customer.id);
      const customerLedger = ledger.filter((l) => Number(l.customer_id) === customer.id);

      const totalVisits = customerOrders.length;
      const totalSpend = customerOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const lastVisit =
        customerOrders.length > 0
          ? customerOrders
              .map((o) => String(o.created_at))
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null;

      const totalPointsEarned = customerLedger
        .filter((l) => String(l.entry_type) === "earned")
        .reduce((sum, l) => sum + Number(l.points || 0), 0);

      const totalPointsRedeemed = Math.abs(
        customerLedger
          .filter((l) => String(l.entry_type) === "redeemed")
          .reduce((sum, l) => sum + Number(l.points || 0), 0)
      );

      return {
        customer,
        total_visits: totalVisits,
        total_spend: totalSpend,
        last_visit: lastVisit,
        total_points_earned: totalPointsEarned,
        total_points_redeemed: totalPointsRedeemed,
      };
    });

    setCustomerList(summaryList);
  }

  const loadCustomerDetailById = useCallback(async (customerId: number) => {
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .eq("id", customerId)
      .single();

    if (customerError || !customerData) return false;

    const customer: CustomerRow = {
      id: Number(customerData.id),
      name: customerData.name ?? null,
      phone: String(customerData.phone),
      reward_points: Number(customerData.reward_points || 0),
      lifetime_eligible_spend: Number(customerData.lifetime_eligible_spend || 0),
      manual_bonus_percent: Number(customerData.manual_bonus_percent || 0),
    };

    setCurrentCustomer(customer);
    setSelectedCustomerId(customer.id);
    setSelectedCustomerBonusInput(String(customer.manual_bonus_percent || 0));
    setManualBonusInput(String(customer.manual_bonus_percent || 0));
    setCustomerName(customer.name || "");

    const { data: recentOrdersData } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

    const recentOrders = await buildOrdersWithRelations(recentOrdersData || []);
    setCustomerRecentOrders(recentOrders);
    setSelectedCustomerOrders(recentOrders);

    const { data: ledgerData } = await supabase
      .from("customer_points_ledger")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50);

    const ledger: CustomerLedgerEntry[] = (ledgerData || []).map((row: any) => ({
      id: Number(row.id),
      entry_type: String(row.entry_type),
      points: Number(row.points || 0),
      note: row.note ?? null,
      created_at: String(row.created_at),
    }));

    setCustomerPointsLedger(ledger);
    setSelectedCustomerLedger(ledger);

    const summary = customerList.find((item) => item.customer.id === customerId) || null;
    setSelectedCustomerSummary(summary);

    return true;
  }, [customerList]);

  const clearLoadedCustomer = useCallback(() => {
    setCurrentCustomer(null);
    setCustomerRecentOrders([]);
    setCustomerPointsLedger([]);
    setSelectedCustomerId(null);
    setSelectedCustomerSummary(null);
    setSelectedCustomerOrders([]);
    setSelectedCustomerLedger([]);
    setManualBonusInput("");
    setSelectedCustomerBonusInput("");
  }, []);

  const lookupCustomerByPhone = useCallback(async () => {
    const candidates = getPhoneLookupCandidates(customerPhone);
    if (candidates.length === 0) {
      clearLoadedCustomer();
      return false;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .in("phone", candidates);

    if (error) {
      setStatusMessage(`Customer lookup failed: ${error.message}`);
      return false;
    }

    const rows = (data || []) as any[];
    if (rows.length === 0) {
      clearLoadedCustomer();
      setStatusMessage("No customer found for this phone");
      return false;
    }

    const exact =
      rows.find((row) => normalizePhoneForStorage(String(row.phone)) === normalizePhoneForStorage(customerPhone)) ||
      rows.find((row) => digitsOnly(String(row.phone)) === digitsOnly(customerPhone)) ||
      rows[0];

    const found = await loadCustomerDetailById(Number(exact.id));
    if (found) {
      setStatusMessage("Customer found");
      setViewMode("pos");
      return true;
    }

    return false;
  }, [clearLoadedCustomer, customerPhone, loadCustomerDetailById]);

  async function loadVendors() {
    const { data, error } = await supabase
      .from("vendors")
      .select("*")
      .order("vendor_name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load vendors: ${error.message}`);
      return;
    }

    setVendors((data || []).map((row: any) => ({
      id: Number(row.id),
      vendor_name: String(row.vendor_name),
      contact_person: row.contact_person ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      payment_terms: row.payment_terms ?? null,
      active: row.active ?? null,
    })));
  }

  async function loadInventoryItems() {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("item_name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load inventory items: ${error.message}`);
      return;
    }

    const categoryMap = new Map<number, string>();
    if (inventoryItemCategories.length > 0) {
      inventoryItemCategories.forEach((row) => categoryMap.set(row.id, row.category_name));
    } else {
      const { data: categoryData } = await supabase.from("inventory_item_categories").select("id,category_name");
      (categoryData || []).forEach((row: any) => categoryMap.set(Number(row.id), String(row.category_name)));
    }

    const vendorMap = new Map<number, string>();
    if (vendors.length > 0) {
      vendors.forEach((row) => vendorMap.set(row.id, row.vendor_name));
    } else {
      const { data: vendorData } = await supabase.from("vendors").select("id,vendor_name");
      (vendorData || []).forEach((row: any) => vendorMap.set(Number(row.id), String(row.vendor_name)));
    }

    const itemIds = (data || []).map((row: any) => Number(row.id));
    const defaultVendorByItem = new Map<number, number>();
    if (itemIds.length > 0) {
      const { data: links } = await supabase
        .from("vendor_inventory_items")
        .select("inventory_item_id,vendor_id,default_vendor")
        .in("inventory_item_id", itemIds);

      (links || []).forEach((row: any) => {
        if (row.default_vendor) defaultVendorByItem.set(Number(row.inventory_item_id), Number(row.vendor_id));
      });
    }

    setInventoryItems((data || []).map((row: any) => {
      const defaultVendorId = defaultVendorByItem.get(Number(row.id)) ?? (row.default_vendor_id == null ? null : Number(row.default_vendor_id));
      return {
        id: Number(row.id),
        item_name: String(row.item_name),
        sku: row.sku ?? null,
        unit: String(row.unit || "pcs"),
        item_type: String(row.item_type || "ingredient"),
        measurement_mode: row.measurement_mode ?? null,
        case_size_each: row.case_size_each == null ? null : Number(row.case_size_each),
        category_id: row.category_id == null ? null : Number(row.category_id),
        category_name: row.category_id == null ? null : (categoryMap.get(Number(row.category_id)) || null),
        default_vendor_id: defaultVendorId,
        default_vendor_name: defaultVendorId == null ? null : (vendorMap.get(defaultVendorId) || null),
        current_stock: Number(row.current_stock || 0),
        low_stock_threshold: Number(row.low_stock_threshold || 0),
        reorder_level: Number(row.reorder_level || 0),
        active: row.active ?? null,
      };
    }));
  }

  async function loadVendorShipments() {
    const { data, error } = await supabase
      .from("vendor_shipments")
      .select("*")
      .order("delivery_date", { ascending: false })
      .limit(100);

    if (error) {
      setStatusMessage(`Could not load shipments: ${error.message}`);
      return;
    }

    const vendorIds = Array.from(new Set((data || []).map((row: any) => Number(row.vendor_id)).filter(Boolean)));
    const vendorMap = new Map<number, string>();
    if (vendorIds.length > 0) {
      const { data: vendorData } = await supabase.from("vendors").select("id,vendor_name").in("id", vendorIds);
      (vendorData || []).forEach((row: any) => vendorMap.set(Number(row.id), String(row.vendor_name)));
    }

    setVendorShipments((data || []).map((row: any) => ({
      id: Number(row.id),
      vendor_id: Number(row.vendor_id),
      vendor_name: vendorMap.get(Number(row.vendor_id)) || "-",
      shipment_number: row.shipment_number ?? null,
      invoice_number: row.invoice_number ?? null,
      delivery_date: String(row.delivery_date),
      total_amount: Number(row.total_amount || 0),
      paid_amount: Number(row.paid_amount || 0),
      outstanding_amount: Number(row.outstanding_amount || 0),
      payment_status: String(row.payment_status || "unpaid"),
      fully_paid_at: row.fully_paid_at ?? null,
    })));
  }

  async function loadVendorShipmentLines() {
    const { data, error } = await supabase
      .from("vendor_shipment_lines")
      .select("*")
      .order("id", { ascending: false })
      .limit(300);

    if (error) {
      setStatusMessage(`Could not load shipment lines: ${error.message}`);
      return;
    }

    setVendorShipmentLines((data || []).map((row: any) => ({
      id: Number(row.id),
      shipment_id: Number(row.shipment_id),
      inventory_item_id: Number(row.inventory_item_id),
      quantity: Number(row.quantity || 0),
      unit_cost: row.unit_cost == null ? null : Number(row.unit_cost),
      line_total: Number(row.line_total || 0),
      supply_model: String(row.supply_model || ""),
      revenue_share_percent: row.revenue_share_percent == null ? null : Number(row.revenue_share_percent),
      expiry_date: row.expiry_date ?? null,
    })));
  }

  async function loadOrderCosts() {
    const { data, error } = await supabase
      .from("order_costs")
      .select("*")
      .order("deducted_at", { ascending: false });

    if (error) {
      setStatusMessage(`Could not load order costs: ${error.message}`);
      return;
    }

    setOrderCosts((data || []).map((row: any) => ({
      order_id: Number(row.order_id),
      actual_cogs: Number(row.actual_cogs || 0),
      gross_profit: Number(row.gross_profit || 0),
      deducted_at: row.deducted_at ?? null,
      notes: row.notes ?? null,
    })));
  }

  async function loadInventoryMovements() {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setStatusMessage(`Could not load inventory movements: ${error.message}`);
      return;
    }

    setInventoryMovements((data || []).map((row: any) => ({
      id: Number(row.id),
      inventory_item_id: Number(row.inventory_item_id),
      order_id: row.order_id == null ? null : Number(row.order_id),
      product_id: row.product_id == null ? null : Number(row.product_id),
      product_name: row.product_name ?? null,
      movement_type: String(row.movement_type || ""),
      quantity_change: Number(row.quantity_change || 0),
      unit: row.unit ?? null,
      batch_id: row.batch_id == null ? null : Number(row.batch_id),
      unit_cost: Number(row.unit_cost || 0),
      line_cost: Number(row.line_cost || 0),
      note: row.note ?? null,
      created_at: row.created_at ?? null,
    })));
  }

  async function loadVendorPayments() {
    const { data, error } = await supabase
      .from("vendor_payments")
      .select("*")
      .order("payment_date", { ascending: false })
      .limit(100);

    if (error) {
      setStatusMessage(`Could not load vendor payments: ${error.message}`);
      return;
    }

    const vendorIds = Array.from(new Set((data || []).map((row: any) => Number(row.vendor_id)).filter(Boolean)));
    const vendorMap = new Map<number, string>();
    if (vendorIds.length > 0) {
      const { data: vendorData } = await supabase.from("vendors").select("id,vendor_name").in("id", vendorIds);
      (vendorData || []).forEach((row: any) => vendorMap.set(Number(row.id), String(row.vendor_name)));
    }

    setVendorPayments((data || []).map((row: any) => ({
      id: Number(row.id),
      vendor_id: Number(row.vendor_id),
      vendor_name: vendorMap.get(Number(row.vendor_id)) || "-",
      shipment_id: row.shipment_id == null ? null : Number(row.shipment_id),
      payment_date: String(row.payment_date),
      amount: Number(row.amount || 0),
      payment_method: row.payment_method ?? null,
      reference_number: row.reference_number ?? null,
    })));
  }

  async function loadVendorPayables() {
    const { data, error } = await supabase
      .from("vendor_payables")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setStatusMessage(`Could not load vendor payables: ${error.message}`);
      return;
    }

    setVendorPayables((data || []).map((row: any) => ({
      id: Number(row.id),
      vendor_id: Number(row.vendor_id),
      shipment_id: row.shipment_id == null ? null : Number(row.shipment_id),
      amount_total: Number(row.amount_total || 0),
      amount_paid: Number(row.amount_paid || 0),
      amount_outstanding: Number(row.amount_outstanding || 0),
      status: String(row.status || "unpaid"),
    })));
  }

  async function loadInventoryBatches() {
    const { data, error } = await supabase
      .from("inventory_batches")
      .select("*")
      .order("expiry_date", { ascending: true })
      .limit(200);

    if (error) {
      setStatusMessage(`Could not load inventory batches: ${error.message}`);
      return;
    }

    const itemIds = Array.from(new Set((data || []).map((row: any) => Number(row.inventory_item_id)).filter(Boolean)));
    const vendorIds = Array.from(new Set((data || []).map((row: any) => Number(row.vendor_id)).filter(Boolean)));
    const itemMap = new Map<number, string>();
    const vendorMap = new Map<number, string>();

    if (itemIds.length > 0) {
      const { data: itemData } = await supabase.from("inventory_items").select("id,item_name").in("id", itemIds);
      (itemData || []).forEach((row: any) => itemMap.set(Number(row.id), String(row.item_name)));
    }
    if (vendorIds.length > 0) {
      const { data: vendorData } = await supabase.from("vendors").select("id,vendor_name").in("id", vendorIds);
      (vendorData || []).forEach((row: any) => vendorMap.set(Number(row.id), String(row.vendor_name)));
    }

    setInventoryBatches((data || []).map((row: any) => ({
      id: Number(row.id),
      inventory_item_id: Number(row.inventory_item_id),
      item_name: itemMap.get(Number(row.inventory_item_id)) || "-",
      vendor_id: row.vendor_id == null ? null : Number(row.vendor_id),
      vendor_name: row.vendor_id == null ? null : vendorMap.get(Number(row.vendor_id)) || "-",
      shipment_id: row.shipment_id == null ? null : Number(row.shipment_id),
      batch_code: row.batch_code ?? null,
      delivery_date: String(row.delivery_date),
      expiry_date: row.expiry_date ?? null,
      quantity_received: Number(row.quantity_received || 0),
      quantity_remaining: Number(row.quantity_remaining || 0),
      status: String(row.status || "active"),
    })));
  }


  async function loadStockAudits() {
    const { data, error } = await supabase
      .from("stock_audits")
      .select("*")
      .order("audit_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Could not load stock audits", error.message);
      setStockAudits([]);
      return;
    }

    setStockAudits(
      (data || []).map((row: any) => ({
        id: Number(row.id),
        audit_date: String(row.audit_date),
        audit_mode: String(row.audit_mode || "closing") === "opening" ? "opening" : "closing",
        notes: row.notes ?? null,
        created_at: row.created_at ?? null,
      }))
    );
  }

  async function loadStockAuditLines() {
    const { data, error } = await supabase
      .from("stock_audit_lines")
      .select("*")
      .order("id", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("Could not load stock audit lines", error.message);
      setStockAuditLines([]);
      return;
    }

    setStockAuditLines(
      (data || []).map((row: any) => ({
        id: Number(row.id),
        audit_id: Number(row.audit_id),
        inventory_item_id: Number(row.inventory_item_id),
        display_unit: String(row.display_unit || ""),
        opening_stock_raw: Number(row.opening_stock_raw || 0),
        purchases_raw: Number(row.purchases_raw || 0),
        sales_raw: Number(row.sales_raw || 0),
        adjustments_raw: Number(row.adjustments_raw || 0),
        system_stock_raw: Number(row.system_stock_raw || 0),
        actual_stock_raw: Number(row.actual_stock_raw || 0),
        variance_raw: Number(row.variance_raw || 0),
        wastage_raw: Number(row.wastage_raw || 0),
        damages_raw: Number(row.damages_raw || 0),
        variance_reason: row.variance_reason ?? null,
        note: row.note ?? null,
      }))
    );
  }

  async function saveVendor() {
    if (!canViewInventory) {
      setStatusMessage("Inventory is restricted for your role");
      return;
    }

    const payload = {
      vendor_name: vendorForm.vendor_name.trim(),
      contact_person: vendorForm.contact_person.trim() || null,
      phone: vendorForm.phone.trim() || null,
      email: vendorForm.email.trim() || null,
      payment_terms: vendorForm.payment_terms.trim() || null,
      active: vendorForm.active,
    };

    if (!payload.vendor_name) {
      setStatusMessage("Enter vendor name");
      return;
    }

    if (vendorForm.id) {
      const { error } = await supabase.from("vendors").update(payload).eq("id", vendorForm.id);
      if (error) {
        setStatusMessage(`Could not update vendor: ${error.message}`);
        return;
      }
      setStatusMessage("Vendor updated");
    } else {
      const { error } = await supabase.from("vendors").insert(payload);
      if (error) {
        setStatusMessage(`Could not create vendor: ${error.message}`);
        return;
      }
      setStatusMessage("Vendor created");
    }

    setVendorForm({
      id: null, vendor_name: "", contact_person: "", phone: "", email: "", payment_terms: "", active: true
    });
    await loadVendors();
  }

  function resetInventoryItemForm() {
    setInventoryItemPicker("new");
    setInventoryItemForm({
      id: null,
      item_name: "",
      sku: "",
      unit: "pcs",
      item_type: "ingredient",
      measurement_mode: "each",
      case_size_each: "",
      category_id: null,
      default_vendor_id: null,
      current_stock: "0",
      low_stock_threshold: "0",
      reorder_level: "0",
      active: true,
    });
  }

  async function loadInventoryItemCategories() {
    const { data, error } = await supabase
      .from("inventory_item_categories")
      .select("*")
      .order("category_name", { ascending: true });

    if (error) {
      setStatusMessage(`Could not load inventory categories: ${error.message}`);
      return;
    }

    setInventoryItemCategories((data || []).map((row: any) => ({
      id: Number(row.id),
      category_name: String(row.category_name),
      active: row.active ?? null,
    })));
  }

  async function saveInventoryCategory() {
    if (!canViewInventory) {
      setStatusMessage("Inventory is restricted for your role");
      return;
    }

    const name = inventoryCategoryForm.category_name.trim();
    if (!name) {
      setStatusMessage("Enter category name");
      return;
    }

    const { error } = await supabase
      .from("inventory_item_categories")
      .insert({ category_name: name, active: true });

    if (error) {
      setStatusMessage(`Could not create inventory category: ${error.message}`);
      return;
    }

    setInventoryCategoryForm({ category_name: "" });
    await loadInventoryItemCategories();
    setStatusMessage("Inventory category created");
  }

  async function deleteInventoryItem() {
    if (!inventoryItemForm.id) {
      setStatusMessage("Choose an inventory item first");
      return;
    }

    const itemId = inventoryItemForm.id;
    const itemName = inventoryItemForm.item_name;

    const { error: linkError } = await supabase
      .from("vendor_inventory_items")
      .delete()
      .eq("inventory_item_id", itemId);

    if (linkError) {
      setStatusMessage(`Could not remove vendor links: ${linkError.message}`);
      return;
    }

    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", itemId);

    if (error) {
      setStatusMessage(`Could not delete inventory item: ${error.message}`);
      return;
    }

    resetInventoryItemForm();
    await loadInventoryItems();
    setStatusMessage(`Inventory item deleted: ${itemName}`);
  }

  async function saveInventoryItem() {
    if (!canViewInventory) {
      setStatusMessage("Inventory is restricted for your role");
      return;
    }

    const itemName = inventoryItemForm.item_name.trim();
    if (!itemName) {
      setStatusMessage("Enter inventory item name");
      return;
    }

    let unitValue = inventoryItemForm.unit.trim() || "pcs";
    let caseQuantityValue: number | null = null;

    if (inventoryItemForm.measurement_mode === "grams") unitValue = "g";
    if (inventoryItemForm.measurement_mode === "kg") unitValue = "kg";
    if (inventoryItemForm.measurement_mode === "pounds") unitValue = "lb";
    if (inventoryItemForm.measurement_mode === "each") unitValue = "pcs";

    if (inventoryItemForm.measurement_mode === "case_6") {
      unitValue = "case";
      caseQuantityValue = 6;
    }
    if (inventoryItemForm.measurement_mode === "case_12") {
      unitValue = "case";
      caseQuantityValue = 12;
    }
    if (inventoryItemForm.measurement_mode === "case_24") {
      unitValue = "case";
      caseQuantityValue = 24;
    }
    if (inventoryItemForm.measurement_mode === "custom_case") {
      unitValue = "case";
      caseQuantityValue = Math.max(1, Number(inventoryItemForm.case_size_each || 0));
    }

    const payload = {
      item_name: itemName,
      sku: inventoryItemForm.sku.trim() || null,
      unit: unitValue,
      item_type: inventoryItemForm.item_type.trim() || "ingredient",
      measurement_mode: inventoryItemForm.measurement_mode,
      case_size_each: caseQuantityValue,
      category_id: inventoryItemForm.category_id,
      default_vendor_id: inventoryItemForm.default_vendor_id,
      current_stock: Number(inventoryItemForm.current_stock || 0),
      low_stock_threshold: Number(inventoryItemForm.low_stock_threshold || 0),
      reorder_level: Number(inventoryItemForm.reorder_level || 0),
      active: inventoryItemForm.active,
    };

    let itemId = inventoryItemForm.id;

    if (inventoryItemForm.id) {
      const { error } = await supabase.from("inventory_items").update(payload).eq("id", inventoryItemForm.id);
      if (error) {
        setStatusMessage(`Could not update inventory item: ${error.message}`);
        return;
      }
      setStatusMessage("Inventory item updated");
      itemId = inventoryItemForm.id;
    } else {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setStatusMessage(`Could not create inventory item: ${error?.message || "Unknown error"}`);
        return;
      }
      itemId = Number(data.id);
      setStatusMessage("Inventory item created");
    }

    if (itemId) {
      await supabase
        .from("vendor_inventory_items")
        .update({ default_vendor: false })
        .eq("inventory_item_id", itemId);

      if (inventoryItemForm.default_vendor_id) {
        const { data: existingLink } = await supabase
          .from("vendor_inventory_items")
          .select("id")
          .eq("inventory_item_id", itemId)
          .eq("vendor_id", inventoryItemForm.default_vendor_id)
          .maybeSingle();

        if (existingLink?.id) {
          await supabase
            .from("vendor_inventory_items")
            .update({ default_vendor: true, active: true })
            .eq("id", existingLink.id);
        } else {
          await supabase
            .from("vendor_inventory_items")
            .insert({
              vendor_id: inventoryItemForm.default_vendor_id,
              inventory_item_id: itemId,
              supply_model: "outright_purchase",
              default_vendor: true,
              active: true,
            });
        }
      }
    }

    resetInventoryItemForm();
    await loadInventoryItems();
  }

  function addShipmentLineRow() {
    setShipmentLines((prev) => [...prev, {
      inventory_item_id: null,
      quantity: "",
      unit_cost: "",
      line_total: "",
      batch_code: "",
      expiry_date: "",
      supply_model: "outright_purchase",
    }]);
  }

  function updateShipmentLine(index: number, patch: Partial<ShipmentLineForm>) {
    setShipmentLines((prev) => prev.map((line, idx) => idx === index ? { ...line, ...patch } : line));
  }

  function removeShipmentLine(index: number) {
    setShipmentLines((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function createVendorShipment() {
    if (!canViewInventory) {
      setStatusMessage("Inventory is restricted for your role");
      return;
    }
    if (!shipmentForm.vendor_id) {
      setStatusMessage("Select vendor");
      return;
    }

    const validLines = shipmentLines.filter((line) => line.inventory_item_id && Number(line.quantity || 0) > 0);
    if (validLines.length === 0) {
      setStatusMessage("Add at least one shipment line");
      return;
    }

    const { data: shipmentData, error: shipmentError } = await supabase
      .from("vendor_shipments")
      .insert({
        vendor_id: shipmentForm.vendor_id,
        shipment_number: shipmentForm.shipment_number.trim() || null,
        invoice_number: shipmentForm.invoice_number.trim() || null,
        delivery_date: shipmentForm.delivery_date,
        notes: shipmentForm.notes.trim() || null,
      })
      .select("id")
      .single();

    if (shipmentError || !shipmentData) {
      setStatusMessage(`Could not create shipment: ${shipmentError?.message || "Unknown error"}`);
      return;
    }

    const shipmentId = Number(shipmentData.id);
    const lineRows = validLines.map((line) => {
      const quantity = Number(line.quantity || 0);
      const unitCost = Number(line.unit_cost || 0);
      const lineTotal = Number(line.line_total || quantity * unitCost);
      return {
        shipment_id: shipmentId,
        inventory_item_id: line.inventory_item_id,
        quantity,
        unit_cost: unitCost,
        line_total: lineTotal,
        batch_code: line.batch_code.trim() || null,
        expiry_date: line.expiry_date || null,
        supply_model: line.supply_model || "outright_purchase",
      };
    });

    const { error: linesError } = await supabase.from("vendor_shipment_lines").insert(lineRows);
    if (linesError) {
      setStatusMessage(`Could not create shipment lines: ${linesError.message}`);
      return;
    }

    setShipmentForm({
      vendor_id: null,
      shipment_number: "",
      invoice_number: "",
      delivery_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setShipmentLines([{
      inventory_item_id: null,
      quantity: "",
      unit_cost: "",
      line_total: "",
      batch_code: "",
      expiry_date: "",
      supply_model: "outright_purchase",
    }]);
    setStatusMessage("Shipment created");
    await loadVendorShipments();
    await loadVendorShipmentLines();
    await loadInventoryBatches();
    await loadInventoryItems();
    await loadVendorPayables();
  }

  async function recordVendorPayment() {
    if (!canViewInventory) {
      setStatusMessage("Inventory is restricted for your role");
      return;
    }
    if (!vendorPaymentForm.vendor_id || Number(vendorPaymentForm.amount || 0) <= 0) {
      setStatusMessage("Select vendor and enter payment amount");
      return;
    }

    const selectedShipment = vendorShipments.find((s) => s.id === vendorPaymentForm.shipment_id) || null;
    const selectedPayable = selectedShipment
      ? vendorPayables.find((p) => p.shipment_id === selectedShipment.id && p.vendor_id === selectedShipment.vendor_id) || null
      : null;

    const { error } = await supabase.from("vendor_payments").insert({
      vendor_id: vendorPaymentForm.vendor_id,
      shipment_id: vendorPaymentForm.shipment_id || null,
      payable_id: selectedPayable?.id || null,
      payment_date: vendorPaymentForm.payment_date,
      amount: Number(vendorPaymentForm.amount || 0),
      payment_method: vendorPaymentForm.payment_method.trim() || null,
      reference_number: vendorPaymentForm.reference_number.trim() || null,
      notes: vendorPaymentForm.notes.trim() || null,
      created_by: staffProfile?.id || null,
    });

    if (error) {
      setStatusMessage(`Could not record vendor payment: ${error.message}`);
      return;
    }

    setVendorPaymentForm({
      vendor_id: null,
      shipment_id: null,
      amount: "",
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      reference_number: "",
      notes: "",
    });
    setStatusMessage("Vendor payment recorded");
    await loadVendorPayments();
    await loadVendorShipments();
    await loadVendorPayables();
  }


  async function saveStockAudit() {
    try {
      if (stockAuditEditorRows.length === 0) {
        setStatusMessage("No inventory items available for audit");
        return;
      }

      const { data: auditHeader, error: auditError } = await supabase
        .from("stock_audits")
        .insert({
          audit_date: stockAuditDate,
          audit_mode: stockAuditMode,
          notes: stockAuditNotes.trim() || null,
          created_by: staffProfile?.id || null,
        })
        .select("id")
        .single();

      if (auditError || !auditHeader) {
        throw new Error(`Could not save stock audit header: ${auditError?.message || "Unknown error"}`);
      }

      const auditId = Number(auditHeader.id);
      const linePayload: any[] = [];

      for (const row of stockAuditEditorRows) {
        const item = inventoryItems.find((inventoryItem) => inventoryItem.id === row.inventory_item_id);
        if (!item) continue;

        const actualDisplay = Number(row.actual_stock_input || 0);
        const actualRaw = convertInventoryDisplayToRaw(actualDisplay, item);
        const systemRaw = Number(item.current_stock || 0);
        const varianceRaw = actualRaw - systemRaw;
        const openingRaw = convertInventoryDisplayToRaw(Number(row.opening_stock_display || 0), item);
        const purchasesRaw = convertInventoryDisplayToRaw(Number(row.purchases_display || 0), item);
        const salesRaw = convertInventoryDisplayToRaw(Number(row.sales_display || 0), item);
        const adjustmentsRaw = convertInventoryDisplayToRaw(Number(row.adjustments_display || 0), item);
        const wastageRaw = convertInventoryDisplayToRaw(Number(row.wastage_input || 0), item);
        const damagesRaw = convertInventoryDisplayToRaw(Number(row.damages_input || 0), item);

        linePayload.push({
          audit_id: auditId,
          inventory_item_id: row.inventory_item_id,
          display_unit: row.display_unit,
          opening_stock_raw: openingRaw,
          purchases_raw: purchasesRaw,
          sales_raw: salesRaw,
          adjustments_raw: adjustmentsRaw,
          system_stock_raw: systemRaw,
          actual_stock_raw: actualRaw,
          variance_raw: varianceRaw,
          wastage_raw: wastageRaw,
          damages_raw: damagesRaw,
          variance_reason: row.variance_reason || null,
          note: row.note.trim() || null,
        });

        if (Math.abs(varianceRaw) > 0.000001) {
          const movementType =
            row.variance_reason === "wastage"
              ? "wastage_adjustment"
              : row.variance_reason === "damage"
              ? "damage_adjustment"
              : row.variance_reason === "opening_adjustment"
              ? "opening_stock_adjustment"
              : "stock_audit_adjustment";

          const noteParts = [
            `Stock audit ${auditId}`,
            row.note.trim() || null,
            Number(row.wastage_input || 0) > 0 ? `Wastage ${row.wastage_input} ${row.display_unit}` : null,
            Number(row.damages_input || 0) > 0 ? `Damages ${row.damages_input} ${row.display_unit}` : null,
          ].filter(Boolean);

          const { error: movementError } = await supabase
            .from("inventory_movements")
            .insert({
              inventory_item_id: row.inventory_item_id,
              order_id: null,
              product_id: null,
              product_name: null,
              movement_type: movementType,
              quantity_change: varianceRaw,
              unit: row.display_unit,
              batch_id: null,
              unit_cost: 0,
              line_cost: 0,
              note: noteParts.join(" | "),
            });

          if (movementError) {
            throw new Error(`Could not save stock audit movement: ${movementError.message}`);
          }
        }

        const { error: updateError } = await supabase
          .from("inventory_items")
          .update({ current_stock: actualRaw })
          .eq("id", row.inventory_item_id);

        if (updateError) {
          throw new Error(`Could not update stock after audit: ${updateError.message}`);
        }
      }

      const { error: linesError } = await supabase.from("stock_audit_lines").insert(linePayload);
      if (linesError) {
        throw new Error(`Could not save stock audit lines: ${linesError.message}`);
      }

      setSelectedStockAuditId(auditId);
      setStockAuditNotes("");
      setStatusMessage("Stock audit saved");
      await refreshAll();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save stock audit");
    }
  }

  function updateStockAuditRow(itemId: number, patch: Partial<StockAuditEditorRow>) {
    setStockAuditEditorRows((prev) =>
      prev.map((row) => {
        if (row.inventory_item_id !== itemId) return row;
        const next = { ...row, ...patch };
        const variance = Number(next.actual_stock_input || 0) - Number(next.system_stock_display || 0);
        next.variance_display = variance;
        return next;
      })
    );
  }

  const refreshAll = useCallback(async () => {
    setStatusMessage("Refreshing...");
    await loadCategories();
    await loadModifierLibrary();
    await loadModifierInventoryEffects();
    await loadSalesTaxes();
    await loadPaymentMethods();
    await loadPromotions();
    await loadProducts();
    await loadActiveOrders();
    await loadCompletedOrders();
    await loadReportData();
    await loadCustomerList();
    await loadVendors();
    await loadInventoryItemCategories();
    await loadInventoryItems();
    await loadVendorShipments();
    await loadVendorShipmentLines();
    await loadVendorPayments();
    await loadOrderCosts();
    await loadInventoryMovements();
    await loadVendorPayables();
    await loadInventoryBatches();
    await loadStockAudits();
    await loadStockAuditLines();
    await loadAllProductRecipes();
    setStatusMessage("Ready");
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!selectedRecipeProductId) {
      setProductRecipes([]);
      resetRecipeEditorRows();
      return;
    }
    loadProductRecipes(Number(selectedRecipeProductId));
  }, [selectedRecipeProductId, inventoryItems]);

  useEffect(() => {
    if (!selectedShipmentHistory) return;
    setVendorPaymentForm((prev) => ({
      ...prev,
      vendor_id: Number(selectedShipmentHistory.vendor_id),
      shipment_id: Number(selectedShipmentHistory.id),
      payment_date: new Date().toISOString().slice(0, 10),
      amount: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    }));
    setSelectedShipmentPaymentLineIds([]);
    setVendorPaymentMode("full_intake");
  }, [selectedShipmentHistory?.id]);

  useEffect(() => {
    if (!autoLookupEnabled) return;
    const digits = digitsOnly(customerPhone);
    if (!digits || digits.length < 10) {
      if (!customerPhone.trim()) clearLoadedCustomer();
      return;
    }

    const timer = setTimeout(() => {
      lookupCustomerByPhone();
    }, 350);

    return () => clearTimeout(timer);
  }, [autoLookupEnabled, clearLoadedCustomer, customerPhone, lookupCustomerByPhone]);

  function updateInventoryBatchRow(rowId: string, patch: Partial<InventoryBatchRowForm>) {
    setInventoryBatchRows((prev) =>
      prev.map((row) => {
        if (row.row_id !== rowId) return row;
        const next = { ...row, ...patch };

        if (next.unit_mode === "pack") {
          const qtyPerPack = Number(next.qty_per_pack || 0);
          const numberOfPacks = Number(next.number_of_packs || 0);
          next.total_qty = qtyPerPack > 0 && numberOfPacks > 0 ? String(qtyPerPack * numberOfPacks) : "";
        }

        return next;
      })
    );
  }

  function addInventoryBatchRow() {
    setInventoryBatchRows((prev) => {
      if (prev.length >= 5) {
        setStatusMessage("You can add up to 5 inventory items in one batch");
        return prev;
      }
      return [...prev, makeInventoryBatchRow(prev.length + 1)];
    });
  }

  function removeInventoryBatchRow(rowId: string) {
    setInventoryBatchRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((row) => row.row_id !== rowId);
    });
  }

  function clearInventoryBatchRows() {
    setInventoryBatchRows([makeInventoryBatchRow(1)]);
  }

  async function saveInventoryBatch() {
    try {
      const validRows = inventoryBatchRows.filter((row) => {
        if (row.selected_item_id === "new") return row.new_item_name.trim() !== "";
        return row.selected_item_id.trim() !== "";
      });

      if (validRows.length === 0) {
        setStatusMessage("Add at least one inventory item row");
        return;
      }

      for (const row of validRows) {
        const itemName =
          row.selected_item_id === "new"
            ? row.new_item_name.trim()
            : "";

        const totalQty =
          row.unit_mode === "pack"
            ? Number(row.qty_per_pack || 0) * Number(row.number_of_packs || 0)
            : Number(row.total_qty || 0);

        if (row.selected_item_id === "new" && !itemName) {
          setStatusMessage("Enter item name for new inventory item");
          return;
        }

        if (totalQty <= 0) {
          setStatusMessage("Enter a valid quantity");
          return;
        }
      }

      for (const row of validRows) {
        let categoryId: number | null = row.inventory_category_id ? Number(row.inventory_category_id) : null;

        if (row.inventory_category_id === "new_category" && row.new_inventory_category_name.trim()) {
          const { data: newCategory, error: categoryError } = await supabase
            .from("inventory_item_categories")
            .insert({
              category_name: row.new_inventory_category_name.trim(),
              active: true,
            })
            .select("id")
            .single();

          if (categoryError) {
            throw new Error(`Could not create inventory category: ${categoryError.message}`);
          }

          categoryId = Number(newCategory.id);
        }

        const totalQty =
          row.unit_mode === "pack"
            ? Number(row.qty_per_pack || 0) * Number(row.number_of_packs || 0)
            : Number(row.total_qty || 0);

        const caseSizeEach =
          row.unit_mode === "pack"
            ? Number(row.qty_per_pack || 0)
            : null;

        const payload = {
          item_name:
            row.selected_item_id === "new"
              ? row.new_item_name.trim()
              : undefined,
          sku: null,
          unit: row.unit_mode === "pack" ? "pack" : "pcs",
          item_type: row.item_type,
          current_stock: totalQty,
          low_stock_threshold: Number(row.reorder_threshold || 0),
          reorder_level: Number(row.reorder_threshold || 0),
          category_id: categoryId,
          measurement_mode: row.unit_mode === "pack" ? "case_custom" : "eaches",
          case_size_each: caseSizeEach,
          default_vendor_id: row.default_vendor_id ? Number(row.default_vendor_id) : null,
          active: true,
        };

        if (row.selected_item_id === "new") {
          const { error } = await supabase.from("inventory_items").insert(payload);
          if (error) {
            throw new Error(`Could not create inventory item: ${error.message}`);
          }
        } else {
          const { error } = await supabase
            .from("inventory_items")
            .update({
              current_stock: totalQty,
              low_stock_threshold: Number(row.reorder_threshold || 0),
              reorder_level: Number(row.reorder_threshold || 0),
              category_id: categoryId,
              item_type: row.item_type,
              measurement_mode: row.unit_mode === "pack" ? "case_custom" : "eaches",
              case_size_each: caseSizeEach,
              default_vendor_id: row.default_vendor_id ? Number(row.default_vendor_id) : null,
            })
            .eq("id", Number(row.selected_item_id));
          if (error) {
            throw new Error(`Could not update inventory item: ${error.message}`);
          }
        }
      }

      clearInventoryBatchRows();
      setStatusMessage("Inventory batch saved");
      if (typeof loadInventoryItems === "function") {
        await loadInventoryItems();
      }
      if (typeof loadInventoryItemCategories === "function") {
        await loadInventoryItemCategories();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save inventory batch");
    }
  }



  function normalizeMeasureUnit(rawUnit: string | null | undefined) {
    const unit = String(rawUnit || "").trim().toLowerCase();
    if (["piece", "pieces", "pc", "pcs", "unit", "units", "each", "eaches", "can", "bottle", "carton", "tub", "bag", "box"].includes(unit)) return "eaches";
    if (["g", "gram", "grams"].includes(unit)) return "g";
    if (["kg", "kilogram", "kilograms"].includes(unit)) return "kg";
    if (["ml", "milliliter", "milliliters"].includes(unit)) return "ml";
    if (["l", "ltr", "liter", "liters"].includes(unit)) return "l";
    if (["lb", "lbs", "pound", "pounds"].includes(unit)) return "lb";
    if (["oz", "ounce", "ounces"].includes(unit)) return "oz";
    return unit || "eaches";
  }

  function measureFactorToBase(unitRaw: string | null | undefined) {
    const unit = normalizeMeasureUnit(unitRaw);
    if (unit === "kg") return 1000;
    if (unit === "g") return 1;
    if (unit === "l") return 1000;
    if (unit === "ml") return 1;
    if (unit === "lb") return 453.59237;
    if (unit === "oz") return 28.3495;
    return 1;
  }

  function updateStockIntakeRow(rowId: string, patch: Partial<StockIntakeRowForm>) {
    setStockIntakeRows((prev) =>
      prev.map((row) => {
        if (row.row_id !== rowId) return row;
        const next = { ...row, ...patch };

        if (patch.inventory_item_id) {
          const item = inventoryItems.find((inventoryItem) => String(inventoryItem.id) === patch.inventory_item_id);
          if (item) {
            next.item_search = item.item_name;
            next.inventory_category_id = String(item.category_id || "");
            next.item_type = (item.item_type as "ingredient" | "finished_product") || "ingredient";
            if (normalizeMeasureUnit(next.packing_qty_unit) === "eaches") {
              next.one_unit_size_number = "1";
              next.one_unit_size_unit = "eaches";
            }
          }
        }

        if (patch.vendor_id) {
          const vendor = vendors.find((v) => String(v.id) === patch.vendor_id);
          if (vendor) {
            next.vendor_search = vendor.vendor_name;
          }
        }

        if (normalizeMeasureUnit(next.packing_qty_unit) === "eaches") {
          next.one_unit_size_number = "1";
          next.one_unit_size_unit = "eaches";
        }

        return next;
      })
    );
  }

  function addStockIntakeRow() {
    setStockIntakeRows((prev) => {
      if (prev.length >= 5) {
        setStatusMessage("You can add up to 5 stock intake rows");
        return prev;
      }
      return [...prev, makeStockIntakeRow(prev.length + 1)];
    });
  }

  function removeStockIntakeRow(rowId: string) {
    setStockIntakeRows((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.row_id !== rowId)));
  }

  function clearStockIntakeForm() {
    setStockIntakeForm({
      vendor_id: "",
      delivery_date: "",
      invoice_number: "",
      payment_type: "cash",
      amount_paid_today: "",
      notes: "",
    });
    setStockIntakeRows([makeStockIntakeRow(1)]);
  }

  function getFilteredInventoryOptions(search?: string) {
    const q = String(search || "").trim().toLowerCase();
    const activeItems = inventoryItems.filter((item) => item.active !== false);

    if (!q) return activeItems.slice(0, 12);

    return activeItems
      .filter((item) => String(item.item_name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }

  function getFilteredVendorOptions(search?: string) {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return vendors.slice(0, 12);
    return vendors
      .filter((vendor) => String(vendor.vendor_name || "").toLowerCase().includes(q))
      .slice(0, 12);
  }

  function getTotalPurchaseUnits(row: StockIntakeRowForm) {
    return Number(row.packing_qty_number || 0) * Number(row.number_of_packs || 0);
  }

  function getTotalBaseQuantity(row: StockIntakeRowForm) {
    const packingUnit = normalizeMeasureUnit(row.packing_qty_unit);
    const packingQty = Number(row.packing_qty_number || 0);
    const packs = Number(row.number_of_packs || 0);

    if (packingUnit === "eaches") {
      return packingQty * packs;
    }

    return packingQty * packs * measureFactorToBase(packingUnit);
  }

  function getTotalCostValue(row: StockIntakeRowForm) {
    return Number(row.price || 0);
  }

  function getPricePerBaseLargeUnit(row: StockIntakeRowForm) {
    const totalCost = getTotalCostValue(row);
    const baseQty = getTotalBaseQuantity(row);
    const packingUnit = normalizeMeasureUnit(row.packing_qty_unit);
    const oneUnit = normalizeMeasureUnit(row.one_unit_size_unit);

    if (packingUnit === "eaches") {
      const totalEaches = Number(row.packing_qty_number || 0) * Number(row.number_of_packs || 0);
      return totalEaches > 0 ? totalCost / totalEaches : 0;
    }

    if (["g", "kg", "lb", "oz"].includes(packingUnit) || ["g", "kg", "lb", "oz"].includes(oneUnit)) {
      const totalKg = baseQty / 1000;
      return totalKg > 0 ? totalCost / totalKg : 0;
    }

    if (["ml", "l"].includes(packingUnit) || ["ml", "l"].includes(oneUnit)) {
      const totalL = baseQty / 1000;
      return totalL > 0 ? totalCost / totalL : 0;
    }

    return 0;
  }

  function getPricePerSmallUnit(row: StockIntakeRowForm) {
    const totalCost = getTotalCostValue(row);
    const baseQty = getTotalBaseQuantity(row);
    return baseQty > 0 ? totalCost / baseQty : 0;
  }

  function getLargeUnitLabel(row: StockIntakeRowForm) {
    const packingUnit = normalizeMeasureUnit(row.packing_qty_unit);
    const baseUnit =
      packingUnit === "eaches"
        ? normalizeMeasureUnit(row.one_unit_size_unit)
        : packingUnit;

    if (baseUnit === "eaches") return "Price per Each";
    if (["g", "kg", "lb", "oz"].includes(baseUnit)) return "Price per Kg";
    if (["ml", "l"].includes(baseUnit)) return "Price per L";
    return "Price per Unit";
  }

  function getSmallUnitLabel(row: StockIntakeRowForm) {
    const packingUnit = normalizeMeasureUnit(row.packing_qty_unit);
    const baseUnit =
      packingUnit === "eaches"
        ? normalizeMeasureUnit(row.one_unit_size_unit)
        : packingUnit;

    if (baseUnit === "g" || baseUnit === "kg" || baseUnit === "lb" || baseUnit === "oz") {
      return "Price per Gram";
    }

    if (baseUnit === "ml" || baseUnit === "l") {
      return "Price per ml";
    }

    if (baseUnit === "eaches") {
      return "Price per Each";
    }

    return "Price per Unit";
  }


  async function saveStockIntake() {
    try {
      const validRows = stockIntakeRows.filter((row) => {
        const hasItem =
          String(row.item_search || "").trim() !== "" ||
          String(row.new_item_name || "").trim() !== "" ||
          String(row.inventory_item_id || "").trim() !== "";
        return hasItem;
      });
      if (validRows.length === 0) {
        setStatusMessage("Add at least one stock intake item");
        return;
      }

      for (const row of validRows) {
        if (Number(row.price || 0) <= 0) throw new Error("Enter price for each stock intake row");
        if (Number(row.number_of_packs || 0) <= 0) throw new Error("Enter number of packs for each stock intake row");
        if (Number(row.packing_qty_number || 0) <= 0) throw new Error("Enter packing quantity for each stock intake row");
      }

      let vendorIdForShipment: number | null = null;

      const firstRowWithVendor = validRows.find(
        (row) => row.vendor_id || String(row.new_vendor_name || "").trim()
      );

      if (firstRowWithVendor?.vendor_id) {
        vendorIdForShipment = Number(firstRowWithVendor.vendor_id);
      } else if (firstRowWithVendor && String(firstRowWithVendor.new_vendor_name || "").trim()) {
        const vendorName = String(firstRowWithVendor.new_vendor_name || "").trim();
        const { data: existingVendor } = await supabase
          .from("vendors")
          .select("id")
          .ilike("vendor_name", vendorName)
          .maybeSingle();

        if (existingVendor?.id) {
          vendorIdForShipment = Number(existingVendor.id);
        } else {
          const { data: createdHeaderVendor, error: createdHeaderVendorError } = await supabase
            .from("vendors")
            .insert({
              vendor_name: vendorName,
              active: true,
            })
            .select("id")
            .single();

          if (createdHeaderVendorError) {
            throw new Error(`Could not create vendor: ${createdHeaderVendorError.message}`);
          }

          vendorIdForShipment = Number(createdHeaderVendor.id);
        }
      }

      if (!vendorIdForShipment) {
        const unspecifiedVendorName = "Unspecified Vendor";
        const { data: existingFallbackVendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("vendor_name", unspecifiedVendorName)
          .maybeSingle();

        if (existingFallbackVendor?.id) {
          vendorIdForShipment = Number(existingFallbackVendor.id);
        } else {
          const { data: createdFallbackVendor, error: createdFallbackVendorError } = await supabase
            .from("vendors")
            .insert({
              vendor_name: unspecifiedVendorName,
              active: true,
            })
            .select("id")
            .single();

          if (createdFallbackVendorError) {
            throw new Error(`Could not create fallback vendor: ${createdFallbackVendorError.message}`);
          }

          vendorIdForShipment = Number(createdFallbackVendor.id);
        }
      }

      const shipmentTotal = validRows.reduce((sum, row) => sum + getTotalCostValue(row), 0);
      const amountPaidToday = Number(stockIntakeForm.amount_paid_today || 0);

      const { data: shipment, error: shipmentError } = await supabase
        .from("vendor_shipments")
        .insert({
          vendor_id: vendorIdForShipment,
          invoice_number: stockIntakeForm.invoice_number || null,
          delivery_date: stockIntakeForm.delivery_date || new Date().toISOString().slice(0, 10),
          total_amount: shipmentTotal,
          paid_amount: amountPaidToday,
          outstanding_amount: Math.max(shipmentTotal - amountPaidToday, 0),
          payment_status:
            shipmentTotal <= 0 ? "paid" :
            amountPaidToday <= 0 ? "unpaid" :
            amountPaidToday < shipmentTotal ? "partially_paid" : "paid",
          fully_paid_at: shipmentTotal > 0 && amountPaidToday >= shipmentTotal ? new Date().toISOString() : null,
          notes: stockIntakeForm.notes || null,
        })
        .select("id")
        .single();

      if (shipmentError) throw new Error(`Could not create shipment: ${shipmentError.message}`);

      for (const row of validRows) {
        let inventoryItemId = row.inventory_item_id ? Number(row.inventory_item_id) : null;

        if (!inventoryItemId) {
          const { data: newItem, error: itemError } = await supabase
            .from("inventory_items")
            .insert({
              item_name: row.new_item_name.trim() || row.item_search.trim(),
              sku: null,
              unit: normalizeMeasureUnit(row.one_unit_size_unit) === "eaches" ? "pcs" : normalizeMeasureUnit(row.one_unit_size_unit),
              item_type: row.item_type,
              measurement_mode: "each",
              case_size_each: normalizeMeasureUnit(row.packing_qty_unit) === "eaches" ? Number(row.packing_qty_number || 1) : null,
              category_id: row.inventory_category_id ? Number(row.inventory_category_id) : null,
              default_vendor_id: row.vendor_id ? Number(row.vendor_id) : null,
              current_stock: 0,
              low_stock_threshold: 0,
              reorder_level: 0,
              active: true,
            })
            .select("id")
            .single();

          if (itemError) throw new Error(`Could not create inventory item: ${itemError.message}`);
          inventoryItemId = Number(newItem.id);
        }

        let vendorId = row.vendor_id ? Number(row.vendor_id) : vendorIdForShipment;
        if (!vendorId && String(row.new_vendor_name || "").trim()) {
          const { data: newVendor, error: vendorError } = await supabase
            .from("vendors")
            .insert({
              vendor_name: row.new_vendor_name.trim(),
              active: true,
            })
            .select("id")
            .single();
          if (vendorError) throw new Error(`Could not create vendor: ${vendorError.message}`);
          vendorId = Number(newVendor.id);
        }

        const pricePerSmallUnit = getPricePerSmallUnit(row);
        const totalBaseQty = getTotalBaseQuantity(row);
        const totalCost = getTotalCostValue(row);

        const { error: lineError } = await supabase
          .from("vendor_shipment_lines")
          .insert({
            shipment_id: shipment.id,
            inventory_item_id: inventoryItemId,
            quantity: totalBaseQty,
            unit_cost: pricePerSmallUnit,
            line_total: totalCost,
            supply_model:
              row.supply_model === "buy_out"
                ? "outright_purchase"
                : row.supply_model === "credit_purchase"
                ? "credit_payable"
                : row.supply_model === "percentage_of_sales"
                ? "percentage_of_sale"
                : "consignment",
            revenue_share_percent: row.supply_model === "percentage_of_sales" ? Number(row.price || 0) : null,
            expiry_date: row.expiry_date || null,
          });

        if (lineError) throw new Error(`Could not create shipment line: ${lineError.message}`);

        const { data: currentInventoryRow, error: currentInventoryError } = await supabase
          .from("inventory_items")
          .select("current_stock")
          .eq("id", inventoryItemId)
          .single();

        if (currentInventoryError) {
          throw new Error(`Could not read inventory stock: ${currentInventoryError.message}`);
        }

        const updatedStock = Number(currentInventoryRow?.current_stock || 0) + Number(totalBaseQty || 0);

        const { error: stockUpdateError } = await supabase
          .from("inventory_items")
          .update({
            current_stock: updatedStock,
            default_vendor_id: vendorId || null,
            category_id: row.inventory_category_id ? Number(row.inventory_category_id) : null,
            item_type: row.item_type,
          })
          .eq("id", inventoryItemId);

        if (stockUpdateError) {
          throw new Error(`Could not update inventory stock: ${stockUpdateError.message}`);
        }

        const { error: movementInsertError } = await supabase
          .from("inventory_movements")
          .insert({
            inventory_item_id: inventoryItemId,
            order_id: null,
            product_id: null,
            product_name: null,
            movement_type: "purchase_addition",
            quantity_change: Number(totalBaseQty || 0),
            unit: normalizeMeasureUnit(row.one_unit_size_unit) === "eaches"
              ? normalizeMeasureUnit(row.packing_qty_unit)
              : normalizeMeasureUnit(row.one_unit_size_unit),
            batch_id: null,
            unit_cost: pricePerSmallUnit,
            line_cost: totalCost,
            note: `Stock intake ${shipment.id}`,
          });

        if (movementInsertError) {
          throw new Error(`Could not create inventory movement: ${movementInsertError.message}`);
        }
      }

      if (amountPaidToday > 0 && vendorIdForShipment) {
        const { error: paymentError } = await supabase.from("vendor_payments").insert({
          vendor_id: vendorIdForShipment,
          shipment_id: shipment.id,
          payment_date: stockIntakeForm.delivery_date || new Date().toISOString().slice(0, 10),
          amount: amountPaidToday,
          payment_method: stockIntakeForm.payment_type,
          notes: "Paid at stock intake",
          created_by: staffProfile?.id || null,
        });
        if (paymentError) throw new Error(`Could not record payment: ${paymentError.message}`);
      }

      setStatusMessage("Stock intake saved");
      clearStockIntakeForm();
      if (typeof loadVendorShipments === "function") await loadVendorShipments();
      if (typeof loadVendorShipmentLines === "function") await loadVendorShipmentLines();
      if (typeof loadInventoryItems === "function") await loadInventoryItems();
      if (typeof loadInventoryMovements === "function") await loadInventoryMovements();
      if (typeof loadVendorPayments === "function") await loadVendorPayments();
      if (typeof loadVendors === "function") await loadVendors();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save stock intake");
    }
  }


  async function deleteShipmentHistory(shipmentId: string) {
    try {
      const numericShipmentId = Number(shipmentId || 0);
      if (!numericShipmentId) {
        setStatusMessage("Invalid stock intake record");
        return;
      }

      const { error: paymentError } = await supabase
        .from("vendor_payments")
        .delete()
        .eq("shipment_id", numericShipmentId);

      if (paymentError) {
        throw new Error(`Could not delete shipment payments: ${paymentError.message}`);
      }

      const { error: lineError } = await supabase
        .from("vendor_shipment_lines")
        .delete()
        .eq("shipment_id", numericShipmentId);

      if (lineError) {
        throw new Error(`Could not delete shipment lines: ${lineError.message}`);
      }

      const { error: shipmentError } = await supabase
        .from("vendor_shipments")
        .delete()
        .eq("id", numericShipmentId);

      if (shipmentError) {
        throw new Error(`Could not delete stock intake: ${shipmentError.message}`);
      }

      if (String(selectedShipmentHistoryId) == String(shipmentId)) {
        setSelectedShipmentHistoryId("");
      }

      setStatusMessage("Stock intake record deleted");
      if (typeof loadVendorShipments === "function") await loadVendorShipments();
      if (typeof loadVendorShipmentLines === "function") await loadVendorShipmentLines();
      if (typeof loadVendorPayments === "function") await loadVendorPayments();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not delete stock intake");
    }
  }

  async function deleteInventoryItemInline(itemId: string) {
    try {
      const numericItemId = Number(itemId || 0);
      if (!numericItemId) {
        setStatusMessage("Invalid inventory item");
        return;
      }

      const { error } = await supabase
        .from("inventory_items")
        .update({ active: false })
        .eq("id", numericItemId);

      if (error) {
        throw new Error(`Could not hide inventory item: ${error.message}`);
      }

      setStatusMessage("Inventory item hidden");
      if (typeof loadInventoryItems === "function") await loadInventoryItems();

      setStockIntakeRows((prev) =>
        prev.map((row) =>
          String(row.inventory_item_id) === String(itemId)
            ? { ...row, inventory_item_id: "", item_search: "", new_item_name: "" }
            : row
        )
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not hide inventory item");
    }
  }


  function toggleSelectedShipmentPaymentLine(lineId: string) {
    setSelectedShipmentPaymentLineIds((prev) =>
      prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
    );
  }

  function getSelectedShipmentPaymentAmount() {
    if (!selectedShipmentHistory) return 0;
    if (vendorPaymentMode === "full_intake") {
      return Number(selectedShipmentHistory.outstanding_amount || 0);
    }
    return selectedShipmentLines
      .filter((line: any) => selectedShipmentPaymentLineIds.includes(String(line.id)))
      .reduce((sum: number, line: any) => sum + Number(line.line_total || 0), 0);
  }

  async function saveVendorPaymentFromIntake() {
    try {
      if (!selectedShipmentHistory) {
        setStatusMessage("Select a stock intake record first");
        return;
      }

      let paymentAmount = Number(vendorPaymentForm.amount || 0);
      if (paymentAmount <= 0) {
        paymentAmount = getSelectedShipmentPaymentAmount();
      }
      if (paymentAmount <= 0) {
        setStatusMessage("Enter a valid payment amount");
        return;
      }

      const { error } = await supabase.from("vendor_payments").insert({
        vendor_id: Number(selectedShipmentHistory.vendor_id),
        shipment_id: Number(selectedShipmentHistory.id),
        payment_date: vendorPaymentForm.payment_date || new Date().toISOString().slice(0, 10),
        amount: paymentAmount,
        payment_method: vendorPaymentForm.payment_method || null,
        reference_number: vendorPaymentForm.reference_number || null,
        notes:
          vendorPaymentMode === "specific_lines"
            ? `Stock intake line payment for line IDs: ${selectedShipmentPaymentLineIds.join(", ")}`
            : (vendorPaymentForm.notes || "Stock intake payment"),
        created_by: staffProfile?.id || null,
      });

      if (error) {
        throw new Error(`Could not save vendor payment: ${error.message}`);
      }

      setVendorPaymentForm((prev) => ({
        ...prev,
        vendor_id: Number(selectedShipmentHistory.vendor_id),
        shipment_id: Number(selectedShipmentHistory.id),
        payment_date: new Date().toISOString().slice(0, 10),
        amount: "",
        payment_method: "cash",
        reference_number: "",
        notes: "",
      }));
      setSelectedShipmentPaymentLineIds([]);
      setStatusMessage("Vendor payment saved");

      if (typeof loadVendorShipments === "function") await loadVendorShipments();
      if (typeof loadVendorPayments === "function") await loadVendorPayments();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save vendor payment");
    }
  }


  const orderCostsByOrderId = new Map(orderCosts.map((row) => [Number(row.order_id), row]));
  const profitableOrders = completedOrders
    .filter((order) => orderCostsByOrderId.has(Number(order.id)))
    .map((order) => ({
      ...order,
      cost_row: orderCostsByOrderId.get(Number(order.id)) || null,
    }));

  const selectedProfitOrder =
    profitableOrders.find((order) => String(order.id) === selectedProfitOrderId) || null;

  const selectedProfitMovements = inventoryMovements.filter(
    (movement) => String(movement.order_id || "") === String(selectedProfitOrder?.id || "")
  );

  function getPeriodStart(period: "day" | "week" | "month" | "quarter" | "year", now = new Date()) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);

    if (period === "day") return d;

    if (period === "week") {
      const day = d.getDay();
      const diff = (day + 6) % 7;
      d.setDate(d.getDate() - diff);
      return d;
    }

    if (period === "month") {
      d.setDate(1);
      return d;
    }

    if (period === "quarter") {
      const month = d.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      d.setMonth(quarterStartMonth, 1);
      return d;
    }

    d.setMonth(0, 1);
    return d;
  }

  function allocateFixedCostToPeriod(cost: FixedCostRow, period: "day" | "week" | "month" | "quarter" | "year") {
    const amount = Number(cost.amount || 0);

    const dailyBase =
      cost.frequency === "daily"
        ? amount
        : cost.frequency === "weekly"
        ? amount / 7
        : cost.frequency === "monthly"
        ? amount / 30
        : cost.frequency === "quarterly"
        ? amount / 91
        : amount / 365;

    if (period === "day") return dailyBase;
    if (period === "week") return dailyBase * 7;
    if (period === "month") return dailyBase * 30;
    if (period === "quarter") return dailyBase * 91;
    return dailyBase * 365;
  }

  function addFixedCost() {
    const name = fixedCostForm.name.trim();
    const amount = Number(fixedCostForm.amount || 0);
    if (!name || amount <= 0) {
      setStatusMessage("Enter a fixed cost name and amount");
      return;
    }

    const nextCosts = [
      {
        id: `fixed-cost-${Date.now()}`,
        name,
        amount,
        frequency: fixedCostForm.frequency,
      },
      ...fixedCosts,
    ];
    setFixedCosts(nextCosts);
    setFixedCostForm({ name: "", amount: "", frequency: "monthly" });
  }

  function removeFixedCost(id: string) {
    setFixedCosts((prev) => prev.filter((cost) => cost.id !== id));
  }

  async function savePrinterSettings() {
    const electronPOS = (window as any).electronPOS;
    if (!electronPOS) {
      setStatusMessage("Electron printer bridge not available");
      return;
    }

    await electronPOS.savePrintSettings({
      receiptKitchenPrinter,
      stickerPrinter,
      autoPrintReceipt,
      autoPrintKitchen,
      autoPrintStickers,
    });

    setStatusMessage("Printer settings saved");
  }

  async function testReceiptPrinter() {
    const electronPOS = (window as any).electronPOS;
    if (!electronPOS || !receiptKitchenPrinter) {
      setStatusMessage("Select receipt/kitchen printer first");
      return;
    }

    const result = await electronPOS.testPrint({
      printerName: receiptKitchenPrinter,
      html: "<html><body style='font-family:Arial,sans-serif;padding:12px'>Spill The Tea - Receipt/Kitchen Test</body></html>",
    });

    setStatusMessage(result?.ok ? "Receipt/kitchen test sent" : `Print failed: ${result?.error || "Unknown error"}`);
  }

  async function testStickerPrinter() {
    const electronPOS = (window as any).electronPOS;
    if (!electronPOS || !stickerPrinter) {
      setStatusMessage("Select sticker printer first");
      return;
    }

    const stickerHtml = buildStickerHtml([
      {
        orderNumber: "STT-30-0001",
        customerName: "ALI",
        drinkName: "Cappuccino",
        modifiers: "Oat Milk | Less Sugar",
        notes: "No Foam",
        countLabel: "1/3",
      },
    ]);

    const result = await electronPOS.printStickers({
      printerName: stickerPrinter,
      html: stickerHtml,
    });

    setStatusMessage(result?.ok ? "Sticker test sent" : `Sticker print failed: ${result?.error || "Unknown error"}`);
  }

  function isDrinkProduct(productId: number, productName: string) {
    const product = products.find((p) => p.id === productId) || null;
    const categoryText = (product?.categories || []).map((c) => String(c.name).toLowerCase()).join(" ");
    if (/(drink|drinks|beverage|beverages|coffee|tea)/.test(categoryText)) return true;

    const name = String(productName || "").toLowerCase();
    return /(americano|espresso|latte|cappuccino|mocha|coffee|tea|frappe|shake|smoothie|macchiato)/.test(name);
  }

  async function printOrderArtifacts(params: {
    orderNumber: string;
    createdAt: string;
    customerNameForPrint: string;
    paymentMethodName: string;
  }) {
    const electronPOS = (window as any).electronPOS;
    if (!electronPOS) return;

    const orderForPrint = {
      order_number: params.orderNumber,
      created_at: params.createdAt,
      customer_name: params.customerNameForPrint,
      payment_method_name: params.paymentMethodName,
      subtotal: cartSubtotal,
      tax_total: cartTaxTotal,
      total: cartGrandTotal,
      items: cart.map((item) => ({
        product_name: item.name,
        quantity: item.quantity,
        modifiers_text: item.modifiers.map((m) => m.name).join(", ") || null,
        notes: item.notes || null,
        product_type: isDrinkProduct(item.product_id, item.name) ? "drink" : "food",
      })),
    };

    if (autoPrintReceipt && receiptKitchenPrinter) {
      await electronPOS.printReceipt({
        printerName: receiptKitchenPrinter,
        html: buildReceiptHtml(orderForPrint),
      });
    }

    if (autoPrintKitchen && receiptKitchenPrinter) {
      await electronPOS.printKitchen({
        printerName: receiptKitchenPrinter,
        html: buildKitchenHtml(orderForPrint),
      });
    }

    if (autoPrintStickers && stickerPrinter) {
      const stickerRows = expandDrinkStickers(orderForPrint);
      if (stickerRows.length > 0) {
        await electronPOS.printStickers({
          printerName: stickerPrinter,
          html: buildStickerHtml(stickerRows),
        });
      }
    }
  }

  async function saveCustomerBonus(customerId: number, bonusValue: string) {
    if (!canEditCustomerBonus) {
      setStatusMessage("You do not have permission to change customer bonus");
      return;
    }
    const parsed = Math.max(0, Number(bonusValue || 0));
    const { error } = await supabase
      .from("customers")
      .update({ manual_bonus_percent: parsed })
      .eq("id", customerId);

    if (error) {
      setStatusMessage(`Could not update bonus: ${error.message}`);
      return;
    }

    await refreshAll();
    await loadCustomerDetailById(customerId);
    setStatusMessage("Customer bonus updated");
  }

  async function saveCategory() {
    if (!canEditSetup) {
      setStatusMessage("You do not have permission to edit setup data");
      return;
    }
    const payload = {
      name: categoryForm.name.trim(),
      active: categoryForm.active,
    };

    if (!payload.name) {
      setStatusMessage("Enter category name");
      return;
    }

    if (categoryForm.id) {
      const { error } = await supabase.from("categories").update(payload).eq("id", categoryForm.id);
      if (error) {
        setStatusMessage(`Could not update category: ${error.message}`);
        return;
      }
      setStatusMessage("Category updated");
    } else {
      const { error } = await supabase.from("categories").insert(payload);
      if (error) {
        setStatusMessage(`Could not create category: ${error.message}`);
        return;
      }
      setStatusMessage("Category created");
    }

    setCategoryForm({ id: null, name: "", active: true });
    await refreshAll();
  }

  async function saveModifier() {
    if (!canEditSetup) {
      setStatusMessage("You do not have permission to edit setup data");
      return;
    }
    const payload = {
      name: modifierForm.name.trim(),
      price_delta: Number(modifierForm.price_delta || 0),
      active: modifierForm.active,
    };

    if (!payload.name) {
      setStatusMessage("Enter modifier name");
      return;
    }

    let modifierId = modifierForm.id;

    if (modifierForm.id) {
      const { error } = await supabase.from("modifier_library").update(payload).eq("id", modifierForm.id);
      if (error) {
        setStatusMessage(`Could not update modifier: ${error.message}`);
        return;
      }
      setStatusMessage("Modifier updated");
    } else {
      const { data, error } = await supabase.from("modifier_library").insert(payload).select("id").single();
      if (error || !data) {
        setStatusMessage(`Could not create modifier: ${error?.message || "Unknown error"}`);
        return;
      }
      modifierId = Number(data.id);
      setStatusMessage("Modifier created");
    }

    if (modifierId) {
      const quantityDelta = Number(modifierForm.inventory_effect_quantity || 0);
      const inventoryItemId = Number(modifierForm.inventory_effect_item_id || 0);
      const effectItem = inventoryItems.find((item) => Number(item.id) === inventoryItemId) || null;
      const defaultUnit = effectItem ? getRecipeCostBasisUnit(effectItem.unit) : "pcs";
      const deductionUnit = modifierForm.inventory_effect_unit || defaultUnit;

      const { error: clearEffectError } = await supabase
        .from("modifier_inventory_effects")
        .delete()
        .eq("modifier_id", modifierId);

      if (clearEffectError) {
        setStatusMessage(`Modifier saved, but old stock effect could not be cleared: ${clearEffectError.message}`);
        return;
      }

      if (inventoryItemId > 0 && quantityDelta > 0) {
        const { error: effectError } = await supabase
          .from("modifier_inventory_effects")
          .insert({
            modifier_id: modifierId,
            inventory_item_id: inventoryItemId,
            quantity_delta: quantityDelta,
            deduction_unit: deductionUnit,
          });

        if (effectError) {
          setStatusMessage(`Modifier saved, but stock effect could not be saved: ${effectError.message}`);
          return;
        }
      }
    }

    setModifierForm({
      id: null,
      name: "",
      price_delta: "",
      active: true,
      inventory_effect_item_id: "",
      inventory_effect_unit: "",
      inventory_effect_quantity: "",
    });
    await refreshAll();
  }

  async function saveSalesTax() {
    if (!canEditSetup) {
      setStatusMessage("You do not have permission to edit setup data");
      return;
    }
    const payload = {
      name: salesTaxForm.name.trim(),
      rate_percent: Number(salesTaxForm.rate_percent || 0),
      active: salesTaxForm.active,
    };

    if (!payload.name) {
      setStatusMessage("Enter sales tax name");
      return;
    }

    if (salesTaxForm.id) {
      const { error } = await supabase.from("sales_taxes").update(payload).eq("id", salesTaxForm.id);
      if (error) {
        setStatusMessage(`Could not update sales tax: ${error.message}`);
        return;
      }
      setStatusMessage("Sales tax updated");
    } else {
      const { error } = await supabase.from("sales_taxes").insert(payload);
      if (error) {
        setStatusMessage(`Could not create sales tax: ${error.message}`);
        return;
      }
      setStatusMessage("Sales tax created");
    }

    setSalesTaxForm({
      id: null,
      name: "",
      rate_percent: "",
      active: true,
    });
    await refreshAll();
  }

  async function savePaymentMethod() {
    if (!canEditSetup) {
      setStatusMessage("You do not have permission to edit setup data");
      return;
    }
    const payload = {
      name: paymentMethodForm.name.trim(),
      active: paymentMethodForm.active,
    };

    if (!payload.name) {
      setStatusMessage("Enter payment method name");
      return;
    }

    let paymentMethodId = paymentMethodForm.id;

    if (paymentMethodForm.id) {
      const { error } = await supabase.from("payment_methods").update(payload).eq("id", paymentMethodForm.id);
      if (error) {
        setStatusMessage(`Could not update payment method: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("payment_methods")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setStatusMessage(`Could not create payment method: ${error?.message || "Unknown error"}`);
        return;
      }

      paymentMethodId = Number(data.id);
    }

    if (!paymentMethodId) {
      setStatusMessage("Payment method save failed");
      return;
    }

    const { error: deleteError } = await supabase
      .from("payment_method_taxes")
      .delete()
      .eq("payment_method_id", paymentMethodId);

    if (deleteError) {
      setStatusMessage(`Could not refresh payment method taxes: ${deleteError.message}`);
      return;
    }

    if (paymentMethodForm.salesTaxIds.length > 0) {
      const taxLinks = paymentMethodForm.salesTaxIds.map((salesTaxId) => ({
        payment_method_id: paymentMethodId,
        sales_tax_id: salesTaxId,
      }));

      const { error: insertError } = await supabase.from("payment_method_taxes").insert(taxLinks);
      if (insertError) {
        setStatusMessage(`Could not save payment method taxes: ${insertError.message}`);
        return;
      }
    }

    setPaymentMethodForm({
      id: null,
      name: "",
      active: true,
      salesTaxIds: [],
    });
    setStatusMessage(paymentMethodForm.id ? "Payment method updated" : "Payment method created");
    await refreshAll();
  }

  async function saveProduct() {
    if (!canEditSetup) {
      setStatusMessage("You do not have permission to edit setup data");
      return;
    }
    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price || 0),
      active: productForm.active,
    };

    if (!payload.name) {
      setStatusMessage("Enter product name");
      return;
    }

    let productId = productForm.id;

    if (productForm.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", productForm.id);
      if (error) {
        setStatusMessage(`Could not update product: ${error.message}`);
        return;
      }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !data) {
        setStatusMessage(`Could not create product: ${error?.message || "Unknown error"}`);
        return;
      }
      productId = Number(data.id);
    }

    if (!productId) {
      setStatusMessage("Product save failed");
      return;
    }

    const { error: catDeleteError } = await supabase.from("product_categories").delete().eq("product_id", productId);
    if (catDeleteError) {
      setStatusMessage(`Could not refresh product categories: ${catDeleteError.message}`);
      return;
    }

    if (productForm.categoryIds.length > 0) {
      const categoryLinks = productForm.categoryIds.map((categoryId) => ({
        product_id: productId,
        category_id: categoryId,
      }));
      const { error: catInsertError } = await supabase.from("product_categories").insert(categoryLinks);
      if (catInsertError) {
        setStatusMessage(`Could not save product categories: ${catInsertError.message}`);
        return;
      }
    }

    const { error: modDeleteError } = await supabase.from("product_modifier_links").delete().eq("product_id", productId);
    if (modDeleteError) {
      setStatusMessage(`Could not refresh product modifiers: ${modDeleteError.message}`);
      return;
    }

    if (productForm.modifierIds.length > 0) {
      const modifierLinks = productForm.modifierIds.map((modifierId) => ({
        product_id: productId,
        modifier_id: modifierId,
      }));
      const { error: modInsertError } = await supabase.from("product_modifier_links").insert(modifierLinks);
      if (modInsertError) {
        setStatusMessage(`Could not save product modifiers: ${modInsertError.message}`);
        return;
      }
    }

    setProductForm({
      id: null,
      name: "",
      price: "",
      active: true,
      categoryIds: [],
      modifierIds: [],
    });
    setStatusMessage(productForm.id ? "Product updated" : "Product created");
    await refreshAll();
  }

  function loadProductIntoForm(product: Product) {
    setProductForm({
      id: product.id,
      name: product.name,
      price: String(product.price),
      active: product.active !== false,
      categoryIds: product.categories.map((c) => c.id),
      modifierIds: productModifierMap[product.id] || [],
    });
    setViewMode("setup");
  }

  function resetLineBuilder() {
    setSelectedProductForCart(null);
    setSelectedModifierIds([]);
    setLineNotes("");
    setLinePricingMode("normal");
    setLineDiscountedUnitPrice("");
  }

  function addSelectedProductToCart() {
    if (!selectedProductForCart) return;

    const modifiers = modifierLibrary.filter((m) => selectedModifierIds.includes(m.id));
    const newItem: CartItem = {
      line_id: randomLineId(),
      product_id: selectedProductForCart.id,
      name: selectedProductForCart.name,
      base_price: Number(selectedProductForCart.price || 0),
      quantity: 1,
      modifiers,
      notes: lineNotes.trim(),
      pricing_mode: linePricingMode,
      discounted_unit_price:
        linePricingMode === "discounted"
          ? Math.max(0, Number(lineDiscountedUnitPrice || 0))
          : null,
    };

    setCart((prev) => [...prev, newItem]);
    resetLineBuilder();
  }

  function updateCartQty(lineId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.line_id === lineId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeCartLine(lineId: string) {
    setCart((prev) => prev.filter((item) => item.line_id !== lineId));
  }

  async function ensureCustomer(): Promise<CustomerRow | null> {
    const candidates = getPhoneLookupCandidates(customerPhone);
    const phoneForSave = normalizePhoneForStorage(customerPhone);
    if (!phoneForSave) return null;

    const { data: existingRows, error: lookupError } = await supabase
      .from("customers")
      .select("*")
      .in("phone", candidates);

    if (lookupError) throw new Error(lookupError.message);

    const existing = (existingRows || [])[0];
    if (existing) {
      const customer: CustomerRow = {
        id: Number(existing.id),
        name: existing.name ?? null,
        phone: String(existing.phone),
        reward_points: Number(existing.reward_points || 0),
        lifetime_eligible_spend: Number(existing.lifetime_eligible_spend || 0),
        manual_bonus_percent: Number(existing.manual_bonus_percent || 0),
      };
      setCurrentCustomer(customer);
      return customer;
    }

    const payload = {
      name: customerName.trim() || null,
      phone: phoneForSave,
      reward_points: 0,
      lifetime_eligible_spend: 0,
      manual_bonus_percent: 0,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("customers")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) throw new Error(insertError.message);

    const customer: CustomerRow = {
      id: Number(inserted.id),
      name: inserted.name ?? null,
      phone: String(inserted.phone),
      reward_points: Number(inserted.reward_points || 0),
      lifetime_eligible_spend: Number(inserted.lifetime_eligible_spend || 0),
      manual_bonus_percent: Number(inserted.manual_bonus_percent || 0),
    };
    setCurrentCustomer(customer);
    return customer;
  }

  async function createOrder() {
    if (cart.length === 0) {
      setStatusMessage("Add items to the cart first");
      return;
    }
    if (!selectedPaymentMethodId) {
      setStatusMessage("Select a payment method");
      return;
    }

    setSaving(true);
    try {
      const customer = customerPhone.trim() ? await ensureCustomer() : null;
      const eligiblePaidAmount = Math.max(0, eligibleSubtotal - redeemablePoints);

      const baseOrderPayload = {
        status: "Preparing",
        total: cartGrandTotal,
        subtotal: cartSubtotal,
        tax_total: cartTaxTotal,
        discount_total: redeemablePoints,
        points_earned: projectedPointsEarned,
        points_redeemed: redeemablePoints,
        eligible_subtotal: eligibleSubtotal,
        non_eligible_subtotal: nonEligibleSubtotal,
        effective_reward_percent: currentRewardRate,
        reward_multiplier: activePromotionMultiplier,
        customer_id: customer?.id ?? null,
        payment_method_id: selectedPaymentMethodId,
        created_at: new Date().toISOString(),
      };

      let orderRow: any = null;
      let orderError: any = null;
      let orderNumber = "";

      for (let attempt = 0; attempt < 5; attempt += 1) {
        orderNumber = await getNextDailyOrderNumber();
        const orderPayload = {
          order_number: orderNumber,
          ...baseOrderPayload,
        };

        const result = await supabase
          .from("orders")
          .insert(orderPayload)
          .select("*")
          .single();

        orderRow = result.data;
        orderError = result.error;

        if (!orderError) break;

        const message = String(orderError.message || "").toLowerCase();
        if (!message.includes("orders_order_number_key")) break;
      }

      if (orderError) throw new Error(orderError.message);

      const orderId = Number(orderRow.id);
      const orderItemsPayload = cart.map((item) => {
        const modifierNames = item.modifiers.map((m) => m.name).join(", ");
        const modifierTotal = item.modifiers.reduce((sum, mod) => sum + Number(mod.price_delta), 0);
        let unit = item.base_price + modifierTotal;
        if (item.pricing_mode === "complimentary") unit = 0;
        if (item.pricing_mode === "discounted") unit = Math.max(0, Number(item.discounted_unit_price || 0));

        return {
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: unit,
          line_total: unit * item.quantity,
          modifiers_text: modifierNames || null,
          notes: item.notes || null,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
      if (itemsError) throw new Error(itemsError.message);

      if (customer) {
        const customerUpdates: Record<string, number> = {
          reward_points: Number(customer.reward_points || 0) - redeemablePoints + projectedPointsEarned,
          lifetime_eligible_spend:
            Number(customer.lifetime_eligible_spend || 0) + Math.max(0, eligibleSubtotal - redeemablePoints),
        };

        const { error: customerUpdateError } = await supabase
          .from("customers")
          .update(customerUpdates)
          .eq("id", customer.id);

        if (customerUpdateError) throw new Error(customerUpdateError.message);

        if (redeemablePoints > 0) {
          await supabase.from("customer_points_ledger").insert({
            customer_id: customer.id,
            entry_type: "redeemed",
            points: -redeemablePoints,
            note: `Redeemed on order ${orderNumber}`,
          });
        }

        if (projectedPointsEarned > 0) {
          await supabase.from("customer_points_ledger").insert({
            customer_id: customer.id,
            entry_type: "earned",
            points: projectedPointsEarned,
            note: `Earned on order ${orderNumber}`,
          });
        }
      }

      await printOrderArtifacts({
        orderNumber,
        createdAt: String(orderRow.created_at),
        customerNameForPrint: customer?.name || customerName || "Guest",
        paymentMethodName:
          paymentMethods.find((p) => p.id === selectedPaymentMethodId)?.name || "",
      });

      setCart([]);
      setRedeemPointsInput("0");
      setCashReceivedInput("");
      resetLineBuilder();
      setStatusMessage(`Order ${orderNumber} created`);
      await refreshAll();

      if (customer) {
        await loadCustomerDetailById(customer.id);
      } else {
        clearLoadedCustomer();
        setCustomerName("");
        setCustomerPhone("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create order";
      setStatusMessage(message);
    } finally {
      setSaving(false);
    }
  }

  async function markOrderReady(orderId: number) {
    const order =
      activeOrders.find((o) => o.id === orderId) ||
      selectedCustomerOrders.find((o) => o.id === orderId) ||
      customerRecentOrders.find((o) => o.id === orderId) ||
      null;

    const customerPhone = order?.customer?.phone ? normalizePhoneForWhatsApp(order.customer.phone) : "";
    const message = order
      ? encodeURIComponent(
          `Assalam o Alaikum. Your order ${order.order_number} from Spill The Tea is ready for pickup.`
        )
      : "";

    let pendingWindow: Window | null = null;
    if (customerPhone && message) {
      pendingWindow = window.open("about:blank", "_blank");
    }

    const readyAt = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "Ready",
        ready_at: readyAt,
      })
      .eq("id", orderId);

    if (error) {
      if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
      setStatusMessage(`Could not mark ready: ${error.message}`);
      return;
    }

    if (customerPhone && message) {
      const url = `https://wa.me/${customerPhone}?text=${message}`;
      if (pendingWindow && !pendingWindow.closed) {
        pendingWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      setStatusMessage("Order marked ready and WhatsApp opened");
    } else {
      if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
      setStatusMessage("Order marked ready");
    }

    setSelectedQueueOrder((prev) =>
      prev && prev.id === orderId
        ? {
            ...prev,
            status: "Ready",
            ready_at: readyAt,
          }
        : prev
    );

    await refreshAll();
    if (selectedCustomerId) await loadCustomerDetailById(selectedCustomerId);
  }

  async function markOrderCollected(orderId: number) {
    try {
      const order =
        activeOrders.find((o) => o.id === orderId) ||
        selectedCustomerOrders.find((o) => o.id === orderId) ||
        customerRecentOrders.find((o) => o.id === orderId) ||
        completedOrders.find((o) => o.id === orderId) ||
        null;

      const completedAt = new Date().toISOString();

      const { error } = await supabase
        .from("orders")
        .update({
          status: "Completed",
          collected_at: completedAt,
        })
        .eq("id", orderId);

      if (error) {
        setStatusMessage(`Could not mark completed: ${error.message}`);
        return;
      }

      let cogsMessage = "";

      try {
        const deductionResult = await applyInventoryDeductionAndCogs({
          orderId,
          orderTotal: Number(order?.total || 0),
          products: products.map((product) => ({ id: product.id, name: product.name })),
          inventoryItems: inventoryItems.map((item) => ({ id: item.id, item_name: item.item_name, unit: item.unit })),
          supabase,
        });

        if (deductionResult?.applied) {
          cogsMessage = ` | COGS ${formatCurrency(Number(deductionResult.actualCogs || 0))}`;
        } else if (deductionResult?.error) {
          console.error("COGS/inventory deduction failed after completion:", deductionResult.error);
          cogsMessage = " | Completed, but inventory deduction failed";
        }
      } catch (deductionError) {
        console.error("COGS/inventory deduction failed after completion:", deductionError);
        cogsMessage = " | Completed, but inventory deduction failed";
      }

      setActiveOrders((prev) =>
        prev.filter((activeOrder) => Number(activeOrder.id) !== Number(orderId))
      );

      setCompletedOrders((prev) => {
        const existing =
          activeOrders.find((o) => Number(o.id) === Number(orderId)) ||
          selectedCustomerOrders.find((o) => Number(o.id) === Number(orderId)) ||
          customerRecentOrders.find((o) => Number(o.id) === Number(orderId)) ||
          completedOrders.find((o) => Number(o.id) === Number(orderId)) ||
          null;

        if (!existing) return prev;
        const nextRow = {
          ...existing,
          status: "Completed",
          collected_at: completedAt,
        };
        return [nextRow as any, ...prev.filter((row) => Number(row.id) !== Number(orderId))];
      });

      setSelectedQueueOrder((prev) =>
        prev && Number(prev.id) === Number(orderId) ? null : prev
      );

      setStatusMessage(`Order marked completed${cogsMessage}`);
      await refreshAll();
      if (selectedCustomerId) await loadCustomerDetailById(selectedCustomerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not complete order";
      setStatusMessage(message);
      console.error("markOrderCollected failed:", error);
    }
  }

  async function sendReminder(order: OrderView, reminderNumber: 1 | 2) {
    const phone = order.customer?.phone ? normalizePhoneForWhatsApp(order.customer.phone) : "";
    if (!phone) {
      setStatusMessage("No customer phone available");
      return;
    }

    const reminderText =
      reminderNumber === 1
        ? `Assalam o Alaikum. This is a reminder that your order ${order.order_number} from Spill The Tea is ready for pickup.`
        : `Assalam o Alaikum. Final reminder: your order ${order.order_number} from Spill The Tea is ready for pickup.`;

    const message = encodeURIComponent(reminderText);

    let pendingWindow: Window | null = window.open("about:blank", "_blank");

    const payload =
      reminderNumber === 1
        ? { reminder1_sent_at: new Date().toISOString() }
        : { reminder2_sent_at: new Date().toISOString() };

    const { error } = await supabase.from("orders").update(payload).eq("id", order.id);

    if (error) {
      if (pendingWindow && !pendingWindow.closed) pendingWindow.close();
      setStatusMessage(`Could not send reminder ${reminderNumber}: ${error.message}`);
      return;
    }

    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${message}`;

    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.href = url;
    } else {
      window.open(url, "_blank");
    }

    await refreshAll();
    if (selectedCustomerId) await loadCustomerDetailById(selectedCustomerId);
    setStatusMessage(`Reminder ${reminderNumber} opened in WhatsApp`);
  }

  function getPaymentLabel(order: OrderView) {
    if (order.payment_method_name && order.payment_method_name !== "-") return order.payment_method_name;
    if (order.payment_method_id !== null) {
      const found = paymentMethods.find((m) => m.id === order.payment_method_id);
      if (found) return found.name;
    }
    return "-";
  }

  function renderOrderCard(order: OrderView, isHistory = false) {
    const ageSeconds = getElapsedSeconds(order.created_at, order.collected_at || undefined);

    return (
      <div key={order.id} className="rounded-2xl border border-rose-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-lg font-semibold">
              {order.order_number} - {order.status}
            </div>
            <div className="text-xs text-rose-700/70">
              Created: {mounted ? formatTime(order.created_at) : "-"}
            </div>
            <div className="text-xs text-rose-700/70">
              Customer: {order.customer?.name || "-"} | {order.customer?.phone || "-"}
            </div>
            <div className="text-xs text-rose-700/70">
              Payment: {getPaymentLabel(order)}
            </div>
            <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2">
              <div className="text-xs font-medium uppercase tracking-wide text-rose-700/70">Time Since Placed</div>
              <div className="text-2xl font-bold text-rose-600">
  {mounted ? formatDurationFromSeconds(ageSeconds) : "-"}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold">{formatCurrency(order.total)}</div>
            <div className="text-xs text-rose-700/70">
              Subtotal {formatCurrency(order.subtotal)} | Tax {formatCurrency(order.tax_total)}
            </div>
            <div className="text-xs text-rose-700/70">
              Earned {Number(order.points_earned).toFixed(0)} pts | Redeemed {Number(order.points_redeemed).toFixed(0)} pts
            </div>
            <div className="text-xs text-rose-700/70">
              {!mounted
                ? "-"
                : order.status === "Completed" || order.status === "Collected"
                ? `Collected after ${formatDurationFromSeconds(getElapsedSeconds(order.created_at, order.collected_at || undefined))}`
                : order.status === "Ready"
                ? `Ready after ${order.ready_at ? formatDurationFromSeconds(getElapsedSeconds(order.created_at, order.ready_at)) : "-"}`
                : `Live timer ${formatDurationFromSeconds(ageSeconds)}`}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {order.items.map((item, idx) => (
            <div key={`${order.id}-${idx}`} className="rounded-xl bg-rose-50 p-3 text-sm">
              <div className="font-medium">
                {item.product_name} x {item.quantity}
              </div>
              <div className="text-rose-700/70">
                Unit {formatCurrency(item.unit_price)} | Line {formatCurrency(item.line_total)}
              </div>
              {item.modifiers_text ? (
                <div className="text-rose-700/70">Modifiers: {item.modifiers_text}</div>
              ) : null}
              {item.notes ? <div className="text-rose-700/70">Notes: {item.notes}</div> : null}
            </div>
          ))}
        </div>

        {!isHistory ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {order.status === "Preparing" ? (
              <button
                onClick={() => markOrderReady(order.id)}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
              >
                Mark Ready
              </button>
            ) : null}

            {order.status === "Ready" ? (
              <>
                <button
                  onClick={() => sendReminder(order, 1)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Reminder 1
                </button>
                <button
                  onClick={() => sendReminder(order, 2)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Reminder 2
                </button>
                <button
                  onClick={() => markOrderCollected(order.id)}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Mark Collected
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderActiveSummaryButton(order: OrderView) {
    const ageSeconds = getElapsedSeconds(
      order.created_at,
      order.status === "Ready" ? order.ready_at || undefined : undefined
    );

    return (
      <div
        key={`summary-${order.id}`}
        className="rounded-xl border border-rose-200 bg-white p-2 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-rose-950">
              {order.customer?.name || "Guest"}
            </div>
            <div className="mt-1 truncate text-xs text-rose-700/70">
              {order.order_number}
            </div>
          </div>

          <div className="shrink-0 rounded-lg bg-rose-50 px-2 py-1 text-right">
            <div className="text-[10px] uppercase tracking-wide text-rose-700/70">
              Time
            </div>
            <div className="text-xs font-bold leading-4 text-rose-600">
              {mounted ? formatDurationFromSeconds(ageSeconds) : "-"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setSelectedQueueOrder(order)}
            className="flex-1 rounded-lg border border-rose-200 bg-white px-2 py-1.5 text-[10px] font-medium text-rose-700 hover:bg-rose-50"
          >
            Details
          </button>

          {order.status === "Ready" ? (
            <button
              onClick={() => markOrderCollected(order.id)}
              className="flex-1 rounded-lg bg-emerald-500 px-2 py-1.5 text-[10px] font-semibold text-white"
            >
              Completed
            </button>
          ) : (
            <button
              onClick={() => markOrderReady(order.id)}
              className="flex-1 rounded-lg bg-rose-500 px-2 py-1.5 text-[10px] font-semibold text-white"
            >
              Ready
            </button>
          )}
        </div>
      </div>
    );
  }

  const navButton = (mode: ViewMode, label: string) => (
    <button
      key={mode}
      onClick={() => setViewMode(mode)}
      className={`rounded-xl px-4 py-2 text-sm font-medium ${
        viewMode === mode
          ? "bg-rose-500 text-white"
          : "bg-white text-slate-700 ring-1 ring-rose-200"
      }`}
    >
      {label}
    </button>
  );

  return authLoading ? (
    <main className="min-h-screen bg-rose-50 p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        Checking access...
      </div>
    </main>
  ) : (
    <main className="min-h-screen bg-rose-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-rose-950">Spill The Tea POS</h1>
              <p className="mt-1 text-sm text-rose-700/70">{statusMessage}</p>
              <p className="mt-1 text-xs text-rose-700/60">
                Signed in as {staffProfile?.full_name || "Staff"} - {currentRole}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {navButton("pos", "POS")}
                {navButton("active", "Active")}
                {canViewInventory ? navButton("inventory", "Inventory/Stock") : null}
                {canViewInventory ? navButton("audit", "Stock Audit") : null}
                {navButton("history", "History")}
                {navButton("profitability", "COGS/Profit")}
                {canViewCustomers ? navButton("customers", "CRM & Loyalty") : null}
                {canViewCustomers ? navButton("campaigns", "WhatsApp Campaigns") : null}
                {canViewReports ? navButton("reports", "Reports") : null}
                {canViewReports ? navButton("dayClose", "Day Close") : null}
                {canViewReports ? navButton("reorder", "Reorder") : null}
                {canViewReports ? navButton("recipePricing", "Recipe Pricing") : null}
                {canViewSetup ? navButton("setup", "Setup") : null}
                {canViewRecipes ? navButton("recipes", "Product Recipes") : null}
              </div>
              {currentRole === "cashier" ? (
                <p className="text-xs text-rose-700/60">
                  Cashier access: POS, Active, and History only
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {viewMode === "pos" && (
          <div className="mx-auto max-w-[1720px] px-1 pb-2 pt-1 sm:px-2 xl:px-0">
            <div className="grid gap-4 xl:grid-cols-[150px_minmax(0,1fr)_340px]">
              <section className="xl:sticky xl:top-4 xl:self-start">
                <section className="rounded-3xl border border-rose-100 bg-white p-3 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-rose-950">Queue</h2>
                    <button
                      onClick={() => setViewMode("active")}
                      className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                    >
                      View all
                    </button>
                  </div>

                  <div className="space-y-3">
                    {queueOrders.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-600">
                        No active orders in queue.
                      </div>
                    ) : (
                      queueOrders.slice(0, 15).map((order) => renderActiveSummaryButton(order))
                    )}
                  </div>
                </section>
              </section>

              <section className="min-w-0">
                <section className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-3xl font-semibold text-slate-950">Create Order</h2>
                      <p className="mt-1 text-sm text-rose-700/70">
                        Build the order here. Customer history and totals stay on the right.
                      </p>
                    </div>

                    {activePromotion ? (
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-right">
                        <div className="text-xs font-medium text-rose-600">Promotion Active</div>
                        <div className="text-sm font-semibold text-rose-950">
                          {activePromotion.name} x {activePromotionMultiplier}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-900">
                        Customer Name
                      </label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-900">
                        Customer Phone
                      </label>
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+92xxxxxxxxxx"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                      />
                    </div>

                    <div>
                      <button
                        onClick={lookupCustomerByPhone}
                        className="h-[34px] rounded-xl border border-rose-200 bg-white px-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                      >
                        Lookup
                      </button>
                    </div>
                  </div>

                  {currentCustomer ? (
                    <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm">
                      <div className="font-semibold text-rose-950">
                        {currentCustomer.name || "Customer found"}
                      </div>
                      <div className="mt-1 text-rose-700/70">Phone: {currentCustomer.phone}</div>
                      <div className="mt-1 text-rose-700/70">
                        Reward Points: {Number(currentCustomer.reward_points || 0).toFixed(0)}
                      </div>
                      <div className="mt-1 text-rose-700/70">
                        Reward Rate: {currentRewardRate}% {activePromotion ? `x ${activePromotionMultiplier}` : ""}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <div className="mb-3 text-sm font-medium text-slate-900">Select Product</div>
                    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                      {products
                        .filter((p) => p.active !== false)
                        .map((product) => {
                          const selected = selectedProductForCart?.id === product.id;

                          return (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductForCart(product);
                                setSelectedModifierIds([]);
                              }}
                              className={`min-h-[92px] rounded-xl border p-3 text-left transition shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:-translate-y-[1px] hover:shadow-[0_8px_18px_rgba(0,0,0,0.10)] ${
                                selected
                                  ? "border-slate-900 bg-rose-500 text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)]"
                                  : "border-rose-200 bg-white text-rose-950 hover:border-rose-300"
                              }`}
                            >
                              <div className="min-h-[34px] text-[13px] font-semibold leading-4">
                                {product.name}
                              </div>
                              <div
                                className={`mt-1 text-xs font-medium ${
                                  selected ? "text-rose-100" : "text-rose-700"
                                }`}
                              >
                                {formatCurrency(product.price)}
                              </div>
                              <div
                                className={`mt-1 text-[10px] leading-3 ${
                                  selected ? "text-rose-100/80" : "text-rose-500/80"
                                }`}
                              >
                                {product.categories.map((cat) => cat.name).join(", ") || "Uncategorized"}
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </section>
              </section>

              <section className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-2xl font-semibold text-slate-950">
                    {currentCustomer ? "Customer History" : "Cart"}
                  </h2>

                  {currentCustomer ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-rose-50 p-4 text-sm">
                        <div className="font-semibold text-rose-950">
                          {currentCustomer.name || "No Name"}
                        </div>
                        <div className="mt-1 text-rose-700/70">{currentCustomer.phone}</div>
                        <div className="mt-1 text-rose-700/70">
                          Reward Points: {Number(currentCustomer.reward_points || 0).toFixed(0)}
                        </div>
                        <div className="mt-1 text-rose-700/70">
                          Lifetime Eligible Spend: {formatCurrency(currentCustomer.lifetime_eligible_spend)}
                        </div>
                      </div>

                      {canEditCustomerBonus ? (
                        <div>
                          <label className="mb-2 block text-xs font-medium">Manual Bonus %</label>
                          <div className="flex gap-2">
                            <input
                              value={manualBonusInput}
                              onChange={(e) => setManualBonusInput(e.target.value)}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => saveCustomerBonus(currentCustomer.id, manualBonusInput)}
                              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <div className="mb-2 text-sm font-medium">Recent Orders</div>
                        <div className="mb-2 text-[11px] text-rose-700/70">
                          Click Ready to instantly open WhatsApp for the ready message. After that, Reminder 1, Reminder 2, and Collected appear below the order.
                        </div>
                        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                          {customerRecentOrders.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                              No recent orders.
                            </div>
                          ) : (
                            customerRecentOrders.slice(0, 5).map((order) => renderOrderCard(order, false))
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-sm font-medium">Points Ledger</div>
                        <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                          {customerPointsLedger.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
                              No ledger entries.
                            </div>
                          ) : (
                            customerPointsLedger.map((entry) => (
                              <div key={entry.id} className="rounded-xl border border-rose-100 bg-white p-3 text-xs">
                                <div className="font-medium text-rose-950">
                                  {entry.entry_type} - {Number(entry.points).toFixed(0)}
                                </div>
                                <div className="mt-1 text-rose-700/70">{entry.note || "-"}</div>
                                <div className="mt-1 text-rose-700/70">{formatTime(entry.created_at)}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cart.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-base text-rose-500">
                          No items added yet.
                        </div>
                      ) : (
                        cart.map((item) => {
                          const modifierTotal = item.modifiers.reduce(
                            (sum, mod) => sum + Number(mod.price_delta || 0),
                            0
                          );

                          const unitPrice =
                            item.pricing_mode === "complimentary"
                              ? 0
                              : item.pricing_mode === "discounted"
                              ? Math.max(0, Number(item.discounted_unit_price || 0))
                              : item.base_price + modifierTotal;

                          return (
                            <div
                              key={item.line_id}
                              className="rounded-2xl border border-rose-100 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-rose-950">
                                    {item.name}
                                  </div>
                                  <div className="mt-1 text-xs text-rose-600">
                                    Qty {item.quantity} x {formatCurrency(unitPrice)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-rose-500">
                                    Mode: {item.pricing_mode}
                                  </div>
                                  {item.modifiers.length > 0 ? (
                                    <div className="mt-1 text-[11px] text-rose-500">
                                      {item.modifiers.map((m) => m.name).join(", ")}
                                    </div>
                                  ) : null}
                                  {item.notes ? (
                                    <div className="mt-1 text-[11px] text-rose-500">
                                      Notes: {item.notes}
                                    </div>
                                  ) : null}
                                </div>

                                <div className="text-right">
                                  <div className="font-semibold text-rose-950">
                                    {formatCurrency(unitPrice * item.quantity)}
                                  </div>

                                  <div className="mt-2 flex gap-2">
                                    <button
                                      onClick={() => updateCartQty(item.line_id, -1)}
                                      className="rounded-lg border border-rose-200 px-3 py-1 text-sm"
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => updateCartQty(item.line_id, 1)}
                                      className="rounded-lg border border-rose-200 px-3 py-1 text-sm"
                                    >
                                      +
                                    </button>
                                    <button
                                      onClick={() => removeCartLine(item.line_id)}
                                      className="rounded-lg border border-rose-200 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-2xl font-semibold text-slate-950">
                    Current Order Totals
                  </h2>

                  <div className="space-y-2 rounded-2xl bg-rose-50 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatCurrency(cartSubtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Eligible</span>
                      <span className="font-medium">{formatCurrency(eligibleSubtotal)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Non Eligible</span>
                      <span className="font-medium">{formatCurrency(nonEligibleSubtotal)}</span>
                    </div>

                    <div className="pt-1">
                      <label className="mb-1 block text-xs font-medium">Redeem Points</label>
                      <input
                        value={redeemPointsInput}
                        onChange={(e) => setRedeemPointsInput(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>

                    {taxBreakdown.map((tax) => (
                      <div key={tax.id} className="flex items-center justify-between text-xs">
                        <span>
                          {tax.name} ({tax.rate_percent}%)
                        </span>
                        <span>{formatCurrency(tax.amount)}</span>
                      </div>
                    ))}

                    <div className="flex items-center justify-between border-t border-rose-200 pt-2">
                      <span className="font-semibold">Grand Total</span>
                      <span className="text-lg font-bold">{formatCurrency(cartGrandTotal)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span>Projected Points Earned</span>
                      <span>{Number(projectedPointsEarned).toFixed(0)}</span>
                    </div>

                    <div className="pt-1">
                      <div className="mb-2 text-xs font-medium">Payment Method</div>
                      <div className="grid grid-cols-3 gap-2">
                        {paymentMethods
                          .filter((method) => method.active !== false)
                          .map((method) => {
                            const selected = selectedPaymentMethodId === method.id;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setSelectedPaymentMethodId(method.id)}
                                className={`rounded-xl border px-2 py-2 text-center text-xs font-medium transition ${
                                  selected
                                    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                    : "border-rose-200 bg-white text-rose-950 hover:border-emerald-300"
                                }`}
                              >
                                <div className="truncate">{method.name}</div>
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    {isCashPayment ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                        <div className="mb-2 text-xs font-medium text-emerald-700">Cash Received</div>
                        <input
                          value={cashReceivedInput}
                          onChange={(e) => setCashReceivedInput(e.target.value)}
                          className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"
                          placeholder="Enter cash given by customer"
                        />
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-emerald-700">Change</span>
                          <span className="text-lg font-bold text-emerald-700">
                            {formatCurrency(cashChange)}
                          </span>
                        </div>
                      </div>
                    ) : null}

                    <button
                      onClick={createOrder}
                      disabled={saving}
                      className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Create Order"}
                    </button>
                  </div>
                </section>
              </section>
            </div>
          </div>
        )}
        {viewMode === "active" && (
          <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Active Orders</h2>
              <div className="text-xs text-rose-700/70">
                Preparing: {preparingOrders.length}
              </div>
            </div>

            <div className="space-y-3">
              {preparingOrders.length === 0 ? (
                <p className="text-rose-700/70">No preparing orders.</p>
              ) : (
                preparingOrders.map((order) => renderOrderCard(order))
              )}
            </div>
          </section>
        )}

{viewMode === "history" && (
          <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Completed Orders History</h2>
            <div className="space-y-3">
              {completedOrders.length === 0 ? (
                <p className="text-rose-700/70">No completed orders yet.</p>
              ) : (
                completedOrders.map((order) => renderOrderCard(order, true))
              )}
            </div>
          </section>
        )}


        {viewMode === "profitability" && (() => {
          const periodStart = getPeriodStart(profitabilityPeriod);
          const filteredOrders = profitableOrders.filter((order: any) => {
            const stamp = order.completed_at || order.collected_at || order.updated_at || order.created_at;
            if (!stamp) return false;
            return new Date(stamp) >= periodStart;
          });

          const totalSales = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
          const totalCogs = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.cost_row?.actual_cogs || 0), 0);
          const grossProfit = filteredOrders.reduce((sum: number, order: any) => sum + Number(order.cost_row?.gross_profit || 0), 0);
          const contributionMargin = totalSales > 0 ? grossProfit / totalSales : 0;
          const fixedCostTotal = fixedCosts.reduce(
            (sum: number, cost) => sum + allocateFixedCostToPeriod(cost, profitabilityPeriod),
            0
          );
          const breakEvenSales = contributionMargin > 0 ? fixedCostTotal / contributionMargin : 0;
          const breakEvenGap = totalSales - breakEvenSales;

          const selectedOrder =
            filteredOrders.find((order: any) => String(order.id) === String(selectedProfitOrderId)) ||
            filteredOrders[0] ||
            null;

          const selectedMovements = inventoryMovements.filter(
            (movement) => String(movement.order_id || "") === String(selectedOrder?.id || "")
          );

          const orderItemBreakdown = (selectedOrder?.items || []).map((item: any) => {
            const itemRevenue = Number(item.line_total || 0);
            const matchingMovements = selectedMovements.filter(
              (movement) =>
                String(movement.product_name || "").trim().toLowerCase() === String(item.product_name || "").trim().toLowerCase()
            );
            const itemCogs = matchingMovements.reduce((sum: number, movement) => sum + Number(movement.line_cost || 0), 0);
            return {
              ...item,
              itemRevenue,
              itemCogs,
              itemProfit: itemRevenue - itemCogs,
            };
          });

          return (
            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Advanced Profitability Dashboard</h2>
                  <p className="mt-1 text-xs text-rose-700/70">
                    Review order-level and item-level profit, running totals, fixed costs, contribution margin, and break-even status.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["day", "week", "month", "quarter", "year"] as const).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setProfitabilityPeriod(period)}
                      className={`rounded-xl px-4 py-2 text-xs font-medium ${
                        profitabilityPeriod === period
                          ? "bg-rose-500 text-white shadow-sm"
                          : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                      }`}
                    >
                      {period[0].toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Sales</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(totalSales)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">COGS</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(totalCogs)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Gross Profit</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(grossProfit)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Contribution Margin</div>
                  <div className="mt-1 text-lg font-semibold">{(contributionMargin * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Fixed Costs ({profitabilityPeriod})</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(fixedCostTotal)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Break-even Sales</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(breakEvenSales)}</div>
                </div>
                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Break-even Gap / Surplus</div>
                  <div className={`mt-1 text-lg font-semibold ${breakEvenGap >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {formatCurrency(Math.abs(breakEvenGap))} {breakEvenGap >= 0 ? "ahead" : "behind"}
                  </div>
                </div>
              </div>

              <div className="mb-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-3 text-sm font-semibold">Completed Orders</div>
                  <div className="space-y-2">
                    {filteredOrders.length === 0 ? (
                      <div className="rounded-xl border border-rose-100 p-4 text-sm text-rose-700/70">
                        No completed orders with COGS results for this period.
                      </div>
                    ) : (
                      filteredOrders.map((order: any) => {
                        const cogs = Number(order.cost_row?.actual_cogs || 0);
                        const gp = Number(order.cost_row?.gross_profit || 0);
                        const total = Number(order.total || 0);
                        const margin = total > 0 ? ((gp / total) * 100).toFixed(1) : "0.0";

                        return (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => setSelectedProfitOrderId(String(order.id))}
                            className={`w-full rounded-xl border p-4 text-left shadow-sm ${
                              String(selectedOrder?.id || "") === String(order.id)
                                ? "border-rose-500 bg-rose-50"
                                : "border-rose-100 bg-white hover:bg-rose-50/40"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold">Order #{order.order_number || order.id}</div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  {order.customer_name || "Walk-in"} | {formatDateTime(order.completed_at || order.collected_at || order.updated_at || order.created_at)}
                                </div>
                              </div>
                              <div className="text-right text-xs">
                                <div>Sales: {formatCurrency(total)}</div>
                                <div>COGS: {formatCurrency(cogs)}</div>
                                <div>Profit: {formatCurrency(gp)}</div>
                                <div>Margin: {margin}%</div>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-3 text-sm font-semibold">Fixed Costs</div>

                  <div className="mb-3 grid gap-2 md:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                    <input
                      value={fixedCostForm.name}
                      onChange={(e) => setFixedCostForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                      placeholder="Rent, Salaries, Electricity"
                    />
                    <input
                      value={fixedCostForm.amount}
                      onChange={(e) => setFixedCostForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                      placeholder="Amount"
                      inputMode="decimal"
                    />
                    <select
                      value={fixedCostForm.frequency}
                      onChange={(e) =>
                        setFixedCostForm((prev) => ({
                          ...prev,
                          frequency: e.target.value as "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
                        }))
                      }
                      className="w-full rounded-xl border px-3 py-2 text-xs"
                    >
                      <option value="daily">daily</option>
                      <option value="weekly">weekly</option>
                      <option value="monthly">monthly</option>
                      <option value="quarterly">quarterly</option>
                      <option value="yearly">yearly</option>
                    </select>
                    <button
                      type="button"
                      onClick={addFixedCost}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm"
                    >
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {fixedCosts.length === 0 ? (
                      <div className="rounded-xl border border-rose-100 p-4 text-sm text-rose-700/70">
                        No fixed costs added yet.
                      </div>
                    ) : (
                      fixedCosts.map((cost) => (
                        <div key={cost.id} className="flex items-center justify-between rounded-xl border border-rose-100 p-3 text-sm">
                          <div>
                            <div className="font-medium">{cost.name}</div>
                            <div className="text-xs text-rose-700/70">
                              {formatCurrency(cost.amount)} / {cost.frequency}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFixedCost(cost.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-3 text-sm font-semibold">Selected Order Breakdown</div>

                  {selectedOrder ? (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Order Sales</div>
                          <div className="mt-1 font-semibold">{formatCurrency(Number(selectedOrder.total || 0))}</div>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Order COGS</div>
                          <div className="mt-1 font-semibold">{formatCurrency(Number(selectedOrder.cost_row?.actual_cogs || 0))}</div>
                        </div>
                        <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Order Profit</div>
                          <div className="mt-1 font-semibold">{formatCurrency(Number(selectedOrder.cost_row?.gross_profit || 0))}</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {orderItemBreakdown.length === 0 ? (
                          <div className="text-sm text-rose-700/70">No sold items found for this order.</div>
                        ) : (
                          orderItemBreakdown.map((item: any, index: number) => (
                            <div key={`${selectedOrder.id}-${index}`} className="rounded-xl border border-rose-100 p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-medium">{item.product_name}</div>
                                  <div className="mt-1 text-xs text-rose-700/70">Qty: {item.quantity}</div>
                                </div>
                                <div className="text-right text-xs">
                                  <div>Revenue: {formatCurrency(Number(item.itemRevenue || 0))}</div>
                                  <div>COGS: {formatCurrency(Number(item.itemCogs || 0))}</div>
                                  <div>Profit: {formatCurrency(Number(item.itemProfit || 0))}</div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700/70">Select a completed order to inspect item-level profit.</div>
                  )}
                </div>

                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-3 text-sm font-semibold">Inventory Movements</div>

                  {selectedOrder ? (
                    <div className="space-y-2">
                      {selectedMovements.length === 0 ? (
                        <div className="text-sm text-rose-700/70">No inventory movements logged for this order.</div>
                      ) : (
                        selectedMovements.map((movement) => (
                          <div key={movement.id} className="rounded-xl border border-rose-100 p-3 text-sm">
                            <div className="font-medium">
                              {inventoryItems.find((item) => Number(item.id) === Number(movement.inventory_item_id))?.item_name ||
                                `Item #${movement.inventory_item_id}`}
                            </div>
                            <div className="mt-1 text-xs text-rose-700/70">
                              Product: {movement.product_name || "-"} | Qty: {Math.abs(Number(movement.quantity_change || 0))} {movement.unit || ""}
                            </div>
                            <div className="mt-1 text-xs text-rose-700/70">
                              Unit Cost: {formatSmallCurrency(Number(movement.unit_cost || 0))} | Line Cost: {formatCurrency(Number(movement.line_cost || 0))}
                            </div>
                            <div className="mt-1 text-xs text-rose-700/70">
                              Batch: {movement.batch_id || "-"} | {formatDateTime(movement.created_at)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700/70">Select a completed order to see deduction movements.</div>
                  )}
                </div>
              </div>
            </section>
          );
        })()}

        {viewMode === "reports" && canViewReports && (() => {
          const reportStart = getPeriodStart(profitabilityPeriod);
          const reportOrders = completedOrders.filter((order) => {
            const stamp = order.collected_at || order.ready_at || order.created_at;
            if (!stamp) return false;
            return new Date(stamp) >= reportStart;
          });

          const reportOrderIds = new Set(reportOrders.map((order) => Number(order.id)));
          const reportSalesTotal = reportOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
          const reportSubtotalTotal = reportOrders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
          const reportTaxTotal = reportOrders.reduce((sum, order) => sum + Number(order.tax_total || 0), 0);
          const reportDiscountTotal = reportOrders.reduce((sum, order) => sum + Number(order.discount_total || 0), 0);
          const reportPointsEarnedTotal = reportOrders.reduce((sum, order) => sum + Number(order.points_earned || 0), 0);
          const reportPointsRedeemedTotal = reportOrders.reduce((sum, order) => sum + Number(order.points_redeemed || 0), 0);
          const reportAverageOrderValue = reportOrders.length > 0 ? reportSalesTotal / reportOrders.length : 0;

          const periodDays = Math.max(1, Math.ceil((Date.now() - reportStart.getTime()) / 86400000));
          const avgOrdersPerDay = reportOrders.length / periodDays;
          const avgSalesPerDay = reportSalesTotal / periodDays;

          const reportProfitableOrders = profitableOrders.filter((order: any) => reportOrderIds.has(Number(order.id)));
          const reportCogsTotal = reportProfitableOrders.reduce((sum: number, order: any) => sum + Number(order.cost_row?.actual_cogs || 0), 0);
          const reportGrossProfit = reportProfitableOrders.reduce((sum: number, order: any) => sum + Number(order.cost_row?.gross_profit || 0), 0);
          const reportMargin = reportSalesTotal > 0 ? reportGrossProfit / reportSalesTotal : 0;

          const itemSalesMap = new Map<string, { name: string; qty: number; sales: number; orders: number }>();
          reportOrders.forEach((order) => {
            order.items.forEach((item) => {
              const key = String(item.product_name || '').trim() || 'Unnamed Item';
              const current = itemSalesMap.get(key) || { name: key, qty: 0, sales: 0, orders: 0 };
              current.qty += Number(item.quantity || 0);
              current.sales += Number(item.line_total || 0);
              current.orders += 1;
              itemSalesMap.set(key, current);
            });
          });
          const topSellingItems = Array.from(itemSalesMap.values()).sort((a, b) => b.sales - a.sales);

          const paymentMixMap = new Map<string, { name: string; orders: number; sales: number }>();
          reportOrders.forEach((order) => {
            const key = String(order.payment_method_name || 'Unknown');
            const current = paymentMixMap.get(key) || { name: key, orders: 0, sales: 0 };
            current.orders += 1;
            current.sales += Number(order.total || 0);
            paymentMixMap.set(key, current);
          });
          const paymentMixRows = Array.from(paymentMixMap.values()).sort((a, b) => b.sales - a.sales);

          const reportSaleMovements = inventoryMovements.filter((movement) => {
            if (!movement.order_id || !reportOrderIds.has(Number(movement.order_id))) return false;
            return String(movement.movement_type || '').toLowerCase() === 'sale_deduction';
          });

          const inventoryUseMap = new Map<string, { itemName: string; unit: string; qtyUsed: number; totalCost: number }>();
          reportSaleMovements.forEach((movement) => {
            const inventoryItem = inventoryItems.find((item) => Number(item.id) === Number(movement.inventory_item_id));
            const key = String(movement.inventory_item_id || movement.product_name || movement.id);
            const current = inventoryUseMap.get(key) || {
              itemName: inventoryItem?.item_name || `Item ${movement.inventory_item_id || ''}`,
              unit: inventoryItem?.unit || movement.unit || '-',
              qtyUsed: 0,
              totalCost: 0,
            };
            current.qtyUsed += Math.abs(Number(movement.quantity_change || 0));
            current.totalCost += Number(movement.line_cost || 0);
            inventoryUseMap.set(key, current);
          });
          const inventoryUseRows = Array.from(inventoryUseMap.values()).sort((a, b) => b.totalCost - a.totalCost || b.qtyUsed - a.qtyUsed);

          const purchasePriceHistoryMap = new Map<number, number[]>();
          vendorShipmentLines.forEach((line) => {
            const itemId = Number(line.inventory_item_id || 0);
            if (!itemId || line.unit_cost == null) return;
            const arr = purchasePriceHistoryMap.get(itemId) || [];
            arr.push(Number(line.unit_cost || 0));
            purchasePriceHistoryMap.set(itemId, arr);
          });

          const lowStockForecastRows = inventoryItems
            .map((item) => {
              const useRow = inventoryUseRows.find((row) => row.itemName === item.item_name);
              const qtyUsed = Number(useRow?.qtyUsed || 0);
              const dailyUsage = qtyUsed / periodDays;
              const daysCover = dailyUsage > 0 ? Number(item.current_stock || 0) / dailyUsage : null;
              const latestPrices = purchasePriceHistoryMap.get(Number(item.id)) || [];
              const latestPrice = latestPrices.length > 0 ? latestPrices[latestPrices.length - 1] : 0;
              return {
                item,
                dailyUsage,
                daysCover,
                latestPrice,
                projected7DayQty: dailyUsage * 7,
                projected30DayQty: dailyUsage * 30,
                projected7DayCost: dailyUsage * 7 * latestPrice,
                projected30DayCost: dailyUsage * 30 * latestPrice,
              };
            })
            .filter((row) => row.dailyUsage > 0 || Number(row.item.current_stock || 0) <= Number(row.item.reorder_level || 0))
            .sort((a, b) => {
              const aDays = a.daysCover == null ? Number.POSITIVE_INFINITY : a.daysCover;
              const bDays = b.daysCover == null ? Number.POSITIVE_INFINITY : b.daysCover;
              return aDays - bDays;
            });

          const worstMarginItems = topSellingItems
            .map((item) => {
              const matchingCosts = reportSaleMovements
                .filter((movement) => String(movement.product_name || '').trim().toLowerCase() === item.name.trim().toLowerCase())
                .reduce((sum, movement) => sum + Number(movement.line_cost || 0), 0);
              return {
                ...item,
                cogs: matchingCosts,
                profit: item.sales - matchingCosts,
                margin: item.sales > 0 ? (item.sales - matchingCosts) / item.sales : 0,
              };
            })
            .sort((a, b) => a.margin - b.margin);

          return (
            <div className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Management Reports & Forecasts</h2>
                    <p className="mt-1 text-xs text-rose-700/70">
                      Track sales, mix, consumption, profit, and forward-looking stock and purchasing needs using the same operational data already captured in the POS.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["day", "week", "month", "quarter", "year"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setProfitabilityPeriod(period)}
                        className={`rounded-xl px-4 py-2 text-xs font-medium ${
                          profitabilityPeriod === period
                            ? "bg-rose-500 text-white shadow-sm"
                            : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        {period[0].toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
                  {[
                    ["Orders", String(reportOrders.length)],
                    ["Sales", formatCurrency(reportSalesTotal)],
                    ["Avg Order Value", formatCurrency(reportAverageOrderValue)],
                    ["COGS", formatCurrency(reportCogsTotal)],
                    ["Gross Profit", formatCurrency(reportGrossProfit)],
                    ["Margin", `${(reportMargin * 100).toFixed(1)}%`],
                    ["Tax Collected", formatCurrency(reportTaxTotal)],
                    ["Discounts", formatCurrency(reportDiscountTotal)],
                    ["Points Earned", Number(reportPointsEarnedTotal).toFixed(0)],
                    ["Points Redeemed", Number(reportPointsRedeemedTotal).toFixed(0)],
                    ["Avg Orders / Day", avgOrdersPerDay.toFixed(1)],
                    ["Avg Sales / Day", formatCurrency(avgSalesPerDay)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">{label}</div>
                      <div className="mt-1 text-lg font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">Top Selling Items</h3>
                    <div className="text-xs text-rose-700/70">Ranked by sales value</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-rose-700/70">
                          <th className="px-3 py-2">Rank</th>
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2">Qty Sold</th>
                          <th className="px-3 py-2">Sales</th>
                          <th className="px-3 py-2">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSellingItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-rose-700/70">No completed sales in this period.</td>
                          </tr>
                        ) : (
                          topSellingItems.map((item, index) => (
                            <tr key={item.name} className="border-b last:border-b-0">
                              <td className="px-3 py-2 font-medium">#{index + 1}</td>
                              <td className="px-3 py-2 font-medium">{item.name}</td>
                              <td className="px-3 py-2">{item.qty}</td>
                              <td className="px-3 py-2">{formatCurrency(item.sales)}</td>
                              <td className="px-3 py-2">{item.orders}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">Payment Mix</h3>
                    <div className="text-xs text-rose-700/70">By completed sales</div>
                  </div>
                  <div className="space-y-3">
                    {paymentMixRows.length === 0 ? (
                      <p className="text-rose-700/70">No payment data yet.</p>
                    ) : (
                      paymentMixRows.map((row) => {
                        const share = reportSalesTotal > 0 ? row.sales / reportSalesTotal : 0;
                        return (
                          <div key={row.name} className="rounded-xl border border-rose-100 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium">{row.name}</div>
                              <div className="font-semibold">{formatCurrency(row.sales)}</div>
                            </div>
                            <div className="mt-1 text-xs text-rose-700/70">Orders {row.orders} · Share {(share * 100).toFixed(1)}%</div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-rose-100">
                              <div className="h-full rounded-full bg-rose-400" style={{ width: `${Math.max(4, share * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">Inventory Usage</h3>
                    <div className="text-xs text-rose-700/70">Ingredients ranked by consumption cost</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-rose-700/70">
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2">Qty Used</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2">Usage Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryUseRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-rose-700/70">No inventory usage recorded yet.</td>
                          </tr>
                        ) : (
                          inventoryUseRows.map((row) => (
                            <tr key={`${row.itemName}-${row.unit}`} className="border-b last:border-b-0">
                              <td className="px-3 py-2 font-medium">{row.itemName}</td>
                              <td className="px-3 py-2">{row.qtyUsed.toFixed(2)}</td>
                              <td className="px-3 py-2">{row.unit}</td>
                              <td className="px-3 py-2">{formatCurrency(row.totalCost)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">Lowest Margin Items</h3>
                    <div className="text-xs text-rose-700/70">Use this for pricing review</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-rose-700/70">
                          <th className="px-3 py-2">Item</th>
                          <th className="px-3 py-2">Sales</th>
                          <th className="px-3 py-2">COGS</th>
                          <th className="px-3 py-2">Profit</th>
                          <th className="px-3 py-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worstMarginItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-rose-700/70">No item profitability data yet.</td>
                          </tr>
                        ) : (
                          worstMarginItems.slice(0, 10).map((item) => (
                            <tr key={item.name} className="border-b last:border-b-0">
                              <td className="px-3 py-2 font-medium">{item.name}</td>
                              <td className="px-3 py-2">{formatCurrency(item.sales)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.cogs)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.profit)}</td>
                              <td className="px-3 py-2">{(item.margin * 100).toFixed(1)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Forecast & Reorder Planning</h3>
                    <p className="mt-1 text-xs text-rose-700/70">
                      Forecasts are based on average daily usage from the selected reporting period. Use this to plan vendor orders before service is disrupted.
                    </p>
                  </div>
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700/80">
                    Forecast basis: {periodDays} day{periodDays === 1 ? '' : 's'} of completed sales and recorded usage
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-rose-700/70">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">On Hand</th>
                        <th className="px-3 py-2">Daily Usage</th>
                        <th className="px-3 py-2">Days of Cover</th>
                        <th className="px-3 py-2">7 Day Need</th>
                        <th className="px-3 py-2">30 Day Need</th>
                        <th className="px-3 py-2">7 Day Spend</th>
                        <th className="px-3 py-2">30 Day Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockForecastRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-rose-700/70">No forecast data yet. Complete some sales and recipe deductions first.</td>
                        </tr>
                      ) : (
                        lowStockForecastRows.map((row) => {
                          const cover = row.daysCover == null ? '-' : `${row.daysCover.toFixed(1)} days`;
                          const danger = row.daysCover != null && row.daysCover <= 7;
                          return (
                            <tr key={row.item.id} className="border-b last:border-b-0">
                              <td className="px-3 py-2 font-medium">{row.item.item_name}</td>
                              <td className="px-3 py-2">{Number(row.item.current_stock || 0).toFixed(2)} {row.item.unit}</td>
                              <td className="px-3 py-2">{row.dailyUsage.toFixed(2)} / day</td>
                              <td className={`px-3 py-2 font-medium ${danger ? 'text-rose-600' : ''}`}>{cover}</td>
                              <td className="px-3 py-2">{row.projected7DayQty.toFixed(2)}</td>
                              <td className="px-3 py-2">{row.projected30DayQty.toFixed(2)}</td>
                              <td className="px-3 py-2">{formatCurrency(row.projected7DayCost)}</td>
                              <td className="px-3 py-2">{formatCurrency(row.projected30DayCost)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          );
        })()}

        {viewMode === "dayClose" && canViewReports && (() => {
          const closeStart = getPeriodStart(profitabilityPeriod);
          const closeOrders = completedOrders.filter((order) => {
            const stamp = order.collected_at || order.ready_at || order.created_at;
            if (!stamp) return false;
            return new Date(stamp) >= closeStart;
          });
          const paymentSummary = Array.from(
            closeOrders.reduce((map, order) => {
              const key = String(order.payment_method_name || "Unknown");
              const current = map.get(key) || { method: key, orders: 0, total: 0 };
              current.orders += 1;
              current.total += Number(order.total || 0);
              map.set(key, current);
              return map;
            }, new Map<string, { method: string; orders: number; total: number }>()).values()
          ).sort((a, b) => b.total - a.total);
          const cashSales = paymentSummary
            .filter((row) => row.method.toLowerCase().includes("cash"))
            .reduce((sum, row) => sum + row.total, 0);
          const nonCashSales = paymentSummary.reduce((sum, row) => sum + row.total, 0) - cashSales;
          const openingCash = Number(dayCloseOpeningCashInput || 0);
          const actualCash = Number(dayCloseActualCashInput || 0);
          const depositCash = Math.max(0, Number(dayCloseDepositCashInput || 0));
          const floatCash = Math.max(0, Number(dayCloseFloatCashInput || 0));
          const expectedDrawerCash = openingCash + cashSales;
          const drawerVariance = actualCash - expectedDrawerCash;
          const remainingAfterDeposit = actualCash - depositCash;
          const floatVariance = floatCash - remainingAfterDeposit;
          const compsAndDiscounts = closeOrders.reduce((sum, order) => sum + Number(order.discount_total || 0), 0);
          const averageTicket = closeOrders.length > 0 ? closeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) / closeOrders.length : 0;
          return (
            <div className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Day Close / Shift Close</h2>
                    <p className="mt-1 text-xs text-rose-700/70">Use this screen to reconcile the drawer, review sales mix, record deposits, and decide the float kept for the next day. Next day opening cash should be entered separately and will often differ from total closing cash.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["day", "week", "month", "quarter", "year"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setProfitabilityPeriod(period)}
                        className={`rounded-xl px-4 py-2 text-xs font-medium ${
                          profitabilityPeriod === period
                            ? "bg-rose-500 text-white shadow-sm"
                            : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                        }`}
                      >
                        {period[0].toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["Orders Closed", String(closeOrders.length)],
                    ["Cash Sales", formatCurrency(cashSales)],
                    ["Non Cash Sales", formatCurrency(nonCashSales)],
                    ["Discounts / Comps", formatCurrency(compsAndDiscounts)],
                    ["Average Ticket", formatCurrency(averageTicket)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">{label}</div>
                      <div className="mt-1 text-lg font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="space-y-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div>
                    <h3 className="mb-4 text-xl font-semibold">Drawer Reconciliation</h3>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Opening Cash</label>
                        <input value={dayCloseOpeningCashInput} onChange={(e) => setDayCloseOpeningCashInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Actual Cash Counted</label>
                        <input value={dayCloseActualCashInput} onChange={(e) => setDayCloseActualCashInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Enter counted cash" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Cash to Deposit</label>
                        <input value={dayCloseDepositCashInput} onChange={(e) => setDayCloseDepositCashInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Amount being deposited" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">Cash Kept as Float</label>
                        <input value={dayCloseFloatCashInput} onChange={(e) => setDayCloseFloatCashInput(e.target.value)} className="w-full rounded-xl border px-3 py-2" placeholder="Suggested next day float" />
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-5">
                      <div className="rounded-xl bg-rose-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Expected Drawer Cash</div>
                        <div className="mt-1 text-lg font-semibold">{formatCurrency(expectedDrawerCash)}</div>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Actual Count</div>
                        <div className="mt-1 text-lg font-semibold">{formatCurrency(actualCash)}</div>
                      </div>
                      <div className={`rounded-xl p-3 ${drawerVariance >= 0 ? "bg-emerald-50" : "bg-rose-50"}`}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Short / Over</div>
                        <div className={`mt-1 text-lg font-semibold ${drawerVariance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatCurrency(drawerVariance)}</div>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Remaining After Deposit</div>
                        <div className="mt-1 text-lg font-semibold">{formatCurrency(remainingAfterDeposit)}</div>
                      </div>
                      <div className={`rounded-xl p-3 ${Math.abs(floatVariance) < 0.001 ? "bg-emerald-50" : "bg-amber-50"}`}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Float Check</div>
                        <div className={`mt-1 text-lg font-semibold ${Math.abs(floatVariance) < 0.001 ? "text-emerald-700" : "text-amber-700"}`}>{Math.abs(floatVariance) < 0.001 ? "Matches remaining cash" : formatCurrency(floatVariance)}</div>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm">
                      <div className="font-semibold text-rose-900">Carry Forward Guidance</div>
                      <div className="mt-2 text-rose-800/80">Closing cash should not automatically become tomorrow's opening cash. Record the deposit amount, decide the float to keep, and then enter next day's opening cash separately based on the float you actually leave in the drawer.</div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Suggested Next Opening Cash</div>
                          <div className="mt-1 text-lg font-semibold">{formatCurrency(floatCash)}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">Unallocated Difference</div>
                          <div className={`mt-1 text-lg font-semibold ${Math.abs(floatVariance) < 0.001 ? "text-emerald-700" : "text-amber-700"}`}>{Math.abs(floatVariance) < 0.001 ? "Rs 0" : formatCurrency(floatVariance)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-xl font-semibold">Payments Received Summary</h3>
                    <div className="overflow-x-auto rounded-2xl border border-rose-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-rose-50 text-left text-rose-700">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Payment Type</th>
                            <th className="px-3 py-2 font-semibold">Orders</th>
                            <th className="px-3 py-2 font-semibold">Amount Received</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentSummary.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3 py-4 text-rose-700/70">No completed orders in the selected period.</td>
                            </tr>
                          ) : paymentSummary.map((row) => (
                            <tr key={row.method} className="border-t border-rose-100">
                              <td className="px-3 py-2 font-medium">{row.method}</td>
                              <td className="px-3 py-2">{row.orders}</td>
                              <td className="px-3 py-2">{formatCurrency(row.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">Difference Notes</label>
                      <textarea value={dayCloseDifferenceNotes} onChange={(e) => setDayCloseDifferenceNotes(e.target.value)} className="min-h-[120px] w-full rounded-xl border px-3 py-2" placeholder="Explain drawer shortages, overages, payment mismatches, missing receipts, bank deposit differences, float differences, or reconciliation issues" />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">General Close Notes</label>
                      <textarea value={dayCloseNotes} onChange={(e) => setDayCloseNotes(e.target.value)} className="min-h-[120px] w-full rounded-xl border px-3 py-2" placeholder="Shift remarks, issues, follow up for next day, handover notes" />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-xl font-semibold">Close Checklist</h3>
                  <div className="space-y-3 text-sm">
                    {[
                      `Verify all active orders are completed or intentionally left open. Current active/preparing count: ${preparingOrders.length}.`,
                      `Run stock audit for key items before or after close so today's closing stock becomes tomorrow's opening stock.`,
                      `Review discounts and complimentary items: ${formatCurrency(compsAndDiscounts)} for this selected period.`,
                      `Check non-cash totals against payment records: ${formatCurrency(nonCashSales)}.`,
                      `Review high-usage ingredients and reorder risks in the Reorder tab before placing supplier calls.`,
                    ].map((line, index) => (
                      <div key={index} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-3">
                        <div className="font-medium">{line}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          );
        })()}

        {viewMode === "reorder" && canViewReports && (() => {
          const reportStart = getPeriodStart(profitabilityPeriod);
          const reportOrderIds = new Set(
            completedOrders
              .filter((order) => {
                const stamp = order.collected_at || order.ready_at || order.created_at;
                return stamp ? new Date(stamp) >= reportStart : false;
              })
              .map((order) => Number(order.id))
          );
          const saleMovements = inventoryMovements.filter((movement) => {
            if (!movement.order_id || !reportOrderIds.has(Number(movement.order_id))) return false;
            return String(movement.movement_type || "").toLowerCase() === "sale_deduction";
          });
          const periodDays = Math.max(1, Math.ceil((Date.now() - reportStart.getTime()) / 86400000));
          const reorderRows = inventoryItems.map((item) => {
            const itemMovements = saleMovements.filter((movement) => Number(movement.inventory_item_id) === Number(item.id));
            const rawUsage = itemMovements.reduce((sum, movement) => sum + Math.abs(Number(movement.quantity_change || 0)), 0);
            const dailyUsageRaw = rawUsage / periodDays;
            const onHandRaw = Number(item.current_stock || 0);
            const targetDays = 14;
            const reorderQtyRaw = Math.max(0, dailyUsageRaw * targetDays - onHandRaw);
            const displayUnit = getInventoryDisplayUnit(item);
            const onHandDisplay = getInventoryDisplayQuantity(onHandRaw, item);
            const reorderQtyDisplay = getInventoryDisplayQuantity(reorderQtyRaw, item);
            const latestUnitCost = Number(inventoryCostSummaryByItem[item.id]?.latest_unit_cost || 0);
            const displayLatestPrice = getInventoryDisplayPrice(latestUnitCost, item);
            const daysCover = dailyUsageRaw > 0 ? onHandRaw / dailyUsageRaw : null;
            const estimatedReorderCost = reorderQtyDisplay * displayLatestPrice;
            return {
              item,
              displayUnit,
              onHandDisplay,
              reorderQtyDisplay,
              displayLatestPrice,
              daysCover,
              dailyUsageDisplay: getInventoryDisplayQuantity(dailyUsageRaw, item),
              estimatedReorderCost,
              vendorName: item.default_vendor_name || "Unassigned",
            };
          }).filter((row) => row.dailyUsageDisplay > 0 || row.onHandDisplay <= getInventoryDisplayQuantity(Number(row.item.reorder_level || 0), row.item))
            .sort((a, b) => {
              const aDays = a.daysCover == null ? Number.POSITIVE_INFINITY : a.daysCover;
              const bDays = b.daysCover == null ? Number.POSITIVE_INFINITY : b.daysCover;
              return aDays - bDays;
            });

          const vendorBuckets = new Map<string, { vendorName: string; rows: typeof reorderRows; totalCost: number }>();
          reorderRows.forEach((row) => {
            const key = row.vendorName;
            const current = vendorBuckets.get(key) || { vendorName: key, rows: [], totalCost: 0 };
            current.rows.push(row);
            current.totalCost += row.estimatedReorderCost;
            vendorBuckets.set(key, current);
          });
          const vendorPlans = Array.from(vendorBuckets.values()).sort((a, b) => b.totalCost - a.totalCost);

          return (
            <div className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Purchase Orders / Reorder Planning</h2>
                    <p className="mt-1 text-xs text-rose-700/70">Use actual usage trends plus current stock to decide what to buy next and roughly how much cash each vendor order will require.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["day", "week", "month", "quarter", "year"] as const).map((period) => (
                      <button key={period} type="button" onClick={() => setProfitabilityPeriod(period)} className={`rounded-xl px-4 py-2 text-xs font-medium ${profitabilityPeriod === period ? "bg-rose-500 text-white shadow-sm" : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"}`}>
                        {period[0].toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Items To Review", String(reorderRows.length)],
                    ["Vendor Plans", String(vendorPlans.length)],
                    ["Estimated Reorder Spend", formatCurrency(vendorPlans.reduce((sum, plan) => sum + plan.totalCost, 0))],
                    ["Planning Horizon", "14 days"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">{label}</div>
                      <div className="mt-1 text-lg font-semibold">{value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xl font-semibold">Reorder Suggestions By Item</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-rose-700/70">
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2">Vendor</th>
                        <th className="px-3 py-2">On Hand</th>
                        <th className="px-3 py-2">Avg Daily Use</th>
                        <th className="px-3 py-2">Days of Cover</th>
                        <th className="px-3 py-2">Suggested Buy</th>
                        <th className="px-3 py-2">Latest Price</th>
                        <th className="px-3 py-2">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reorderRows.length === 0 ? (
                        <tr><td colSpan={8} className="px-3 py-4 text-rose-700/70">No reorder signals yet.</td></tr>
                      ) : reorderRows.map((row) => (
                        <tr key={row.item.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2 font-medium">{row.item.item_name}</td>
                          <td className="px-3 py-2">{row.vendorName}</td>
                          <td className="px-3 py-2">{row.onHandDisplay.toFixed(2)} {row.displayUnit}</td>
                          <td className="px-3 py-2">{row.dailyUsageDisplay.toFixed(2)} {row.displayUnit}</td>
                          <td className="px-3 py-2">{row.daysCover == null ? '-' : `${row.daysCover.toFixed(1)} days`}</td>
                          <td className="px-3 py-2 font-medium">{row.reorderQtyDisplay.toFixed(2)} {row.displayUnit}</td>
                          <td className="px-3 py-2">{formatSmallCurrency(row.displayLatestPrice)}</td>
                          <td className="px-3 py-2">{formatCurrency(row.estimatedReorderCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xl font-semibold">Vendor Purchase Order Drafts</h3>
                <div className="grid gap-4 xl:grid-cols-2">
                  {vendorPlans.length === 0 ? (
                    <p className="text-rose-700/70">No vendor draft plans yet.</p>
                  ) : vendorPlans.map((plan) => (
                    <div key={plan.vendorName} className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">{plan.vendorName}</div>
                          <div className="text-xs text-rose-700/70">{plan.rows.length} item(s)</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-rose-700/70">Estimated Spend</div>
                          <div className="font-semibold">{formatCurrency(plan.totalCost)}</div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2 text-sm">
                        {plan.rows.map((row) => (
                          <div key={row.item.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                            <div className="font-medium">{row.item.item_name}</div>
                            <div>{row.reorderQtyDisplay.toFixed(2)} {row.displayUnit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })()}

        {viewMode === "recipePricing" && canViewReports && (() => {
          const targetMarginPercent = Math.min(95, Math.max(5, Number(recipePricingTargetMarginInput || 70)));
          const targetMarginDecimal = targetMarginPercent / 100;
          const recipeRows = products
            .filter((product) => product.active !== false)
            .map((product) => {
              const recipeLines = allProductRecipes.filter((line) => Number(line.product_id) === Number(product.id));
              let latestCost = 0;
              let averageCost = 0;
              const ingredientDetails = recipeLines.map((line) => {
                const item = inventoryItems.find((inventoryItem) => Number(inventoryItem.id) === Number(line.inventory_item_id));
                const latestUnitCost = Number(inventoryCostSummaryByItem[Number(line.inventory_item_id)]?.latest_unit_cost || 0);
                const averageUnitCost = Number(inventoryCostSummaryByItem[Number(line.inventory_item_id)]?.average_unit_cost || 0);
                const wastageMultiplier = 1 + Number(line.wastage_percent || 0) / 100;
                const latestLineCost = Number(line.quantity_required || 0) * latestUnitCost * wastageMultiplier;
                const averageLineCost = Number(line.quantity_required || 0) * averageUnitCost * wastageMultiplier;
                latestCost += latestLineCost;
                averageCost += averageLineCost;
                return {
                  inventoryItemId: Number(line.inventory_item_id),
                  itemName: item?.item_name || `Item ${line.inventory_item_id}`,
                  quantityRequired: Number(line.quantity_required || 0),
                  unit: item ? getRecipeCostBasisUnit(item.unit) : '-',
                  wastagePercent: Number(line.wastage_percent || 0),
                  latestUnitCost,
                  averageUnitCost,
                  latestLineCost,
                  averageLineCost,
                  latestPurchaseDisplay: item ? getInventoryDisplayPrice(latestUnitCost, item) : latestUnitCost,
                  averagePurchaseDisplay: item ? getInventoryDisplayPrice(averageUnitCost, item) : averageUnitCost,
                  purchaseDisplayLabel: item ? getInventoryPriceLabel(item) : 'per unit',
                };
              });
              const price = Number(product.price || 0);
              const latestGrossProfit = price - latestCost;
              const averageGrossProfit = price - averageCost;
              const latestMargin = price > 0 ? latestGrossProfit / price : 0;
              const averageMargin = price > 0 ? averageGrossProfit / price : 0;
              const suggestedPriceTarget = targetMarginDecimal >= 0.99 ? price : (averageCost / (1 - targetMarginDecimal));
              const priceGap = suggestedPriceTarget - price;
              return {
                product,
                recipeLines,
                ingredientDetails,
                latestCost,
                averageCost,
                latestGrossProfit,
                averageGrossProfit,
                latestMargin,
                averageMargin,
                suggestedPriceTarget,
                priceGap,
              };
            })
            .sort((a, b) => a.averageMargin - b.averageMargin);

          const selectedRecipePricingRow =
            recipeRows.find((row) => String(row.product.id) === selectedRecipePricingProductId) ||
            recipeRows[0] ||
            null;

          const marginRiskCount = recipeRows.filter((row) => row.averageMargin < targetMarginDecimal).length;
          const avgMenuMargin = recipeRows.length > 0
            ? recipeRows.reduce((sum, row) => sum + row.averageMargin, 0) / recipeRows.length
            : 0;
          const topProfitLeak = recipeRows[0] || null;

          return (
            <div className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">Recipe Costing & Pricing Advisor</h2>
                    <p className="mt-1 text-xs text-rose-700/70">
                      Review recipe cost, current gross margin, and suggested sell price using recent purchase cost so you can protect menu profitability.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-rose-700">Target Gross Margin %</label>
                    <input
                      value={recipePricingTargetMarginInput}
                      onChange={(e) => setRecipePricingTargetMarginInput(e.target.value)}
                      className="w-28 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Products Reviewed</div>
                  <div className="mt-2 text-3xl font-semibold">{recipeRows.length}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Active menu items with or without recipes</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Below Target Margin</div>
                  <div className="mt-2 text-3xl font-semibold text-rose-700">{marginRiskCount}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Items below {targetMarginPercent.toFixed(0)}% average gross margin</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Average Menu Margin</div>
                  <div className="mt-2 text-3xl font-semibold">{(avgMenuMargin * 100).toFixed(1)}%</div>
                  <div className="mt-1 text-xs text-rose-700/70">Based on average recent ingredient costs</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Biggest Profit Leak</div>
                  <div className="mt-2 text-lg font-semibold">{topProfitLeak?.product.name || '-'}</div>
                  <div className="mt-1 text-xs text-rose-700/70">
                    {topProfitLeak ? `${(topProfitLeak.averageMargin * 100).toFixed(1)}% avg margin` : 'No recipe data yet'}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Pricing Review Table</h3>
                    <p className="mt-1 text-xs text-rose-700/70">Click any row to inspect its ingredient-level costing and pricing recommendation.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-rose-700/70">
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2">Sell Price</th>
                        <th className="px-3 py-2">Latest Cost</th>
                        <th className="px-3 py-2">Average Cost</th>
                        <th className="px-3 py-2">Latest GP</th>
                        <th className="px-3 py-2">Avg GP</th>
                        <th className="px-3 py-2">Avg Margin</th>
                        <th className="px-3 py-2">Suggested Price</th>
                        <th className="px-3 py-2">Price Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeRows.length === 0 ? (
                        <tr><td colSpan={9} className="px-3 py-4 text-rose-700/70">No products available yet.</td></tr>
                      ) : recipeRows.map((row) => {
                        const selected = selectedRecipePricingRow && row.product.id === selectedRecipePricingRow.product.id;
                        return (
                          <tr
                            key={row.product.id}
                            onClick={() => setSelectedRecipePricingProductId(String(row.product.id))}
                            className={`cursor-pointer border-b last:border-b-0 ${selected ? 'bg-rose-50' : 'hover:bg-rose-50/60'}`}
                          >
                            <td className="px-3 py-3">
                              <div className="font-medium">{row.product.name}</div>
                              <div className="mt-1 text-[11px] text-rose-700/70">{row.recipeLines.length} recipe line{row.recipeLines.length === 1 ? '' : 's'}</div>
                            </td>
                            <td className="px-3 py-3 font-medium">{formatCurrency(Number(row.product.price || 0))}</td>
                            <td className="px-3 py-3">{formatSmallCurrency(row.latestCost)}</td>
                            <td className="px-3 py-3">{formatSmallCurrency(row.averageCost)}</td>
                            <td className={`px-3 py-3 font-medium ${row.latestGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatSmallCurrency(row.latestGrossProfit)}</td>
                            <td className={`px-3 py-3 font-medium ${row.averageGrossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatSmallCurrency(row.averageGrossProfit)}</td>
                            <td className={`px-3 py-3 font-medium ${row.averageMargin >= targetMarginDecimal ? 'text-emerald-700' : row.averageMargin >= targetMarginDecimal * 0.8 ? 'text-amber-700' : 'text-rose-700'}`}>{(row.averageMargin * 100).toFixed(1)}%</td>
                            <td className="px-3 py-3 font-medium">{formatCurrency(row.suggestedPriceTarget)}</td>
                            <td className={`px-3 py-3 font-medium ${row.priceGap > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatSmallCurrency(row.priceGap)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {selectedRecipePricingRow ? (
                <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
                  <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">{selectedRecipePricingRow.product.name}</h3>
                        <p className="mt-1 text-xs text-rose-700/70">Detailed advisor view based on recipe lines and recent purchase cost.</p>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedRecipePricingRow.averageMargin >= targetMarginDecimal ? 'bg-emerald-100 text-emerald-700' : selectedRecipePricingRow.averageMargin >= targetMarginDecimal * 0.8 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {(selectedRecipePricingRow.averageMargin * 100).toFixed(1)}% avg margin
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {[
                        ['Sell Price', formatCurrency(Number(selectedRecipePricingRow.product.price || 0))],
                        ['Latest Recipe Cost', formatSmallCurrency(selectedRecipePricingRow.latestCost)],
                        ['Average Recipe Cost', formatSmallCurrency(selectedRecipePricingRow.averageCost)],
                        ['Latest Gross Profit', formatSmallCurrency(selectedRecipePricingRow.latestGrossProfit)],
                        ['Average Gross Profit', formatSmallCurrency(selectedRecipePricingRow.averageGrossProfit)],
                        ['Suggested Price', formatCurrency(selectedRecipePricingRow.suggestedPriceTarget)],
                        ['Target Margin', `${targetMarginPercent.toFixed(0)}%`],
                        ['Price Gap', formatSmallCurrency(selectedRecipePricingRow.priceGap)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">{label}</div>
                          <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-rose-100 bg-white p-4">
                      <h4 className="text-sm font-semibold">Advisor Notes</h4>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p>
                          {selectedRecipePricingRow.priceGap > 0
                            ? `This item is currently under target by ${formatSmallCurrency(selectedRecipePricingRow.priceGap)}. Consider a price increase, smaller portion, or recipe redesign.`
                            : `This item is meeting or exceeding the current target margin. You can keep price steady unless ingredient inflation changes.`}
                        </p>
                        <p>
                          {selectedRecipePricingRow.recipeLines.length === 0
                            ? 'No recipe lines are configured, so costing is incomplete until a recipe is added.'
                            : `There are ${selectedRecipePricingRow.recipeLines.length} recipe line(s) driving the cost of this product.`}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                    <h3 className="text-xl font-semibold">Ingredient Cost Breakdown</h3>
                    <p className="mt-1 text-xs text-rose-700/70">Latest and average purchase cost by ingredient, including wastage.</p>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-rose-700/70">
                            <th className="px-3 py-2">Ingredient</th>
                            <th className="px-3 py-2">Recipe Qty</th>
                            <th className="px-3 py-2">Wastage</th>
                            <th className="px-3 py-2">Latest Buy Price</th>
                            <th className="px-3 py-2">Average Buy Price</th>
                            <th className="px-3 py-2">Latest Line Cost</th>
                            <th className="px-3 py-2">Average Line Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecipePricingRow.ingredientDetails.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-5 text-center text-rose-700/70">No recipe lines configured for this product yet.</td>
                            </tr>
                          ) : selectedRecipePricingRow.ingredientDetails.map((detail, index) => (
                            <tr key={`${detail.inventoryItemId}-${index}`} className="border-b last:border-b-0">
                              <td className="px-3 py-3 font-medium">{detail.itemName}</td>
                              <td className="px-3 py-3">{detail.quantityRequired.toFixed(2)} {detail.unit}</td>
                              <td className="px-3 py-3">{detail.wastagePercent.toFixed(1)}%</td>
                              <td className="px-3 py-3">{formatSmallCurrency(detail.latestPurchaseDisplay)} <span className="text-[11px] text-rose-700/70">{detail.purchaseDisplayLabel}</span></td>
                              <td className="px-3 py-3">{formatSmallCurrency(detail.averagePurchaseDisplay)} <span className="text-[11px] text-rose-700/70">{detail.purchaseDisplayLabel}</span></td>
                              <td className="px-3 py-3">{formatSmallCurrency(detail.latestLineCost)}</td>
                              <td className="px-3 py-3">{formatSmallCurrency(detail.averageLineCost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </section>
              ) : null}
            </div>
          );
        })()}

        {viewMode === "customers" && canViewCustomers && (() => {
          const selectedSummary = selectedCustomerSummary;
          const favoriteItems = getCustomerFavoriteItems(selectedCustomerOrders);
          const lastVisitDays = selectedSummary?.last_visit
            ? Math.floor((Date.now() - new Date(selectedSummary.last_visit).getTime()) / 86400000)
            : null;

          return (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-rose-700/70">Customers</div>
                <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.totalCustomers}</div>
                <div className="mt-1 text-xs text-rose-700/70">All saved loyalty profiles</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-rose-700/70">Active Last 30 Days</div>
                <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.activeLast30}</div>
                <div className="mt-1 text-xs text-rose-700/70">Recent repeat engagement</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-rose-700/70">VIP Customers</div>
                <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.vipCount}</div>
                <div className="mt-1 text-xs text-rose-700/70">High spend or frequent visitors</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-rose-700/70">At-Risk Returnees</div>
                <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.atRisk.length}</div>
                <div className="mt-1 text-xs text-rose-700/70">Returning customers inactive for 21+ days</div>
              </div>
            </section>

            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">Customer Contacts Export</h2>
                  <p className="mt-1 text-sm text-rose-700/70">Export customer contacts for Google Contacts import and phone sync.</p>
                </div>
                <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Google Contacts Sync Ready</div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl bg-rose-50 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Export Tools</div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => exportCustomerContactsCsv(customerList, "all")}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Export All CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCustomerContactsCsv(filteredCustomers, "filtered")}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Export Filtered CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCustomerContactsVcf(customerList, "all")}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Export All VCF
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCustomerContactsVcf(filteredCustomers, "filtered")}
                      className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Export Filtered VCF
                    </button>
                  </div>
                  <div className="mt-3 text-xs text-rose-700/80">
                    Use CSV for bulk import into Google Contacts. Use VCF for direct phone or contact app import.
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-100 p-4">
                  <div className="mb-3 text-sm font-semibold text-slate-900">Google Contacts Sync</div>
                  <div className="space-y-2 text-sm text-rose-700/80">
                    <div className="rounded-xl bg-rose-50 p-3">1. Export all or filtered customer contacts as CSV or VCF.</div>
                    <div className="rounded-xl bg-rose-50 p-3">2. Import the file into the Google account that is already synced to your phone.</div>
                    <div className="rounded-xl bg-rose-50 p-3">3. Your phone will pull the new contacts automatically through Google sync.</div>
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-800">Automatic direct Google Contacts write-back is not enabled in this build. This export flow is the safe sync-ready version.</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-semibold">Top by Spend</h2>
                <div className="space-y-2">
                  {customerHealthInsights.topBySpend.length === 0 ? (
                    <p className="text-sm text-rose-700/70">No customer sales yet.</p>
                  ) : customerHealthInsights.topBySpend.map((item) => (
                    <button key={`spend-${item.customer.id}`} onClick={() => loadCustomerDetailById(item.customer.id)} className="flex w-full items-center justify-between rounded-xl border border-rose-100 px-3 py-2 text-left hover:bg-rose-50">
                      <div>
                        <div className="font-medium">{item.customer.name || 'No Name'}</div>
                        <div className="text-xs text-rose-700/70">{item.customer.phone}</div>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(item.total_spend)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-semibold">Top by Visits</h2>
                <div className="space-y-2">
                  {customerHealthInsights.topByVisits.length === 0 ? (
                    <p className="text-sm text-rose-700/70">No visits tracked yet.</p>
                  ) : customerHealthInsights.topByVisits.map((item) => (
                    <button key={`visit-${item.customer.id}`} onClick={() => loadCustomerDetailById(item.customer.id)} className="flex w-full items-center justify-between rounded-xl border border-rose-100 px-3 py-2 text-left hover:bg-rose-50">
                      <div>
                        <div className="font-medium">{item.customer.name || 'No Name'}</div>
                        <div className="text-xs text-rose-700/70">{item.customer.phone}</div>
                      </div>
                      <div className="text-sm font-semibold">{item.total_visits} visits</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-xl font-semibold">At-Risk Customers</h2>
                <div className="space-y-2">
                  {customerHealthInsights.atRisk.length === 0 ? (
                    <p className="text-sm text-rose-700/70">No at-risk customers right now.</p>
                  ) : customerHealthInsights.atRisk.map((item) => (
                    <button key={`risk-${item.customer.id}`} onClick={() => loadCustomerDetailById(item.customer.id)} className="flex w-full items-center justify-between rounded-xl border border-amber-200 px-3 py-2 text-left hover:bg-amber-50">
                      <div>
                        <div className="font-medium">{item.customer.name || 'No Name'}</div>
                        <div className="text-xs text-rose-700/70">{item.customer.phone}</div>
                      </div>
                      <div className="text-right text-xs text-amber-700">
                        <div>{item.daysSinceLastVisit ?? '-'} days</div>
                        <div className="font-medium">since last visit</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold">CRM Customer List</h2>
                  <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">Click any customer to view profile</div>
                </div>
                <input
                  value={customersSearch}
                  onChange={(e) => setCustomersSearch(e.target.value)}
                  className="mb-4 w-full rounded-xl border px-3 py-2"
                  placeholder="Search by name or phone"
                />

                <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                  {filteredCustomers.length === 0 ? (
                    <p className="text-rose-700/70">No customers found.</p>
                  ) : (
                    filteredCustomers.map((item) => (
                      <button
                        key={item.customer.id}
                        onClick={() => loadCustomerDetailById(item.customer.id)}
                        className={`block w-full rounded-2xl border p-4 text-left ${selectedCustomerId === item.customer.id ? 'border-rose-400 bg-rose-50' : 'border-rose-100 bg-white hover:bg-rose-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{item.customer.name || 'No Name'}</div>
                            <div className="text-sm text-rose-700/70">{item.customer.phone}</div>
                          </div>
                          <div className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                            {getCustomerTag(item)}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700">Visits <span className="ml-1 font-semibold text-slate-900">{item.total_visits}</span></div>
                          <div className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700">Spend <span className="ml-1 font-semibold text-slate-900">{formatCurrency(item.total_spend)}</span></div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Customer CRM Profile</h2>
                {selectedCustomerId && currentCustomer ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-rose-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">{currentCustomer.name || 'No Name'}</div>
                          <div className="text-sm text-rose-700/70">{currentCustomer.phone}</div>
                          <div className="mt-2 text-xs uppercase tracking-wide text-rose-700/70">Segment</div>
                          <div className="mt-1 inline-flex rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700">{getCustomerTag(selectedSummary)}</div>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-xl bg-white p-3 text-sm"><div className="text-rose-700/70">Points</div><div className="mt-1 text-xl font-semibold">{Number(currentCustomer.reward_points || 0).toFixed(0)}</div></div>
                          <div className="rounded-xl bg-white p-3 text-sm"><div className="text-rose-700/70">Reward Rate</div><div className="mt-1 text-xl font-semibold">{currentRewardRate}%</div></div>
                          <div className="rounded-xl bg-white p-3 text-sm"><div className="text-rose-700/70">Visits</div><div className="mt-1 text-xl font-semibold">{selectedSummary?.total_visits || 0}</div></div>
                          <div className="rounded-xl bg-white p-3 text-sm"><div className="text-rose-700/70">Avg Ticket</div><div className="mt-1 text-xl font-semibold">{formatCurrency(selectedSummary && selectedSummary.total_visits > 0 ? selectedSummary.total_spend / selectedSummary.total_visits : 0)}</div></div>
                        </div>
                      </div>
                    </div>

                    {canEditCustomerBonus ? (
                      <div>
                        <label className="mb-1 block text-xs font-medium">Manual Bonus %</label>
                        <div className="flex gap-2">
                          <input
                            value={selectedCustomerBonusInput}
                            onChange={(e) => setSelectedCustomerBonusInput(e.target.value)}
                            className="w-full rounded-lg border px-2.5 py-1.5 text-sm"
                          />
                          <button
                            onClick={() => saveCustomerBonus(selectedCustomerId, selectedCustomerBonusInput)}
                            className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border p-3 text-sm"><div className="text-rose-700/70">Lifetime Spend</div><div className="mt-1 text-xl font-semibold">{formatCurrency(selectedSummary?.total_spend || 0)}</div></div>
                      <div className="rounded-xl border p-3 text-sm"><div className="text-rose-700/70">Points Earned</div><div className="mt-1 text-xl font-semibold">{Number(selectedSummary?.total_points_earned || 0).toFixed(0)}</div></div>
                      <div className="rounded-xl border p-3 text-sm"><div className="text-rose-700/70">Points Redeemed</div><div className="mt-1 text-xl font-semibold">{Number(selectedSummary?.total_points_redeemed || 0).toFixed(0)}</div></div>
                      <div className="rounded-xl border p-3 text-sm"><div className="text-rose-700/70">Last Visit</div><div className="mt-1 text-base font-semibold">{selectedSummary?.last_visit ? formatTime(selectedSummary.last_visit) : '-'}</div><div className="mt-1 text-xs text-rose-700/70">{lastVisitDays == null ? 'No prior visit' : `${lastVisitDays} days ago`}</div></div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-rose-100 p-4">
                        <h3 className="mb-3 text-lg font-semibold">Favorite Items</h3>
                        <div className="space-y-2">
                          {favoriteItems.length === 0 ? (
                            <p className="text-sm text-rose-700/70">No order history yet.</p>
                          ) : favoriteItems.map((item) => (
                            <div key={item.name} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm">
                              <span>{item.name}</span>
                              <span className="font-semibold">{item.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-rose-100 p-4">
                        <h3 className="mb-3 text-lg font-semibold">Retention Notes</h3>
                        <div className="space-y-2 text-sm text-rose-700/80">
                          <div className="rounded-xl bg-rose-50 p-3">{lastVisitDays == null ? 'This is a new customer. Focus on first return visit.' : lastVisitDays <= 7 ? 'Recent customer. Good time for upsell or loyalty reminder.' : lastVisitDays <= 21 ? 'Warm customer. A WhatsApp nudge can bring them back.' : 'At-risk customer. Consider a comeback offer or personal follow-up.'}</div>
                          <div className="rounded-xl bg-rose-50 p-3">{(selectedSummary?.total_visits || 0) >= 6 ? 'Strong repeat behavior. Offer member-only perks or early menu access.' : 'Still building habit. Encourage repeat visits with points and bundles.'}</div>
                          <div className="rounded-xl bg-rose-50 p-3">{favoriteItems[0] ? `Most loved item: ${favoriteItems[0].name}. Use it in targeted promotions.` : 'Add more order history to unlock preference-based promotions.'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 font-medium">Orders</div>
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {selectedCustomerOrders.length === 0 ? (
                          <p className="text-rose-700/70">No orders found.</p>
                        ) : (
                          selectedCustomerOrders.map((order) => renderOrderCard(order, false))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-medium">Points Ledger</div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {selectedCustomerLedger.length === 0 ? (
                          <p className="text-rose-700/70">No ledger entries.</p>
                        ) : (
                          selectedCustomerLedger.map((entry) => (
                            <div key={entry.id} className="rounded-xl border p-3 text-sm">
                              <div className="font-medium">{entry.entry_type} - {Number(entry.points).toFixed(0)}</div>
                              <div className="text-rose-700/70">{entry.note || '-'}</div>
                              <div className="text-rose-700/70">{formatTime(entry.created_at)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-rose-700/70">Choose a customer from the list.</p>
                )}
              </section>
            </section>
          </div>
        );
        })()}

        {viewMode === "campaigns" && canViewCustomers && (() => {
          const selectedCount = selectedCampaignCustomerIds.length;
          const selectedRecipients = campaignEligibleCustomers.filter((item) => selectedCampaignCustomerIds.includes(item.customer.id));
          return (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Eligible Customers</div>
                  <div className="mt-2 text-3xl font-semibold">{campaignEligibleCustomers.length}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Saved customers with phone numbers</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">Selected</div>
                  <div className="mt-2 text-3xl font-semibold">{selectedCount}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Recipients in this send batch</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">VIP Reach</div>
                  <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.vipCount}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Good for offers and previews</div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-rose-700/70">At-Risk Reach</div>
                  <div className="mt-2 text-3xl font-semibold">{customerHealthInsights.atRisk.length}</div>
                  <div className="mt-1 text-xs text-rose-700/70">Best list for comeback campaigns</div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold">Campaign Builder</h2>
                    <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">WhatsApp Web helper</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rose-700/80">Segment</label>
                      <select
                        value={campaignSegment}
                        onChange={(e) => setCampaignSegment(e.target.value as any)}
                        className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm"
                      >
                        <option value="all">All Customers</option>
                        <option value="vip">VIP Customers</option>
                        <option value="active">Active Last 30 Days</option>
                        <option value="atRisk">At-Risk Customers</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rose-700/80">Search</label>
                      <input
                        value={campaignSearch}
                        onChange={(e) => setCampaignSearch(e.target.value)}
                        placeholder="Filter by name or phone"
                        className="w-full rounded-xl border border-rose-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rose-700/80">Campaign Message</label>
                    <textarea
                      value={campaignMessage}
                      onChange={(e) => setCampaignMessage(e.target.value)}
                      className="min-h-[180px] w-full rounded-2xl border border-rose-200 px-4 py-3 text-sm"
                      placeholder="Type your WhatsApp campaign message"
                    />
                    <div className="mt-2 text-xs text-rose-700/70">This opens WhatsApp Web with your message prefilled. Bulk send is assisted through tabs, not silent automatic sending.</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={selectAllCampaignCustomers} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Select All Visible</button>
                    <button onClick={clearCampaignSelection} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Clear Selection</button>
                    <button onClick={() => navigator.clipboard?.writeText(campaignMessage)} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">Copy Message</button>
                    <button onClick={openSelectedCampaignCustomers} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600">Open Selected in WhatsApp</button>
                  </div>
                </section>

                <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold">Recipient List</h2>
                    <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{campaignEligibleCustomers.length} visible</div>
                  </div>
                  <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                    {campaignEligibleCustomers.length === 0 ? (
                      <p className="text-sm text-rose-700/70">No customers match this campaign filter.</p>
                    ) : campaignEligibleCustomers.map((item) => {
                      const checked = selectedCampaignCustomerIds.includes(item.customer.id);
                      const daysSinceLastVisit = item.last_visit ? Math.floor((Date.now() - new Date(item.last_visit).getTime()) / 86400000) : null;
                      return (
                        <div key={`campaign-${item.customer.id}`} className={`rounded-2xl border p-4 ${checked ? 'border-rose-400 bg-rose-50' : 'border-rose-100 bg-white'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCampaignCustomer(item.customer.id)}
                                className="mt-1 h-4 w-4 rounded border-rose-300"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold">{item.customer.name || 'No Name'}</div>
                                <div className="text-sm text-rose-700/70">{item.customer.phone}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">{getCustomerTag(item)}</span>
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">Visits {item.total_visits}</span>
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">Spend {formatCurrency(item.total_spend)}</span>
                                  <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-700">{daysSinceLastVisit == null ? 'New' : `${daysSinceLastVisit}d ago`}</span>
                                </div>
                              </div>
                            </label>
                            <button
                              onClick={() => openCampaignWhatsApp(item)}
                              className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Selected Campaign Recipients</h2>
                {selectedRecipients.length === 0 ? (
                  <p className="text-sm text-rose-700/70">No customers selected yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedRecipients.map((item) => (
                      <div key={`selected-${item.customer.id}`} className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                        <div className="font-semibold">{item.customer.name || 'No Name'}</div>
                        <div className="text-sm text-rose-700/70">{item.customer.phone}</div>
                        <div className="mt-2 text-xs text-rose-700/80">{getCustomerTag(item)} · {item.total_visits} visits · {formatCurrency(item.total_spend)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          );
        })()}

        {viewMode === "inventory" && canViewInventory && (
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
              
            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-2 text-2xl font-semibold">Stock Intake</h2>
              <p className="mb-4 text-xs text-rose-700/70">
                Search items by any part of the name. Vendor is optional. If no result appears, create the item inline in the same row.
              </p>

              <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Delivery Date</label>
                  <input
                    type="date"
                    value={stockIntakeForm.delivery_date}
                    onChange={(e) => setStockIntakeForm((p) => ({ ...p, delivery_date: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Invoice / Reference</label>
                  <input
                    value={stockIntakeForm.invoice_number}
                    onChange={(e) => setStockIntakeForm((p) => ({ ...p, invoice_number: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                    placeholder="Invoice number"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Amount Paid Today</label>
                  <input
                    value={stockIntakeForm.amount_paid_today}
                    onChange={(e) => setStockIntakeForm((p) => ({ ...p, amount_paid_today: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                    placeholder="0"
                    inputMode="decimal"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {stockIntakeRows.map((row, index) => {
                  const itemMatches = getFilteredInventoryOptions(row.item_search);
                  const vendorMatches = getFilteredVendorOptions(row.vendor_search);
                  const totalCost = getTotalCostValue(row);
                  const pricePerLarge = getPricePerBaseLargeUnit(row);
                  const pricePerSmall = getPricePerSmallUnit(row);
                  const noItemMatch = String(row.item_search || "").trim() && itemMatches.length === 0 && !row.inventory_item_id;
                  const noVendorMatch = String(row.vendor_search || "").trim() && vendorMatches.length === 0 && !row.vendor_id;

                  return (
                    <div key={row.row_id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Intake Row {index + 1}</div>
                        {stockIntakeRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeStockIntakeRow(row.row_id)}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            Remove Row
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Item Name</label>
                          <input
                            value={row.item_search}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { item_search: e.target.value, inventory_item_id: "", new_item_name: "" })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="Type item name"
                          />
                          <div className="mt-2 space-y-1">
                            {itemMatches.map((item) => (
                              <div key={item.id} className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateStockIntakeRow(row.row_id, { inventory_item_id: String(item.id), item_search: item.item_name, new_item_name: "" })}
                                  className="block w-full rounded-lg border border-rose-200 bg-white px-2 py-1 text-left text-xs text-rose-700 hover:bg-rose-50"
                                >
                                  {item.item_name}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteInventoryItemInline(String(item.id))}
                                  className="rounded-lg border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
                                  title="Delete item"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                            {noItemMatch ? (
                              <button
                                type="button"
                                onClick={() => updateStockIntakeRow(row.row_id, { item_search: row.item_search, new_item_name: row.item_search, inventory_item_id: "" })}
                                className="block w-full rounded-lg border border-emerald-200 bg-white px-2 py-1 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                              >
                                Add new item: {row.item_search}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Vendor</label>
                          <input
                            value={row.vendor_search}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { vendor_search: e.target.value, vendor_id: "", new_vendor_name: "" })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="Type vendor"
                          />
                          <div className="mt-2 space-y-1">
                            {vendorMatches.map((vendor) => (
                              <button
                                key={vendor.id}
                                type="button"
                                onClick={() => updateStockIntakeRow(row.row_id, { vendor_id: String(vendor.id), vendor_search: vendor.vendor_name, new_vendor_name: "" })}
                                className="block w-full rounded-lg border border-rose-200 bg-white px-2 py-1 text-left text-xs text-rose-700 hover:bg-rose-50"
                              >
                                {vendor.vendor_name}
                              </button>
                            ))}
                            {noVendorMatch ? (
                              <button
                                type="button"
                                onClick={() => updateStockIntakeRow(row.row_id, { vendor_search: row.vendor_search, new_vendor_name: row.vendor_search, vendor_id: "" })}
                                className="block w-full rounded-lg border border-emerald-200 bg-white px-2 py-1 text-left text-xs text-emerald-700 hover:bg-emerald-50"
                              >
                                Add new vendor: {row.vendor_search}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Price</label>
                          <input
                            value={row.price}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { price: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="4000"
                            inputMode="decimal"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Packing Qty</label>
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                              value={row.packing_qty_number}
                              onChange={(e) => updateStockIntakeRow(row.row_id, { packing_qty_number: e.target.value })}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                              placeholder="12"
                              inputMode="decimal"
                            />
                            <select
                              value={row.packing_qty_unit}
                              onChange={(e) => updateStockIntakeRow(row.row_id, { packing_qty_unit: e.target.value })}
                              className="rounded-xl border px-3 py-2 text-xs"
                            >
                              <option value="eaches">eaches</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="lb">lb</option>
                              <option value="oz">oz</option>
                              <option value="pack">pack</option>
                              <option value="case">case</option>
                              <option value="bottle">bottle</option>
                              <option value="can">can</option>
                              <option value="tub">tub</option>
                              <option value="carton">carton</option>
                              <option value="bag">bag</option>
                              <option value="box">box</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Number of Packs</label>
                          <input
                            value={row.number_of_packs}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { number_of_packs: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="5"
                            inputMode="decimal"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Weight / Liquid in One</label>
                          <div className="grid grid-cols-[1fr_auto] gap-2">
                            <input
                              value={row.one_unit_size_number}
                              onChange={(e) => updateStockIntakeRow(row.row_id, { one_unit_size_number: e.target.value })}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                              placeholder="300"
                              inputMode="decimal"
                            />
                            <select
                              value={row.one_unit_size_unit}
                              onChange={(e) => updateStockIntakeRow(row.row_id, { one_unit_size_unit: e.target.value })}
                              className="rounded-xl border px-3 py-2 text-xs"
                            >
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="lb">lb</option>
                              <option value="eaches">eaches</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Total Cost</label>
                          <div className="rounded-xl border bg-white px-3 py-2 text-xs font-medium">{formatCurrency(totalCost)}</div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">{getLargeUnitLabel(row)}</label>
                          <div className="rounded-xl border bg-white px-3 py-2 text-xs font-medium">{formatConvertedCurrency(pricePerLarge)}</div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">{getSmallUnitLabel(row)}</label>
                          <div className="rounded-xl border bg-white px-3 py-2 text-xs font-medium">{formatConvertedCurrency(pricePerSmall)}</div>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Category</label>
                          <select
                            value={row.inventory_category_id}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { inventory_category_id: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                          >
                            <option value="">Select category</option>
                            {inventoryItemCategories.map((category) => (
                              <option key={category.id} value={String(category.id)}>{category.category_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Item Type</label>
                          <select
                            value={row.item_type}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { item_type: e.target.value as "ingredient" | "finished_product" })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                          >
                            <option value="ingredient">ingredient</option>
                            <option value="finished_product">finished</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Supply Model</label>
                          <select
                            value={row.supply_model}
                            onChange={(e) => updateStockIntakeRow(row.row_id, { supply_model: e.target.value as "buy_out" | "credit_purchase" | "percentage_of_sales" | "consignment" })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                          >
                            <option value="buy_out">buy out</option>
                            <option value="credit_purchase">credit purchase</option>
                            <option value="percentage_of_sales">percentage of sales</option>
                            <option value="consignment">consignment</option>
                          </select>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addStockIntakeRow}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Add Row
                </button>
                <button
                  type="button"
                  onClick={saveStockIntake}
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm"
                >
                  Save Intake
                </button>
                <button
                  type="button"
                  onClick={clearStockIntakeForm}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Clear
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold">Inventory Purchase History</h2>
                  <p className="text-xs text-rose-700/70">
                    Click any inventory item in the live stock table to view all past purchases, quantities, prices, and vendor details.
                  </p>
                </div>
              </div>

              {!selectedInventoryHistoryItem ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Select an item from the Live Inventory Stock table above.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-rose-50 p-4">
                    <div className="text-lg font-semibold text-slate-900">{selectedInventoryHistoryItem.item_name}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Display unit: {getInventoryDisplayUnit(selectedInventoryHistoryItem)} - Current stock: {getInventoryStockSummaryText(selectedInventoryHistoryItem)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-rose-100 text-slate-700">
                          <th className="px-3 py-2 font-semibold">Purchase Date</th>
                          <th className="px-3 py-2 font-semibold">Vendor</th>
                          <th className="px-3 py-2 font-semibold">Invoice</th>
                          <th className="px-3 py-2 font-semibold">Shipment</th>
                          <th className="px-3 py-2 font-semibold">Quantity</th>
                          <th className="px-3 py-2 font-semibold">Unit Cost</th>
                          <th className="px-3 py-2 font-semibold">Display Price</th>
                          <th className="px-3 py-2 font-semibold">Line Total</th>
                          <th className="px-3 py-2 font-semibold">Supply Model</th>
                          <th className="px-3 py-2 font-semibold">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInventoryPurchaseHistory.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-3 py-6 text-center text-sm text-rose-700/70">
                              No purchase history found for this item yet.
                            </td>
                          </tr>
                        ) : (
                          selectedInventoryPurchaseHistory.map((row) => (
                            <tr key={row.shipment_line_id} className="border-b border-rose-50 bg-white">
                              <td className="px-3 py-2">{row.shipment_date ? formatDateTime(row.shipment_date) : "-"}</td>
                              <td className="px-3 py-2">{row.vendor_name || "-"}</td>
                              <td className="px-3 py-2">{row.invoice_number || "-"}</td>
                              <td className="px-3 py-2">{row.shipment_number || "-"}</td>
                              <td className="px-3 py-2">{Number(row.quantity || 0).toFixed(2)}</td>
                              <td className="px-3 py-2">{formatSmallCurrency(Number(row.unit_cost || 0))}</td>
                              <td className="px-3 py-2">{formatSmallCurrency(getInventoryDisplayPrice(Number(row.unit_cost || 0), selectedInventoryHistoryItem))} <span className="text-[10px] text-slate-500">{getInventoryPriceLabel(selectedInventoryHistoryItem)}</span></td>
                              <td className="px-3 py-2">{formatCurrency(Number(row.line_total || 0))}</td>
                              <td className="px-3 py-2">{row.supply_model || "-"}</td>
                              <td className="px-3 py-2">{row.expiry_date ? formatDateTime(row.expiry_date) : "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

<section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold">Live Inventory Stock</h2>
                  <p className="text-xs text-rose-700/70">
                    Stock updates in real time from purchases and completed sales. Low stock rows are highlighted automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshAll}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Refresh Stock
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rose-100 text-slate-700">
                      <th className="px-3 py-2 font-semibold">Item</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Display Unit</th>
                      <th className="px-3 py-2 font-semibold">Stock on Hand</th>
                      <th className="px-3 py-2 font-semibold">Low Stock Level</th>
                      <th className="px-3 py-2 font-semibold">Latest Purchase Price</th>
                      <th className="px-3 py-2 font-semibold">Previous Purchase Price</th>
                      <th className="px-3 py-2 font-semibold">Average Purchase Price</th>
                      <th className="px-3 py-2 font-semibold">Last Purchase</th>
                      <th className="px-3 py-2 font-semibold">Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-sm text-rose-700/70">
                          No inventory items yet.
                        </td>
                      </tr>
                    ) : (
                      inventoryItems.map((item) => {
                        const summary = inventoryCostSummaryByItem[item.id] || {
                          latest_unit_cost: 0,
                          previous_unit_cost: 0,
                          average_unit_cost: 0,
                          last_purchase_date: null,
                          total_purchased_qty: 0,
                        };
                        const displayUnit = getInventoryDisplayUnit(item);
                        const displayQty = getInventoryDisplayQuantity(Number(item.current_stock || 0), item);
                        const displayThreshold = getInventoryDisplayQuantity(Number(item.low_stock_threshold || 0), item);
                        const displayLatestPrice = getInventoryDisplayPrice(Number(summary.latest_unit_cost || 0), item);
                        const displayPreviousPrice = getInventoryDisplayPrice(Number(summary.previous_unit_cost || 0), item);
                        const displayAveragePrice = getInventoryDisplayPrice(Number(summary.average_unit_cost || 0), item);
                        const isLow = Number(item.current_stock || 0) <= Number(item.low_stock_threshold || 0);
                        const isNearLow = !isLow && Number(item.current_stock || 0) <= Number(item.reorder_level || 0);

                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedInventoryHistoryItemId(item.id)}
                            className={`cursor-pointer border-b border-rose-50 transition hover:bg-rose-50 ${
                              selectedInventoryHistoryItemId === item.id
                                ? "bg-rose-50"
                                : isLow
                                ? "bg-red-50"
                                : isNearLow
                                ? "bg-amber-50"
                                : "bg-white"
                            }`}
                          >
                            <td className="px-3 py-2 font-medium text-slate-900">{item.item_name}</td>
                            <td className="px-3 py-2">{item.category_name || "-"}</td>
                            <td className="px-3 py-2">{displayUnit}</td>
                            <td className="px-3 py-2 font-semibold">
                              <div>{getInventoryStockSummaryText(item)}</div>
                              <div className="mt-1 text-[10px] font-normal text-slate-500">
                                Raw stored: {Number(item.current_stock || 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                  isLow
                                    ? "bg-red-100 text-red-700"
                                    : isNearLow
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {isLow ? "Low" : isNearLow ? "Watch" : "OK"}
                              </span>
                              <div className="mt-1 text-[10px] text-slate-500">
                                Threshold {displayUnit === "kg" || displayUnit === "l" ? displayThreshold.toFixed(2) : displayThreshold.toFixed(0)} {displayUnit}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div>{formatSmallCurrency(displayLatestPrice)}</div>
                              <div className="mt-1 text-[10px] text-slate-500">{getInventoryPriceLabel(item)}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div>{summary.previous_unit_cost ? formatSmallCurrency(displayPreviousPrice) : "-"}</div>
                              <div className="mt-1 text-[10px] text-slate-500">{summary.previous_unit_cost ? getInventoryPriceLabel(item) : "No earlier purchase"}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div>{formatSmallCurrency(displayAveragePrice)}</div>
                              <div className="mt-1 text-[10px] text-slate-500">{getInventoryPriceLabel(item)}</div>
                            </td>
                            <td className="px-3 py-2">{summary.last_purchase_date ? formatDateTime(summary.last_purchase_date) : "-"}</td>
                            <td className="px-3 py-2">{item.default_vendor_name || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold">Inventory Purchase History</h2>
                  <p className="text-xs text-rose-700/70">
                    Click any inventory item in the live stock table to view all past purchases, quantities, prices, and vendor details.
                  </p>
                </div>
              </div>

              {!selectedInventoryHistoryItem ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Select an item from the Live Inventory Stock table above.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-rose-50 p-4">
                    <div className="text-lg font-semibold text-slate-900">{selectedInventoryHistoryItem.item_name}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Display unit: {getInventoryDisplayUnit(selectedInventoryHistoryItem)} - Current stock: {getInventoryStockSummaryText(selectedInventoryHistoryItem)}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-rose-100 text-slate-700">
                          <th className="px-3 py-2 font-semibold">Purchase Date</th>
                          <th className="px-3 py-2 font-semibold">Vendor</th>
                          <th className="px-3 py-2 font-semibold">Invoice</th>
                          <th className="px-3 py-2 font-semibold">Shipment</th>
                          <th className="px-3 py-2 font-semibold">Quantity</th>
                          <th className="px-3 py-2 font-semibold">Unit Cost</th>
                          <th className="px-3 py-2 font-semibold">Display Price</th>
                          <th className="px-3 py-2 font-semibold">Line Total</th>
                          <th className="px-3 py-2 font-semibold">Supply Model</th>
                          <th className="px-3 py-2 font-semibold">Expiry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInventoryPurchaseHistory.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-3 py-6 text-center text-sm text-rose-700/70">
                              No purchase history found for this item yet.
                            </td>
                          </tr>
                        ) : (
                          selectedInventoryPurchaseHistory.map((row) => (
                            <tr key={row.shipment_line_id} className="border-b border-rose-50 bg-white">
                              <td className="px-3 py-2">{row.shipment_date ? formatDateTime(row.shipment_date) : "-"}</td>
                              <td className="px-3 py-2">{row.vendor_name || "-"}</td>
                              <td className="px-3 py-2">{row.invoice_number || "-"}</td>
                              <td className="px-3 py-2">{row.shipment_number || "-"}</td>
                              <td className="px-3 py-2">{Number(row.quantity || 0).toFixed(2)}</td>
                              <td className="px-3 py-2">{formatSmallCurrency(Number(row.unit_cost || 0))}</td>
                              <td className="px-3 py-2">{formatSmallCurrency(getInventoryDisplayPrice(Number(row.unit_cost || 0), selectedInventoryHistoryItem))} <span className="text-[10px] text-slate-500">{getInventoryPriceLabel(selectedInventoryHistoryItem)}</span></td>
                              <td className="px-3 py-2">{formatCurrency(Number(row.line_total || 0))}</td>
                              <td className="px-3 py-2">{row.supply_model || "-"}</td>
                              <td className="px-3 py-2">{row.expiry_date ? formatDateTime(row.expiry_date) : "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>

<section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm xl:col-span-2">
              <h2 className="mb-2 text-2xl font-semibold">Stock Intake History</h2>
              <p className="mb-4 text-xs text-rose-700/70">
                Review intake records, amounts paid, outstanding balances, and item/payment details.
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStockIntakeHistoryTab("unpaid")}
                  className={`rounded-xl px-4 py-2 text-xs font-medium ${
                    stockIntakeHistoryTab === "unpaid"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => setStockIntakeHistoryTab("paid")}
                  className={`rounded-xl px-4 py-2 text-xs font-medium ${
                    stockIntakeHistoryTab === "paid"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  Paid
                </button>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Vendor Filter</label>
                  <select
                    value={stockIntakeHistoryFilterVendorId}
                    onChange={(e) => setStockIntakeHistoryFilterVendorId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                  >
                    <option value="">All vendors</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={String(vendor.id)}>
                        {vendor.vendor_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStockIntakeHistoryFilterVendorId("");
                    }}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  {filteredShipmentHistory.length === 0 ? (
                    <div className="rounded-xl border border-rose-100 p-4 text-sm text-rose-700/70">
{stockIntakeHistoryTab === "paid" ? "No paid stock intake records found." : "No unpaid stock intake records found."}
                    </div>
                  ) : (
                    filteredShipmentHistory.map((shipment: any) => {
                      const vendorName =
                        vendors.find((vendor) => String(vendor.id) === String(shipment.vendor_id))?.vendor_name ||
                        `Vendor #${shipment.vendor_id}`;

                      return (
                        <button
                          key={shipment.id}
                          type="button"
                          onClick={() => openShipmentHistory(String(shipment.id))}
                          className={`w-full rounded-xl border p-4 text-left shadow-sm ${
                            String(selectedShipmentHistoryId) === String(shipment.id)
                              ? "border-rose-500 bg-rose-50"
                              : "border-rose-100 bg-white hover:bg-rose-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">{vendorName}</div>
                              <div className="mt-1 text-xs text-rose-700/70">
                                {shipment.delivery_date || "-"} {shipment.invoice_number ? `| ${shipment.invoice_number}` : ""}
                              </div>
                              <div className="mt-1 text-xs text-rose-700/70">
                                Status: {shipment.payment_status || "-"}
                              </div>
                            </div>

                            <div className="text-right text-xs">
                              <div>Total: {formatCurrency(Number(shipment.total_amount || 0))}</div>
                              <div>Paid: {formatCurrency(Number(shipment.paid_amount || 0))}</div>
                              <div>Outstanding: {formatCurrency(Number(shipment.outstanding_amount || 0))}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-wide text-rose-700/70">
                    Shipment Details
                  </div>

                  {selectedShipmentHistory ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-rose-700/70">
                          Selected stock intake
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteShipmentHistory(String(selectedShipmentHistory.id))}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Delete Stock Intake
                        </button>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Vendor:</span> {vendors.find((vendor) => String(vendor.id) === String(selectedShipmentHistory.vendor_id))?.vendor_name || "-"}</div>
                        <div><span className="font-medium">Delivery Date:</span> {selectedShipmentHistory.delivery_date || "-"}</div>
                        <div><span className="font-medium">Invoice:</span> {selectedShipmentHistory.invoice_number || "-"}</div>
                        <div><span className="font-medium">Total:</span> {formatCurrency(Number(selectedShipmentHistory.total_amount || 0))}</div>
                        <div><span className="font-medium">Paid:</span> {formatCurrency(Number(selectedShipmentHistory.paid_amount || 0))}</div>
                        <div><span className="font-medium">Outstanding:</span> {formatCurrency(Number(selectedShipmentHistory.outstanding_amount || 0))}</div>
                        <div><span className="font-medium">Status:</span> {selectedShipmentHistory.payment_status || "-"}</div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-700/70">
                          Intake Lines
                        </div>
                        <div className="space-y-2">
                          {selectedShipmentLines.length === 0 ? (
                            <div className="text-sm text-rose-700/70">No shipment lines found.</div>
                          ) : (
                            selectedShipmentLines.map((line: any) => (
                              <div key={line.id} className="rounded-lg border border-rose-100 p-3 text-sm">
                                <div className="font-medium">
                                  {inventoryItems.find((item) => String(item.id) === String(line.inventory_item_id))?.item_name || `Item #${line.inventory_item_id}`}
                                </div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  Qty: {line.quantity} | Model: {line.supply_model || "-"}
                                </div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  Cost/%: {line.unit_cost ?? line.revenue_share_percent ?? "-"} | Expiry: {line.expiry_date || "-"}
                                </div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  Owed: {formatCurrency(Number(line.line_total || 0))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-rose-100 p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                            Total Pending Payments: {formatCurrency(totalPendingVendorPayments)}
                          </div>
                          <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                            Selected Intake Pending: {formatCurrency(Number(selectedShipmentHistory?.outstanding_amount || 0))}
                          </div>
                        </div>

                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-700/70">
                          Outstanding Vendor Payments
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Payment Mode</label>
                            <select
                              value={vendorPaymentMode}
                              onChange={(e) => setVendorPaymentMode(e.target.value as "full_intake" | "specific_lines")}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                            >
                              <option value="full_intake">Pay full intake</option>
                              <option value="specific_lines">Pay specific lines</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Amount</label>
                            <input
                              value={vendorPaymentForm.amount}
                              onChange={(e) => setVendorPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                              placeholder={String(getSelectedShipmentPaymentAmount())}
                              inputMode="decimal"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Payment Date</label>
                            <input
                              type="date"
                              value={vendorPaymentForm.payment_date}
                              onChange={(e) => setVendorPaymentForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                            />
                          </div>

                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Payment Method</label>
                            <select
                              value={vendorPaymentForm.payment_method}
                              onChange={(e) => setVendorPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                            >
                              <option value="cash">cash</option>
                              <option value="bank_transfer">bank transfer</option>
                              <option value="easypaisa">easypaisa</option>
                              <option value="jazzcash">jazzcash</option>
                              <option value="credit_card">credit card</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Reference / Notes</label>
                            <input
                              value={vendorPaymentForm.reference_number}
                              onChange={(e) => setVendorPaymentForm((prev) => ({ ...prev, reference_number: e.target.value }))}
                              className="w-full rounded-xl border px-3 py-2 text-xs"
                              placeholder="Payment reference or note"
                            />
                          </div>
                        </div>

                        {vendorPaymentMode === "specific_lines" ? (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium uppercase tracking-wide text-rose-700/70">
                              Select intake lines to pay
                            </div>
                            {selectedShipmentLines.length === 0 ? (
                              <div className="text-sm text-rose-700/70">No intake lines available.</div>
                            ) : (
                              selectedShipmentLines.map((line: any) => (
                                <label key={line.id} className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 p-3 text-xs">
                                  <div>
                                    <div className="font-medium">
                                      {inventoryItems.find((item) => String(item.id) === String(line.inventory_item_id))?.item_name || `Item #${line.inventory_item_id}`}
                                    </div>
                                    <div className="mt-1 text-rose-700/70">
                                      Qty: {line.quantity} | Owed: {formatCurrency(Number(line.line_total || 0))}
                                    </div>
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={selectedShipmentPaymentLineIds.includes(String(line.id))}
                                    onChange={() => toggleSelectedShipmentPaymentLine(String(line.id))}
                                  />
                                </label>
                              ))
                            )}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                            Suggested Amount: {formatCurrency(getSelectedShipmentPaymentAmount())}
                          </div>
                          <button
                            type="button"
                            onClick={saveVendorPaymentFromIntake}
                            className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm"
                          >
                            Save Vendor Payment
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-700/70">
                          Payment History
                        </div>
                        <div className="space-y-2">
                          {selectedShipmentPayments.length === 0 ? (
                            <div className="text-sm text-rose-700/70">No payments recorded.</div>
                          ) : (
                            selectedShipmentPayments.map((payment: any) => (
                              <div key={payment.id} className="rounded-lg border border-rose-100 p-3 text-sm">
                                <div className="font-medium">{formatCurrency(Number(payment.amount || 0))}</div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  Date: {payment.payment_date || "-"} | Method: {payment.payment_method || "-"}
                                </div>
                                <div className="mt-1 text-xs text-rose-700/70">
                                  Ref: {payment.reference_number || "-"}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700/70">
                      Select a stock intake record to view details.
                    </div>
                  )}
                </div>
              </div>
            </section>

            </section>

          </div>
        )}


        {viewMode === "audit" && canViewInventory && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold">Stock Audit</h2>
                  <p className="text-xs text-rose-700/70">
                    Use this tab at opening or closing to compare actual counted stock with system stock, then record wastage, damages, and other adjustments.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={refreshAll} className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50">Refresh Audit Data</button>
                  <button type="button" onClick={saveStockAudit} className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm">Save Stock Audit</button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Audit Date</label>
                  <input type="date" value={stockAuditDate} onChange={(e) => setStockAuditDate(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Audit Mode</label>
                  <select value={stockAuditMode} onChange={(e) => setStockAuditMode(e.target.value as "opening" | "closing")} className="w-full rounded-xl border px-3 py-2 text-xs">
                    <option value="opening">Opening Audit</option>
                    <option value="closing">Closing Audit</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Notes</label>
                  <input value={stockAuditNotes} onChange={(e) => setStockAuditNotes(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-xs" placeholder="Optional audit note" />
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Previous Closing Stock</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{previousClosingAudit ? previousClosingAudit.audit_date : "No previous closing audit"}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {previousClosingAudit
                      ? `Closing audit #${previousClosingAudit.id} is the carry-forward basis for the next day.`
                      : "Once you save a closing audit, that counted stock becomes the next day opening stock."}
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Opening Basis For This Audit</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {stockAuditMode === "opening" ? "Carry forward from previous closing" : "Current stock with today movements"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {stockAuditMode === "opening"
                      ? previousClosingAudit
                        ? `Opening audit on ${stockAuditDate} starts from the last closing audit dated ${previousClosingAudit.audit_date}.`
                        : "No previous closing audit found yet, so this opening audit starts from the live stock currently in the POS."
                      : "Closing audit shows opening plus purchases minus sales plus prior adjustments, then lets you correct the final counted stock."}
                  </div>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Carry Forward Rule</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">Today's closing becomes tomorrow's opening</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {latestAuditBeforeDate
                      ? `Latest saved audit before this date: ${latestAuditBeforeDate.audit_mode === "opening" ? "Opening" : "Closing"} audit on ${latestAuditBeforeDate.audit_date}.`
                      : "No earlier audit found. After your first saved closing audit, the next day opening will carry forward automatically."}
                  </div>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="mb-1 text-2xl font-semibold">Audit Count Sheet</h2>
                  <p className="text-xs text-rose-700/70">All quantities below are shown in each item's display unit. Opening + Purchases - Sales + Prior Adjustments = System Stock. Enter the actual physical count in the same unit, then record wastage, damages, and notes.</p>
                </div>
                <div className="text-xs text-rose-700/70">Items: {stockAuditEditorRows.length}</div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rose-100 text-slate-700">
                      <th className="px-3 py-2 font-semibold">Item</th><th className="px-3 py-2 font-semibold">Display Unit</th><th className="px-3 py-2 font-semibold">Opening</th><th className="px-3 py-2 font-semibold">Purchases</th><th className="px-3 py-2 font-semibold">Sales</th><th className="px-3 py-2 font-semibold">Prior Adjustments</th><th className="px-3 py-2 font-semibold">System Stock</th><th className="px-3 py-2 font-semibold">Actual Count</th><th className="px-3 py-2 font-semibold">Variance</th><th className="px-3 py-2 font-semibold">Wastage</th><th className="px-3 py-2 font-semibold">Damages</th><th className="px-3 py-2 font-semibold">Reason</th><th className="px-3 py-2 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockAuditEditorRows.length === 0 ? (
                      <tr><td colSpan={13} className="px-3 py-6 text-center text-sm text-rose-700/70">No inventory items available for audit.</td></tr>
                    ) : (
                      stockAuditEditorRows.map((row) => (
                        <tr key={row.inventory_item_id} className="border-b border-rose-50 bg-white align-top">
                          <td className="px-3 py-2 font-medium text-slate-900">{row.item_name}</td>
                          <td className="px-3 py-2"><span className="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">{row.display_unit}</span></td>
                          <td className="px-3 py-2">{formatAuditQty(row.opening_stock_display, row.display_unit)}</td>
                          <td className="px-3 py-2">{formatAuditQty(row.purchases_display, row.display_unit)}</td>
                          <td className="px-3 py-2">{formatAuditQty(row.sales_display, row.display_unit)}</td>
                          <td className="px-3 py-2">{formatAuditQty(row.adjustments_display, row.display_unit)}</td>
                          <td className="px-3 py-2 font-semibold">{formatAuditQty(row.system_stock_display, row.display_unit)}</td>
                          <td className="px-3 py-2"><div className="space-y-1"><input value={row.actual_stock_input} onChange={(e) => updateStockAuditRow(row.inventory_item_id, { actual_stock_input: e.target.value })} className="w-24 rounded-lg border px-2 py-1 text-xs" inputMode="decimal" placeholder={`Count in ${row.display_unit}`} /><div className="text-[10px] text-rose-700/70">in {row.display_unit}</div></div></td>
                          <td className="px-3 py-2 font-semibold"><span className={row.variance_display === 0 ? "text-slate-700" : row.variance_display > 0 ? "text-emerald-700" : "text-red-700"}>{Number(row.variance_display || 0) > 0 ? "+" : ""}{formatAuditQty(row.variance_display, row.display_unit)}</span></td>
                          <td className="px-3 py-2"><div className="space-y-1"><input value={row.wastage_input} onChange={(e) => updateStockAuditRow(row.inventory_item_id, { wastage_input: e.target.value })} className="w-20 rounded-lg border px-2 py-1 text-xs" inputMode="decimal" placeholder="0" /><div className="text-[10px] text-rose-700/70">in {row.display_unit}</div></div></td>
                          <td className="px-3 py-2"><div className="space-y-1"><input value={row.damages_input} onChange={(e) => updateStockAuditRow(row.inventory_item_id, { damages_input: e.target.value })} className="w-20 rounded-lg border px-2 py-1 text-xs" inputMode="decimal" placeholder="0" /><div className="text-[10px] text-rose-700/70">in {row.display_unit}</div></div></td>
                          <td className="px-3 py-2"><select value={row.variance_reason} onChange={(e) => updateStockAuditRow(row.inventory_item_id, { variance_reason: e.target.value })} className="w-36 rounded-lg border px-2 py-1 text-xs"><option value="count_correction">Count correction</option><option value="wastage">Wastage</option><option value="damages">Damages</option><option value="theft_loss">Theft / loss</option><option value="spoilage">Spoilage</option><option value="production_use">Production use</option><option value="other">Other</option></select></td>
                          <td className="px-3 py-2"><input value={row.note} onChange={(e) => updateStockAuditRow(row.inventory_item_id, { note: e.target.value })} className="w-48 rounded-lg border px-2 py-1 text-xs" placeholder="Optional note" /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-2xl font-semibold">Recent Stock Audits</h2>
                <p className="mb-4 text-xs text-rose-700/70">Click an audit record to inspect item-by-item variances and notes.</p>
                <div className="space-y-3">
                  {stockAudits.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">No stock audits saved yet.</div>
                  ) : (
                    stockAudits.map((audit) => (
                      <button key={audit.id} type="button" onClick={() => setSelectedStockAuditId(audit.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedStockAuditId === audit.id ? "border-rose-300 bg-rose-50" : "border-rose-100 bg-white hover:bg-rose-50"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div><div className="text-sm font-semibold text-slate-900">{audit.audit_mode === "opening" ? "Opening Audit" : "Closing Audit"}</div><div className="mt-1 text-xs text-rose-700/70">{audit.audit_date}</div>{audit.notes ? <div className="mt-2 text-xs text-slate-600">{audit.notes}</div> : null}</div>
                          <div className="text-[10px] uppercase tracking-wide text-rose-700/70">#{audit.id}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </section>
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-2xl font-semibold">Audit Details</h2>
                {!selectedStockAudit ? (
                  <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Select a saved audit to view item-level adjustments.</div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-rose-50 p-4 text-sm"><div className="font-semibold text-slate-900">{selectedStockAudit.audit_mode === "opening" ? "Opening Audit" : "Closing Audit"}</div><div className="mt-1 text-xs text-slate-600">Date: {selectedStockAudit.audit_date}</div><div className="mt-1 text-xs text-slate-600">Created: {selectedStockAudit.created_at ? formatDateTime(selectedStockAudit.created_at) : "-"}</div>{selectedStockAudit.notes ? <div className="mt-2 text-xs text-slate-700">{selectedStockAudit.notes}</div> : null}</div>
                    <div className="max-h-[540px] overflow-auto">
                      <table className="min-w-full text-left text-xs">
                        <thead><tr className="border-b border-rose-100 text-slate-700"><th className="px-3 py-2 font-semibold">Item</th><th className="px-3 py-2 font-semibold">Unit</th><th className="px-3 py-2 font-semibold">System</th><th className="px-3 py-2 font-semibold">Actual</th><th className="px-3 py-2 font-semibold">Variance</th><th className="px-3 py-2 font-semibold">Wastage</th><th className="px-3 py-2 font-semibold">Damages</th><th className="px-3 py-2 font-semibold">Reason</th><th className="px-3 py-2 font-semibold">Note</th></tr></thead>
                        <tbody>
                          {selectedStockAuditLineRows.length === 0 ? (
                            <tr><td colSpan={9} className="px-3 py-6 text-center text-sm text-rose-700/70">No line details found for this audit.</td></tr>
                          ) : (
                            selectedStockAuditLineRows.map((line) => {
                              const item = inventoryItems.find((inventoryItem) => inventoryItem.id === line.inventory_item_id);
                              const fallback = { unit: line.display_unit, measurement_mode: line.display_unit, case_size_each: null } as unknown as InventoryItem;
                              const refItem = item || fallback;
                              return (
                                <tr key={line.id} className="border-b border-rose-50 bg-white">
                                  <td className="px-3 py-2">{item?.item_name || `Item #${line.inventory_item_id}`}</td>
                                  <td className="px-3 py-2">{line.display_unit}</td>
                                  <td className="px-3 py-2">{formatAuditQty(getInventoryDisplayQuantity(line.system_stock_raw, refItem), line.display_unit)}</td>
                                  <td className="px-3 py-2">{formatAuditQty(getInventoryDisplayQuantity(line.actual_stock_raw, refItem), line.display_unit)}</td>
                                  <td className="px-3 py-2">{formatAuditQty(getInventoryDisplayQuantity(line.variance_raw, refItem), line.display_unit)}</td>
                                  <td className="px-3 py-2">{formatAuditQty(getInventoryDisplayQuantity(line.wastage_raw, refItem), line.display_unit)}</td>
                                  <td className="px-3 py-2">{formatAuditQty(getInventoryDisplayQuantity(line.damages_raw, refItem), line.display_unit)}</td>
                                  <td className="px-3 py-2">{line.variance_reason || "-"}</td>
                                  <td className="px-3 py-2">{line.note || "-"}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            </section>
          </div>
        )}

        {viewMode === "recipes" && canViewRecipes && (
          <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div>
                  <h2 className="mb-2 text-2xl font-semibold">Product Recipes</h2>
                  <p className="text-xs text-rose-700/70">
                    Build recipes using inventory ingredients. Latest stock intake cost is used automatically, with unit conversion when needed.
                  </p>
                </div>

                <div className="rounded-xl border border-rose-100 p-4">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Select Product</label>
                  <select
                    value={selectedRecipeProductId}
                    onChange={(e) => setSelectedRecipeProductId(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={String(product.id)}>
                        {product.name}
                      </option>
                    ))}
                  </select>

                  {selectedRecipeProductId ? (
                    <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <div><span className="font-semibold">Selling Price:</span> {formatCurrency(Number(products.find((product) => String(product.id) === selectedRecipeProductId)?.price || 0))}</div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-rose-100 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-rose-700/70">
                    Recipe Summary
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div>
                      <span className="font-medium">Recipe Cost:</span>{" "}
                      {formatCurrency(recipeEditorRows.reduce((sum, row) => sum + getRecipeLineComputedCost(row), 0))}
                    </div>
                    <div>
                      <span className="font-medium">Selling Price:</span>{" "}
                      {formatCurrency(Number(products.find((product) => String(product.id) === selectedRecipeProductId)?.price || 0))}
                    </div>
                    <div>
                      <span className="font-medium">Gross Profit:</span>{" "}
                      {formatCurrency(
                        Number(products.find((product) => String(product.id) === selectedRecipeProductId)?.price || 0) -
                          recipeEditorRows.reduce((sum, row) => sum + getRecipeLineComputedCost(row), 0)
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Gross Margin %:</span>{" "}
                      {(() => {
                        const price = Number(products.find((product) => String(product.id) === selectedRecipeProductId)?.price || 0);
                        const cost = recipeEditorRows.reduce((sum, row) => sum + getRecipeLineComputedCost(row), 0);
                        if (price <= 0) return "0%";
                        return `${(((price - cost) / price) * 100).toFixed(1)}%`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {recipeEditorRows.map((row, index) => {
                  const item = inventoryItems.find((inventoryItem) => String(inventoryItem.id) === row.inventory_item_id);
                  const latestUnitCost = item ? getLatestItemUnitCost(item.id) : 0;
                  const compatibleUnits = item ? getCompatibleRecipeUnits(item.unit) : ["pcs"];
                  const costBasisUnit = item ? getRecipeCostBasisUnit(item.unit) : "";
                  const normalizedQty = item
                    ? convertQuantityBetweenUnits(
                        Number(row.quantity_input || 0),
                        row.recipe_unit || costBasisUnit,
                        costBasisUnit
                      )
                    : null;

                  return (
                    <div key={row.row_id} className="rounded-xl border border-rose-100 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-medium uppercase tracking-wide text-rose-700/70">Ingredient Line {index + 1}</div>
                        {recipeEditorRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeRecipeEditorRow(row.row_id)}
                            className="rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Ingredient</label>
                          <select
                            value={row.inventory_item_id}
                            onChange={(e) => updateRecipeEditorRow(row.row_id, { inventory_item_id: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                          >
                            <option value="">Select ingredient</option>
                            {inventoryItems.filter((inventoryItem) => inventoryItem.active !== false).map((inventoryItem) => (
                              <option key={inventoryItem.id} value={String(inventoryItem.id)}>
                                {inventoryItem.item_name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Qty Used</label>
                          <input
                            value={row.quantity_input}
                            onChange={(e) => updateRecipeEditorRow(row.row_id, { quantity_input: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="0"
                            inputMode="decimal"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Recipe Unit</label>
                          <select
                            value={row.recipe_unit || (item ? getRecipeCostBasisUnit(item.unit) : "")}
                            onChange={(e) => updateRecipeEditorRow(row.row_id, { recipe_unit: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                          >
                            {compatibleUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Wastage %</label>
                          <input
                            value={row.wastage_percent}
                            onChange={(e) => updateRecipeEditorRow(row.row_id, { wastage_percent: e.target.value })}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            placeholder="0"
                            inputMode="decimal"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-700">Line Cost</label>
                          <div className="rounded-xl border bg-white px-3 py-2 text-xs font-medium">
                            {formatCurrency(getRecipeLineComputedCost(row))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <span className="font-semibold">Inventory Unit:</span> {item ? getRecipeCostBasisUnit(item.unit) : "-"}
                        </div>
                        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <span className="font-semibold">Latest Cost / {item ? getRecipeCostBasisUnit(item.unit) : "unit"}:</span> {formatSmallCurrency(latestUnitCost)}
                        </div>
                        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <span className="font-semibold">Normalized Qty:</span> {normalizedQty == null ? "-" : Number(normalizedQty.toFixed(4)).toString()}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addRecipeEditorRow}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Add Ingredient
                  </button>
                  <button
                    type="button"
                    onClick={saveProductRecipe}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm"
                  >
                    Save Recipe
                  </button>
                  <button
                    type="button"
                    onClick={resetRecipeEditorRows}
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {viewMode === "setup" && canViewSetup && (
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Product Setup</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Product Name</label>
                    <input
                      value={productForm.name}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Price</label>
                    <input
                      value={productForm.price}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-xl border px-3 py-2"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium">Assign Categories</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {categories.map((category) => {
                      const selected = productForm.categoryIds.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              categoryIds: selected
                                ? prev.categoryIds.filter((id) => id !== category.id)
                                : [...prev.categoryIds, category.id],
                            }))
                          }
                          className={`rounded-xl border px-3 py-2 text-left text-sm ${
                            selected ? "border-slate-900 bg-rose-500 text-white" : "border-rose-200"
                          }`}
                        >
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-sm font-medium">Assign Modifiers</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {modifierLibrary.map((modifier) => {
                      const selected = productForm.modifierIds.includes(modifier.id);
                      return (
                        <button
                          key={modifier.id}
                          type="button"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              modifierIds: selected
                                ? prev.modifierIds.filter((id) => id !== modifier.id)
                                : [...prev.modifierIds, modifier.id],
                            }))
                          }
                          className={`rounded-xl border px-3 py-2 text-left text-sm ${
                            selected ? "border-emerald-600 bg-emerald-500 text-white" : "border-rose-200"
                          }`}
                        >
                          {modifier.name} - {formatCurrency(modifier.price_delta)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={saveProduct}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                  >
                    {productForm.id ? "Update Product" : "Create Product"}
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
                    className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Clear
                  </button>
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Existing Products</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => loadProductIntoForm(product)}
                      className="rounded-2xl border p-4 text-left"
                    >
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm text-rose-700/70">{formatCurrency(product.price)}</div>
                      <div className="mt-2 text-xs text-rose-700/70">
                        Categories: {product.categories.map((c) => c.name).join(", ") || "None"}
                      </div>
                      <div className="text-xs text-rose-700/70">
                        Modifiers: {(productModifierMap[product.id] || []).length}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </section>

            <section className="space-y-6">
              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Category Setup</h2>
                <div className="space-y-3">
                  <input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Category name"
                  />
                  <button
                    onClick={saveCategory}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                  >
                    {categoryForm.id ? "Update Category" : "Create Category"}
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setCategoryForm({ id: category.id, name: category.name, active: category.active !== false })}
                      className="block w-full rounded-xl border p-3 text-left"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Modifier Setup</h2>
                <div className="space-y-3">
                  <input
                    value={modifierForm.name}
                    onChange={(e) => setModifierForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Modifier name"
                  />
                  <input
                    value={modifierForm.price_delta}
                    onChange={(e) => setModifierForm((prev) => ({ ...prev, price_delta: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Price delta"
                  />
                  <select
                    value={modifierForm.inventory_effect_item_id}
                    onChange={(e) => {
                      const nextItemId = e.target.value;
                      const effectItem = inventoryItems.find((item) => String(item.id) === nextItemId) || null;
                      const nextUnit = effectItem ? getRecipeCostBasisUnit(effectItem.unit) : "";
                      setModifierForm((prev) => ({
                        ...prev,
                        inventory_effect_item_id: nextItemId,
                        inventory_effect_unit: nextUnit,
                      }));
                    }}
                    className="w-full rounded-xl border px-3 py-2"
                  >
                    <option value="">No stock effect</option>
                    {inventoryItems.filter((item) => item.active !== false).map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.item_name} ({item.unit})
                      </option>
                    ))}
                  </select>
                  <select
                    value={modifierForm.inventory_effect_unit}
                    onChange={(e) => setModifierForm((prev) => ({ ...prev, inventory_effect_unit: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={!modifierForm.inventory_effect_item_id}
                  >
                    {modifierEffectUnitOptions.map((unitOption) => (
                      <option key={unitOption} value={unitOption}>
                        {unitOption}
                      </option>
                    ))}
                  </select>
                  <input
                    value={modifierForm.inventory_effect_quantity}
                    onChange={(e) => setModifierForm((prev) => ({ ...prev, inventory_effect_quantity: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder={`Extra stock quantity to deduct in ${modifierForm.inventory_effect_unit || modifierEffectUnitOptions[0] || "unit"}`}
                  />
                  <div className="text-xs text-rose-700/80">
                    Example: Extra Shot -&gt; Coffee Beans -&gt; 8 g. Choose the deduction unit here. The app will convert it to the recipe stock unit automatically when the order is completed.
                  </div>
                  <button
                    onClick={saveModifier}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    {modifierForm.id ? "Update Modifier" : "Create Modifier"}
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {modifierLibrary.map((modifier) => {
                    const effect = modifierEffectByModifierId.get(modifier.id);
                    const effectItem = inventoryItems.find((item) => item.id === Number(effect?.inventory_item_id || 0));
                    return (
                      <button
                        key={modifier.id}
                        onClick={() =>
                          setModifierForm({
                            id: modifier.id,
                            name: modifier.name,
                            price_delta: String(modifier.price_delta),
                            active: modifier.active !== false,
                            inventory_effect_item_id: effect ? String(effect.inventory_item_id) : "",
                            inventory_effect_unit: effect ? String(effect.deduction_unit || getRecipeCostBasisUnit(effectItem?.unit)) : "",
                            inventory_effect_quantity: effect ? String(effect.quantity_delta) : "",
                          })
                        }
                        className="block w-full rounded-xl border p-3 text-left"
                      >
                        <div>{modifier.name} - {formatCurrency(modifier.price_delta)}</div>
                        <div className="mt-1 text-xs text-rose-700/80">
                          {effect && effectItem
                            ? `Stock effect: ${effect.quantity_delta} ${effect.deduction_unit || getRecipeCostBasisUnit(effectItem.unit)} of ${effectItem.item_name}`
                            : "Stock effect: none"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Sales Tax Setup</h2>
                <div className="space-y-3">
                  <input
                    value={salesTaxForm.name}
                    onChange={(e) => setSalesTaxForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Sales tax name"
                  />
                  <input
                    value={salesTaxForm.rate_percent}
                    onChange={(e) => setSalesTaxForm((prev) => ({ ...prev, rate_percent: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Rate percent"
                  />
                  <button
                    onClick={saveSalesTax}
                    className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                  >
                    {salesTaxForm.id ? "Update Sales Tax" : "Create Sales Tax"}
                  </button>
                  <button
                    onClick={() =>
                      setSalesTaxForm({
                        id: null,
                        name: "",
                        rate_percent: "",
                        active: true,
                      })
                    }
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {salesTaxes.map((salesTax) => (
                    <button
                      key={salesTax.id}
                      onClick={() =>
                        setSalesTaxForm({
                          id: salesTax.id,
                          name: salesTax.name,
                          rate_percent: String(salesTax.rate_percent),
                          active: salesTax.active !== false,
                        })
                      }
                      className="block w-full rounded-xl border p-3 text-left"
                    >
                      {salesTax.name} - {salesTax.rate_percent}%
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Payment Method Setup</h2>
                <div className="space-y-3">
                  <input
                    value={paymentMethodForm.name}
                    onChange={(e) => setPaymentMethodForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Payment method name"
                  />

                  <div>
                    <div className="mb-2 text-sm font-medium">Apply Sales Taxes</div>
                    <div className="grid grid-cols-3 gap-2">
                      {salesTaxes.map((salesTax) => {
                        const selected = paymentMethodForm.salesTaxIds.includes(salesTax.id);
                        return (
                          <button
                            key={salesTax.id}
                            type="button"
                            onClick={() =>
                              setPaymentMethodForm((prev) => ({
                                ...prev,
                                salesTaxIds: selected
                                  ? prev.salesTaxIds.filter((id) => id !== salesTax.id)
                                  : [...prev.salesTaxIds, salesTax.id],
                              }))
                            }
                            className={`rounded-xl border px-3 py-2 text-left text-sm ${
                              selected ? "border-rose-500 bg-rose-500 text-white" : "border-rose-200 bg-white"
                            }`}
                          >
                            {salesTax.name} - {salesTax.rate_percent}%
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={savePaymentMethod}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                    >
                      {paymentMethodForm.id ? "Update Payment Method" : "Create Payment Method"}
                    </button>
                    <button
                      onClick={() =>
                        setPaymentMethodForm({
                          id: null,
                          name: "",
                          active: true,
                          salesTaxIds: [],
                        })
                      }
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {paymentMethods.map((paymentMethod) => (
                    <button
                      key={paymentMethod.id}
                      onClick={() =>
                        setPaymentMethodForm({
                          id: paymentMethod.id,
                          name: paymentMethod.name,
                          active: paymentMethod.active !== false,
                          salesTaxIds: paymentMethodTaxMap[paymentMethod.id] || [],
                        })
                      }
                      className="block w-full rounded-xl border p-3 text-left"
                    >
                      <div className="font-medium">{paymentMethod.name}</div>
                      <div className="text-sm text-rose-700/70">
                        Taxes: {(paymentMethodTaxMap[paymentMethod.id] || [])
                          .map((taxId) => salesTaxes.find((tax) => tax.id === taxId)?.name)
                          .filter(Boolean)
                          .join(", ") || "None"}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Printer Settings</h2>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Receipt / Kitchen Printer</label>
                    <select
                      value={receiptKitchenPrinter}
                      onChange={(e) => setReceiptKitchenPrinter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">Select printer</option>
                      {availablePrinters.map((printer) => (
                        <option key={printer.name} value={printer.name}>
                          {printer.displayName || printer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Sticker Printer</label>
                    <select
                      value={stickerPrinter}
                      onChange={(e) => setStickerPrinter(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="">Select printer</option>
                      {availablePrinters.map((printer) => (
                        <option key={printer.name} value={printer.name}>
                          {printer.displayName || printer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoPrintReceipt}
                      onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                    />
                    Auto-print customer receipt
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoPrintKitchen}
                      onChange={(e) => setAutoPrintKitchen(e.target.checked)}
                    />
                    Auto-print kitchen ticket
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoPrintStickers}
                      onChange={(e) => setAutoPrintStickers(e.target.checked)}
                    />
                    Auto-print drink stickers
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={savePrinterSettings}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm"
                    >
                      Save Printer Settings
                    </button>

                    <button
                      onClick={testReceiptPrinter}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium"
                    >
                      Test Receipt/Kitchen Printer
                    </button>

                    <button
                      onClick={testStickerPrinter}
                      className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium"
                    >
                      Test Sticker Printer
                    </button>
                  </div>

                  <div className="text-xs text-rose-700/70">
                    Run the POS through Electron to list local printers and print silently.
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-2xl font-semibold">Setup Snapshot</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Products</div>
                    <div className="mt-1 text-2xl font-bold">{products.length}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Categories</div>
                    <div className="mt-1 text-2xl font-bold">{categories.length}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Modifiers</div>
                    <div className="mt-1 text-2xl font-bold">{modifierLibrary.length}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Payment Methods</div>
                    <div className="mt-1 text-2xl font-bold">{paymentMethods.length}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Sales Taxes</div>
                    <div className="mt-1 text-2xl font-bold">{salesTaxes.length}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-sm text-rose-700/70">Promotions</div>
                    <div className="mt-1 text-2xl font-bold">{promotions.length}</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-rose-700/70">
                  Sales taxes can now be created and edited here, and different sales taxes can be assigned to different payment methods.
                </div>
                <div className="mt-2 text-xs text-rose-700/70">
                  Categories and modifiers can now be assigned directly to each product from Product Setup.
                </div>
                <div className="mt-2 text-xs text-rose-700/70">
                  Current edit values: {paymentMethodForm.name || "-"} | {salesTaxForm.name || "-"} | {promotionForm.name || "-"}
                </div>
              </section>
            </section>
          </div>
        )}

        {selectedQueueOrder ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/20 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-rose-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-bold text-rose-950">
                    {selectedQueueOrder.order_number} - {selectedQueueOrder.status}
                  </h3>
                  <div className="mt-1 text-sm text-rose-700/70">
                    {selectedQueueOrder.customer?.name || "Guest"} | {selectedQueueOrder.customer?.phone || "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQueueOrder(null)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Close
                </button>
              </div>

              <div className="rounded-2xl bg-rose-50 p-4">
                {renderOrderCard(selectedQueueOrder)}
              </div>
            </div>
          </div>
        ) : null}

        {selectedProductForCart ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/20 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-3xl font-bold text-rose-950">{selectedProductForCart.name}</h3>
                  <div className="mt-1 text-sm text-rose-700/70">{formatCurrency(selectedProductForCart.price)}</div>
                </div>
                <button
                  type="button"
                  onClick={resetLineBuilder}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="mb-2 text-sm font-medium">Modifiers</div>
                  {activeProductModifiers.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeProductModifiers.map((mod) => {
                        const selected = selectedModifierIds.includes(mod.id);
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() =>
                              setSelectedModifierIds((prev) =>
                                selected ? prev.filter((id) => id !== mod.id) : [...prev, mod.id]
                              )
                            }
                            className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                              selected
                                ? "border-slate-900 bg-rose-500 text-white"
                                : "border-rose-200 bg-white hover:border-rose-300"
                            }`}
                          >
                            <div className="font-medium">{mod.name}</div>
                            <div className={selected ? "text-rose-100" : "text-rose-700/70"}>
                              {formatCurrency(mod.price_delta)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700/70">
                      No modifiers are linked to this product yet. Go to Setup and add modifiers to this product.
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Pricing Mode</label>
                    <select
                      value={linePricingMode}
                      onChange={(e) =>
                        setLinePricingMode(
                          e.target.value as "normal" | "discounted" | "complimentary"
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="normal">Normal</option>
                      <option value="discounted">Discounted</option>
                      <option value="complimentary">Complimentary</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Discounted Unit Price</label>
                    <input
                      value={lineDiscountedUnitPrice}
                      onChange={(e) => setLineDiscountedUnitPrice(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2"
                      placeholder="Only for discounted"
                      disabled={linePricingMode !== "discounted"}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">Preview</label>
                    <div className="rounded-xl border px-3 py-2">{formatCurrency(linePricingPreview)}</div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Notes</label>
                  <input
                    value={lineNotes}
                    onChange={(e) => setLineNotes(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Special instructions"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={addSelectedProductToCart}
                    className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-medium text-white"
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={resetLineBuilder}
                    className="rounded-xl border border-rose-200 px-5 py-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-4 text-sm text-rose-700/70 shadow-sm">
          Last tick: {mounted ? formatTime(new Date(nowTick).toISOString()) : "-"}
        </section>
      </div>
    </main>
  );
}

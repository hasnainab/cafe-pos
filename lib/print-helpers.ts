export type PosOrderItem = {
  product_name: string;
  quantity: number;
  modifiers_text?: string | null;
  notes?: string | null;
};

export type PosOrder = {
  order_number: string;
  created_at: string;
  customer_name?: string | null;
  payment_method_name?: string | null;
  subtotal: number;
  tax_total: number;
  total: number;
  items: PosOrderItem[];
};

export type DrinkStickerInput = {
  orderNumber: string;
  customerName: string;
  drinkName: string;
  modifiers?: string;
  notes?: string;
  countLabel: string; // e.g. 1/3
};

export function money(v: number) {
  return `Rs ${Number(v || 0).toFixed(0)}`;
}

export function buildReceiptHtml(order: PosOrder, logoDataUrl?: string) {
  const items = order.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.product_name)} x ${item.quantity}</td>
      <td></td>
    </tr>
      ${item.modifiers_text ? `<tr><td class="muted">- ${escapeHtml(item.modifiers_text)}</td><td></td></tr>` : ""}
      ${item.notes ? `<tr><td class="muted">- ${escapeHtml(item.notes)}</td><td></td></tr>` : ""}
  `).join("");

  return `
  <html>
    <head>
      <style>
        @page { margin: 6mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
        .center { text-align: center; }
        .logo { max-width: 150px; max-height: 60px; object-fit: contain; margin: 0 auto 6px; display:block; }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .muted { color: #444; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        td { padding: 2px 0; vertical-align: top; }
        .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="center">
        ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
        <div class="title">Spill The Tea</div>
        <div>${escapeHtml(order.order_number)}</div>
        <div class="muted">${new Date(order.created_at).toLocaleString()}</div>
        <div class="muted">${escapeHtml(order.customer_name || "")}</div>
      </div>
      <table>${items}</table>
      <div class="totals">
        <div>Subtotal: ${money(order.subtotal)}</div>
        <div>Tax: ${money(order.tax_total)}</div>
        <div><strong>Total: ${money(order.total)}</strong></div>
        <div>Payment: ${escapeHtml(order.payment_method_name || "-")}</div>
      </div>
    </body>
  </html>`;
}

export function buildKitchenHtml(order: PosOrder, logoDataUrl?: string) {
  const items = order.items.map((item) => `
    <div class="item">
      <div class="name">${escapeHtml(item.product_name)} x ${item.quantity}</div>
      ${item.modifiers_text ? `<div class="sub">Modifiers: ${escapeHtml(item.modifiers_text)}</div>` : ""}
      ${item.notes ? `<div class="sub">Notes: ${escapeHtml(item.notes)}</div>` : ""}
    </div>
  `).join("");

  return `
  <html>
    <head>
      <style>
        @page { margin: 6mm; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
        .center { text-align: center; }
        .logo { max-width: 130px; max-height: 50px; object-fit: contain; margin: 0 auto 6px; display:block; }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .tag { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
        .item { margin: 8px 0; padding-bottom: 6px; border-bottom: 1px dashed #000; }
        .name { font-size: 14px; font-weight: 700; }
        .sub { font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="center">
        ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
        <div class="title">Spill The Tea</div>
        <div class="tag">KITCHEN TICKET</div>
        <div>${escapeHtml(order.order_number)}</div>
        <div>${new Date(order.created_at).toLocaleString()}</div>
        <div>${escapeHtml(order.customer_name || "")}</div>
      </div>
      ${items}
    </body>
  </html>`;
}

export function buildStickerHtml(stickers: DrinkStickerInput[], logoDataUrl?: string) {
  const pages = stickers.map((s) => `
    <div class="label">
      <div class="top">
        <div class="customer">${escapeHtml(s.customerName || "Guest")}</div>
        <div class="count">${escapeHtml(s.countLabel)}</div>
      </div>
      <div class="drink">${escapeHtml(s.drinkName)}</div>
      <div class="small">${escapeHtml(s.orderNumber)}</div>
      ${s.modifiers ? `<div class="small">${escapeHtml(s.modifiers)}</div>` : ""}
      ${s.notes ? `<div class="small">${escapeHtml(s.notes)}</div>` : ""}
    </div>
  `).join('<div class="page-break"></div>');

  return `
  <html>
    <head>
      <style>
        @page { size: 2in 1in; margin: 0.04in; }
        body { margin: 0; font-family: Arial, sans-serif; color: #000; }
        .label {
          width: 1.92in;
          height: 0.92in;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 0.02in 0.04in;
        }
        .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; }
        .customer { font-size: 14px; font-weight: 700; line-height: 1.05; max-width: 1.2in; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .count { font-size: 14px; font-weight: 700; line-height: 1.05; }
        .drink { font-size: 11px; font-weight: 700; line-height: 1.05; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .small { font-size: 8px; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>${pages}</body>
  </html>`;
}

export function expandDrinkStickers(order: {
  order_number: string;
  customer_name?: string | null;
  items: Array<{
    product_name: string;
    quantity: number;
    modifiers_text?: string | null;
    notes?: string | null;
    product_type?: "drink" | "food" | string | null;
  }>;
}) {
  const drinkItems = order.items.filter((item) => String(item.product_type || "").toLowerCase() === "drink");
  const expanded: DrinkStickerInput[] = [];
  const totalDrinkCount = drinkItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  let index = 0;
  for (const item of drinkItems) {
    for (let i = 0; i < Number(item.quantity || 0); i += 1) {
      index += 1;
      expanded.push({
        orderNumber: order.order_number,
        customerName: order.customer_name || "Guest",
        drinkName: item.product_name,
        modifiers: item.modifiers_text || "",
        notes: item.notes || "",
        countLabel: `${index}/${totalDrinkCount}`,
      });
    }
  }

  return expanded;
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
export type PosOrderItem = {
  product_name: string;
  quantity: number;
  unit_price?: number;
  line_total?: number;
  modifiers_text?: string | null;
  notes?: string | null;
  product_type?: "drink" | "food" | string | null;
};

export type PosOrder = {
  order_number: string;
  created_at: string;
  customer_name?: string | null;
  payment_method_name?: string | null;
  subtotal: number;
  tax_total: number;
  discount_total?: number;
  total: number;
  items: PosOrderItem[];

  logo_data_url?: string | null;
  business_name?: string | null;
  business_tagline?: string | null;
  business_phone?: string | null;
  business_address?: string | null;
};

export type DrinkStickerInput = {
  orderNumber: string;
  customerName: string;
  drinkName: string;
  modifiers?: string;
  notes?: string;
  countLabel: string;
};

export function money(v: number) {
  return `Rs ${Number(v || 0).toFixed(0)}`;
}

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value || 0)) ? Number(value || 0) : 0;
}

export function buildReceiptHtml(order: PosOrder) {
  const businessName = escapeHtml(order.business_name || "Spill The Tea");
  const businessTagline = escapeHtml(order.business_tagline || "Cafe • Coffee • Tea • Mocktails");
  const businessPhone = escapeHtml(order.business_phone || "");
  const businessAddress = escapeHtml(order.business_address || "");
  const subtotal = safeNumber(order.subtotal);
  const discount = safeNumber(order.discount_total);
  const tax = safeNumber(order.tax_total);
  const total = safeNumber(order.total);

  const itemRows = (order.items || [])
    .map((item) => {
      const quantity = safeNumber(item.quantity);
      const unitPrice = safeNumber(item.unit_price);
      const lineTotal = item.line_total != null ? safeNumber(item.line_total) : quantity * unitPrice;

      return `
        <div class="item">
          <div class="item-main">
            <div class="item-name">${escapeHtml(item.product_name)}</div>
            <div class="item-amount">${money(lineTotal)}</div>
          </div>
          <div class="item-meta">Qty: ${quantity}${item.unit_price != null ? ` x ${money(unitPrice)}` : ""}</div>
          ${item.modifiers_text ? `<div class="item-sub">Modifier: ${escapeHtml(item.modifiers_text)}</div>` : ""}
          ${item.notes ? `<div class="item-sub">Note: ${escapeHtml(item.notes)}</div>` : ""}
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: 80mm auto; margin: 0; }
      * {
        box-sizing: border-box;
        color: #000000 !important;
        background: #ffffff !important;
        text-shadow: none !important;
        box-shadow: none !important;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 80mm;
        min-width: 80mm;
        max-width: 80mm;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        line-height: 1.25;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        padding: 4mm 4mm 5mm;
      }
      .center { text-align: center; }
      .brand {
        font-size: 21px;
        font-weight: 900;
        line-height: 1.05;
        margin: 0 0 2px;
      }
      .tagline {
        font-size: 10px;
        font-weight: 700;
        margin-bottom: 3px;
      }
      .contact {
        font-size: 9px;
        line-height: 1.2;
        margin-bottom: 5px;
      }
      .rule {
        border-top: 1px dashed #000000;
        height: 1px;
        margin: 6px 0;
      }
      .meta-line {
        font-size: 10px;
        margin: 2px 0;
        font-weight: 700;
      }
      .item {
        padding: 4px 0;
        border-bottom: 1px dashed #000000;
        break-inside: avoid;
      }
      .item-main {
        display: table;
        width: 100%;
        table-layout: fixed;
      }
      .item-name {
        display: table-cell;
        width: 68%;
        font-size: 12px;
        font-weight: 900;
        vertical-align: top;
        word-break: break-word;
      }
      .item-amount {
        display: table-cell;
        width: 32%;
        text-align: right;
        font-size: 12px;
        font-weight: 900;
        vertical-align: top;
        white-space: nowrap;
      }
      .item-meta, .item-sub {
        font-size: 10px;
        font-weight: 700;
        margin-top: 1px;
      }
      .totals { margin-top: 6px; }
      .total-row {
        display: table;
        width: 100%;
        table-layout: fixed;
        font-size: 12px;
        margin: 3px 0;
        font-weight: 800;
      }
      .total-row .label,
      .total-row .value {
        display: table-cell;
        vertical-align: top;
      }
      .total-row .value {
        text-align: right;
        white-space: nowrap;
      }
      .grand-total {
        font-size: 16px;
        font-weight: 900;
        padding-top: 3px;
        border-top: 1px solid #000000;
        margin-top: 5px;
      }
      .payment {
        margin-top: 7px;
        font-size: 11px;
        font-weight: 900;
      }
      .footer-note {
        margin-top: 8px;
        text-align: center;
        font-size: 10px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <div class="center">
      <div class="brand">${businessName}</div>
      <div class="tagline">${businessTagline}</div>
      ${businessPhone || businessAddress ? `<div class="contact">${businessPhone ? `<div>${businessPhone}</div>` : ""}${businessAddress ? `<div>${businessAddress}</div>` : ""}</div>` : ""}
    </div>

    <div class="rule"></div>

    <div class="meta-line">Order: ${escapeHtml(order.order_number)}</div>
    <div class="meta-line">Date: ${escapeHtml(new Date(order.created_at).toLocaleString())}</div>
    ${order.customer_name ? `<div class="meta-line">Customer: ${escapeHtml(order.customer_name || "")}</div>` : ""}

    <div class="rule"></div>

    ${itemRows || `<div class="item"><div class="item-name">No items</div></div>`}

    <div class="totals">
      <div class="total-row"><div class="label">Subtotal</div><div class="value">${money(subtotal)}</div></div>
      ${discount > 0 ? `<div class="total-row"><div class="label">Discount</div><div class="value">- ${money(discount)}</div></div>` : ""}
      <div class="total-row"><div class="label">Tax</div><div class="value">${money(tax)}</div></div>
      <div class="total-row grand-total"><div class="label">Total</div><div class="value">${money(total)}</div></div>
    </div>

    <div class="payment">Payment: ${escapeHtml(order.payment_method_name || "-")}</div>
    <div class="footer-note">Thank you for visiting Spill The Tea</div>
  </body>
</html>`;
}

export function buildKitchenHtml(order: PosOrder, logoDataUrl?: string) {
  const businessName = escapeHtml(order.business_name || "Spill The Tea");
  const logo = logoDataUrl || order.logo_data_url || "";

  const items = order.items
    .map(
      (item) => `
      <div class="item">
        <div class="item-top">
          <div class="qty">${Number(item.quantity || 0)}x</div>
          <div class="name">${escapeHtml(item.product_name)}</div>
        </div>
        ${item.modifiers_text ? `<div class="sub">Modifier: ${escapeHtml(item.modifiers_text)}</div>` : ""}
        ${item.notes ? `<div class="sub note">Note: ${escapeHtml(item.notes)}</div>` : ""}
      </div>
    `
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 0; }
        html, body {
          margin: 0;
          padding: 0;
          width: 3in;
          font-family: Arial, sans-serif;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          padding: 0.10in;
          font-size: 12px;
          line-height: 1.25;
        }
        .center { text-align: center; }
        .logo {
          max-width: 1.35in;
          max-height: 0.55in;
          object-fit: contain;
          display: block;
          margin: 0 auto 6px;
        }
        .brand {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 2px;
        }
        .tag {
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: 0.03em;
        }
        .meta {
          font-size: 11px;
          margin-bottom: 2px;
        }
        .rule {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .item {
          padding: 8px 0;
          border-bottom: 1px dashed #000;
        }
        .item-top {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .qty {
          min-width: 30px;
          font-size: 18px;
          font-weight: 800;
          line-height: 1.1;
        }
        .name {
          flex: 1;
          font-size: 19px;
          font-weight: 800;
          line-height: 1.08;
          text-transform: uppercase;
        }
        .sub {
          margin-top: 4px;
          padding-left: 38px;
          font-size: 12px;
          line-height: 1.2;
        }
        .note {
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div class="center">
        ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ""}
        <div class="brand">${businessName}</div>
        <div class="tag">KITCHEN TICKET</div>
        <div class="meta"><strong>${escapeHtml(order.order_number)}</strong></div>
        <div class="meta">${escapeHtml(new Date(order.created_at).toLocaleString())}</div>
        ${order.customer_name ? `<div class="meta">${escapeHtml(order.customer_name || "")}</div>` : ""}
      </div>

      <div class="rule"></div>

      ${items}
    </body>
  </html>`;
}

export function buildStickerHtml(stickers: DrinkStickerInput[], logoDataUrl?: string) {
  const pages = stickers
    .map(
      (s) => `
    <div class="label">
      <div class="top">
        <div class="customer">${escapeHtml(s.customerName || "Guest")}</div>
        <div class="count">${escapeHtml(s.countLabel)}</div>
      </div>

      <div class="drink">${escapeHtml(s.drinkName)}</div>

      ${s.modifiers ? `<div class="small modifier">${escapeHtml(s.modifiers)}</div>` : ""}
      ${s.notes ? `<div class="small note">${escapeHtml(s.notes)}</div>` : ""}

      <div class="bottom">${escapeHtml(s.orderNumber)}</div>
    </div>
  `
    )
    .join('<div class="page-break"></div>');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: 2in 1in; margin: 0.03in; }
        html, body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body { margin: 0; }
        .label {
          width: 1.94in;
          height: 0.94in;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.025in 0.035in;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 3px;
        }
        .customer {
          font-size: 10px;
          font-weight: 800;
          line-height: 1.0;
          max-width: 1.15in;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .count {
          font-size: 9px;
          font-weight: 800;
          line-height: 1.0;
          white-space: nowrap;
        }
        .drink {
          font-size: 10px;
          font-weight: 800;
          line-height: 1.0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.01in;
        }
        .small {
          font-size: 6px;
          line-height: 1.0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
        }
        .modifier {
          font-weight: 700;
        }
        .note {
          font-style: italic;
        }
        .bottom {
          font-size: 6px;
          line-height: 1.0;
          font-weight: 700;
          margin-top: 1px;
        }
        .page-break {
          page-break-before: always;
        }
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
  const drinkItems = order.items.filter(
    (item) => String(item.product_type || "").toLowerCase() === "drink"
  );

  const expanded: DrinkStickerInput[] = [];
  const totalDrinkCount = drinkItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

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

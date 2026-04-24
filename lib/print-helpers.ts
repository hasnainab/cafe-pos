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

export function buildReceiptHtml(order: PosOrder, logoDataUrl?: string) {
  const businessName = escapeHtml(order.business_name || "Spill The Tea");
  const businessTagline = escapeHtml(order.business_tagline || "Cafe • Coffee • Tea • Mocktails");
  const businessPhone = escapeHtml(order.business_phone || "");
  const businessAddress = escapeHtml(order.business_address || "");
  const logo = logoDataUrl || order.logo_data_url || "";

  const items = order.items
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal =
        item.line_total != null ? Number(item.line_total || 0) : quantity * unitPrice;

      return `
        <tr class="item-row">
          <td class="item-name-cell">
            <div class="item-name">${escapeHtml(item.product_name)}</div>
            <div class="item-meta">Qty ${quantity}${item.unit_price != null ? ` • ${money(unitPrice)} each` : ""}</div>
            ${item.modifiers_text ? `<div class="item-sub">Modifier: ${escapeHtml(item.modifiers_text)}</div>` : ""}
            ${item.notes ? `<div class="item-sub">Note: ${escapeHtml(item.notes)}</div>` : ""}
          </td>
          <td class="amount-cell">${money(lineTotal)}</td>
        </tr>
      `;
    })
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
          padding: 0.10in 0.10in 0.12in;
          font-size: 11px;
          line-height: 1.25;
        }
        .center { text-align: center; }
        .logo {
          max-width: 1.5in;
          max-height: 0.65in;
          object-fit: contain;
          display: block;
          margin: 0 auto 6px;
        }
        .brand {
          font-size: 18px;
          font-weight: 800;
          line-height: 1.05;
          margin-bottom: 2px;
        }
        .tagline {
          font-size: 10px;
          color: #333;
          margin-bottom: 6px;
        }
        .contact {
          font-size: 9px;
          color: #333;
          line-height: 1.3;
          margin-bottom: 8px;
        }
        .rule {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 3px;
          font-size: 10px;
        }
        .meta-label {
          color: #333;
          min-width: 70px;
        }
        .meta-value {
          text-align: right;
          font-weight: 700;
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
        }
        .head-row td {
          font-size: 10px;
          font-weight: 700;
          padding: 0 0 4px;
        }
        .head-row td:last-child {
          text-align: right;
        }
        .item-row td {
          vertical-align: top;
          padding: 4px 0;
        }
        .item-name {
          font-size: 12px;
          font-weight: 700;
          line-height: 1.2;
        }
        .item-meta {
          font-size: 10px;
          color: #333;
          margin-top: 1px;
        }
        .item-sub {
          font-size: 9px;
          color: #444;
          margin-top: 2px;
          line-height: 1.2;
        }
        .amount-cell {
          text-align: right;
          white-space: nowrap;
          font-weight: 700;
          padding-left: 8px;
        }
        .totals {
          margin-top: 8px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 11px;
        }
        .grand-total {
          font-size: 14px;
          font-weight: 800;
          margin-top: 4px;
        }
        .payment {
          margin-top: 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .footer-note {
          margin-top: 10px;
          text-align: center;
          font-size: 10px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="center">
        ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ""}
        <div class="brand">${businessName}</div>
        <div class="tagline">${businessTagline}</div>
        ${
          businessPhone || businessAddress
            ? `<div class="contact">
                ${businessPhone ? `<div>${businessPhone}</div>` : ""}
                ${businessAddress ? `<div>${businessAddress}</div>` : ""}
              </div>`
            : ""
        }
      </div>

      <div class="rule"></div>

      <div class="meta-row">
        <div class="meta-label">Order No</div>
        <div class="meta-value">${escapeHtml(order.order_number)}</div>
      </div>
      <div class="meta-row">
        <div class="meta-label">Date/Time</div>
        <div class="meta-value">${escapeHtml(new Date(order.created_at).toLocaleString())}</div>
      </div>
      ${
        order.customer_name
          ? `<div class="meta-row">
              <div class="meta-label">Customer</div>
              <div class="meta-value">${escapeHtml(order.customer_name || "")}</div>
            </div>`
          : ""
      }

      <div class="rule"></div>

      <table>
        <tr class="head-row">
          <td>Item</td>
          <td>Amount</td>
        </tr>
        ${items}
      </table>

      <div class="rule"></div>

      <div class="totals">
        <div class="total-row">
          <div>Subtotal</div>
          <div>${money(order.subtotal)}</div>
        </div>
        <div class="total-row">
          <div>Tax</div>
          <div>${money(order.tax_total)}</div>
        </div>
        <div class="total-row grand-total">
          <div>Total</div>
          <div>${money(order.total)}</div>
        </div>
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
          padding: 0.04in 0.05in;
        }
        .top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4px;
        }
        .customer {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.0;
          max-width: 1.18in;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .count {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.0;
          white-space: nowrap;
        }
        .drink {
          font-size: 13px;
          font-weight: 800;
          line-height: 1.0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 0.02in;
        }
        .small {
          font-size: 8px;
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
          font-size: 8px;
          line-height: 1.0;
          font-weight: 700;
          margin-top: 2px;
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
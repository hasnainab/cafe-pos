"use client";

type Props = {
  order: any;
  mounted: boolean;
  ageSeconds: number;
  formatDurationFromSeconds: (seconds: number) => string;
  onDetails: () => void;
  onReady: () => void;
  onCollected: () => void;
};

function getTimerStyle(ageSeconds: number, status: string) {
  if (status === "Ready") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (ageSeconds >= 600) return "bg-red-50 text-red-700 border-red-100";
  if (ageSeconds >= 300) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-rose-50 text-rose-700 border-rose-100";
}

function getStatusLabel(order: any) {
  if (order.status === "Ready") return "Ready for pickup";
  if (order.status === "Preparing") return "Preparing";
  return String(order.status || "Open");
}

export default function ActiveOrderQueueCard({
  order,
  mounted,
  ageSeconds,
  formatDurationFromSeconds,
  onDetails,
  onReady,
  onCollected,
}: Props) {
  const timerStyle = getTimerStyle(ageSeconds, String(order.status || ""));
  const previewItems = Array.isArray(order.items) ? order.items.slice(0, 2) : [];
  const remainingItems = Array.isArray(order.items) ? Math.max(0, order.items.length - previewItems.length) : 0;

  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-3 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-rose-950">{order.customer?.name || "Guest"}</div>
          <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-rose-700/70">
            {order.order_number}
          </div>
          <div className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
            {getStatusLabel(order)}
          </div>
        </div>

        <div className={`shrink-0 rounded-xl border px-3 py-2 text-right ${timerStyle}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Timer</div>
          <div className="text-sm font-black leading-5">{mounted ? formatDurationFromSeconds(ageSeconds) : "-"}</div>
        </div>
      </div>

      <div className="mt-3 space-y-1 rounded-xl bg-rose-50/70 p-2 text-[11px] text-rose-900">
        {previewItems.length === 0 ? (
          <div className="text-rose-700/70">No item details</div>
        ) : (
          previewItems.map((item: any, index: number) => (
            <div key={`${order.id}-${index}`} className="flex justify-between gap-2">
              <span className="truncate">{item.product_name}</span>
              <span className="font-semibold">x{Number(item.quantity || 0)}</span>
            </div>
          ))
        )}
        {remainingItems > 0 ? <div className="font-medium text-rose-700/70">+ {remainingItems} more item(s)</div> : null}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onDetails}
          className="flex-1 rounded-lg border border-rose-200 bg-white px-2 py-2 text-[11px] font-medium text-rose-700 hover:bg-rose-50"
        >
          Details
        </button>

        {order.status === "Ready" ? (
          <button onClick={onCollected} className="flex-1 rounded-lg bg-emerald-500 px-2 py-2 text-[11px] font-semibold text-white">
            Complete
          </button>
        ) : (
          <button onClick={onReady} className="flex-1 rounded-lg bg-rose-500 px-2 py-2 text-[11px] font-semibold text-white">
            Ready
          </button>
        )}
      </div>
    </div>
  );
}

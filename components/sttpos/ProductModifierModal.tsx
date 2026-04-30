"use client";

import type { Dispatch, SetStateAction } from "react";

type Modifier = {
  id: number;
  name: string;
  price_delta: number;
  active?: boolean | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
};

type Props = {
  product: Product;
  modifiers: Modifier[];
  selectedModifierIds: number[];
  setSelectedModifierIds: Dispatch<SetStateAction<number[]>>;
  lineNotes: string;
  setLineNotes: Dispatch<SetStateAction<string>>;
  onAddToCart: () => void;
  onClose: () => void;
  formatCurrency: (value: number) => string;
};

function getModifierGroup(name: string) {
  const n = name.toLowerCase();
  if (n.includes("sugar") || n.includes("sweet")) return "Sugar Level";
  if (n.includes("ice")) return "Ice Level";
  if (n.includes("milk") || n.includes("oat") || n.includes("almond") || n.includes("soy")) return "Milk / Base";
  if (
    n.includes("shot") ||
    n.includes("boba") ||
    n.includes("cream") ||
    n.includes("syrup") ||
    n.includes("topping") ||
    n.includes("extra")
  ) {
    return "Add-ons";
  }
  if (n.includes("hot") || n.includes("cold") || n.includes("blend")) return "Drink Style";
  return "Other Modifiers";
}

const groupOrder = ["Sugar Level", "Ice Level", "Milk / Base", "Drink Style", "Add-ons", "Other Modifiers"];

export default function ProductModifierModal({
  product,
  modifiers,
  selectedModifierIds,
  setSelectedModifierIds,
  lineNotes,
  setLineNotes,
  onAddToCart,
  onClose,
  formatCurrency,
}: Props) {
  const groupedModifiers = groupOrder
    .map((groupName) => ({
      groupName,
      items: modifiers.filter((modifier) => getModifierGroup(modifier.name) === groupName),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/20 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-3xl font-bold text-rose-950">{product.name}</h3>
            <div className="mt-1 text-sm text-rose-700/70">{formatCurrency(product.price)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium">Modifiers</div>
            {groupedModifiers.length > 0 ? (
              <div className="space-y-4">
                {groupedModifiers.map((group) => (
                  <section key={group.groupName} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700/80">
                      {group.groupName}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.items.map((mod) => {
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
                              {Number(mod.price_delta || 0) === 0 ? "No charge" : formatCurrency(mod.price_delta)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700/70">
                No modifiers are linked to this product yet. Go to Setup and add modifiers to this product.
              </div>
            )}
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
              onClick={onAddToCart}
              className="rounded-xl bg-rose-500 px-5 py-3 text-sm font-medium text-white"
            >
              Add to Cart
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-rose-200 px-5 py-3 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

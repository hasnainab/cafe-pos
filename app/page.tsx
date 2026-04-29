"use client";

import dynamic from "next/dynamic";

const STTPosClient = dynamic(() => import("../components/sttpos/STTPosClient"), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-rose-50 p-6 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-500">Spill The Tea POS</p>
        <h1 className="mt-2 text-2xl font-bold">Loading POS...</h1>
        <p className="mt-2 text-sm text-slate-600">Preparing products, orders, inventory, and staff access.</p>
      </div>
    </main>
  ),
});

export default function Page() {
  return <STTPosClient />;
}

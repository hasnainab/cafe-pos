"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseAuth } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatusMessage("");

    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log("LOGIN RESPONSE:", data);
      console.log("LOGIN ERROR:", error);

      if (error) {
        setStatusMessage(error.message);
        setLoading(false);
        return;
      }

      console.log("SIGNED IN SUCCESSFULLY");
      console.log("SIGNED IN USER ID:", data?.user?.id);
      console.log("SIGNED IN EMAIL:", data?.user?.email);
      console.log("SIGNED IN SESSION:", data?.session);

      setStatusMessage("Sign in successful. Redirecting...");

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("LOGIN EXCEPTION:", err);
      setStatusMessage(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-rose-50 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-rose-100 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-rose-950">
          Spill The Tea POS
        </h1>
        <p className="mt-4 text-lg text-rose-500">Staff Login</p>

        <form onSubmit={handleSignIn} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-rose-400"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-rose-400"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-rose-500 px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {statusMessage ? (
          <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {statusMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}

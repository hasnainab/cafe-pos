import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local"
  );
}

export const supabaseAuth = createClient(supabaseUrl, supabaseKey);

export type StaffRole = "admin" | "manager" | "cashier";

export type StaffProfile = {
  id: string;
  full_name: string | null;
  role: StaffRole;
  pin_code?: string | null;
  active?: boolean | null;
  is_active?: boolean | null;
};
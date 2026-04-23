import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type AllowedRole = "admin" | "manager" | "cashier";

function normalizeRole(role: string): AllowedRole {
  if (role === "admin" || role === "manager" || role === "cashier") return role;
  return "cashier";
}

export async function GET(_request: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from("staff_profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const emailById = new Map<string, string>();
  const lastSignInById = new Map<string, string | null>();

  for (const user of authUsers.users) {
    emailById.set(user.id, user.email ?? "");
    lastSignInById.set(user.id, user.last_sign_in_at ?? null);
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    email: emailById.get(row.id) ?? "",
    last_sign_in_at: lastSignInById.get(row.id) ?? null,
  }));

  return NextResponse.json({ rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.full_name ?? "").trim();
  const password = String(body.password ?? "");
  const role = normalizeRole(String(body.role ?? "cashier"));
  const isActive = body.is_active !== false;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const createResult = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
    },
  });

  if (createResult.error || !createResult.data.user) {
    return NextResponse.json(
      { error: createResult.error?.message ?? "Could not create auth user" },
      { status: 400 }
    );
  }

  const userId = createResult.data.user.id;

  const { error: profileError } = await supabaseAdmin.from("staff_profiles").upsert({
    id: userId,
    full_name: fullName,
    role,
    is_active: isActive,
  });

  if (profileError) {
    return NextResponse.json(
      { error: `Auth user created, but profile save failed: ${profileError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    row: {
      id: userId,
      email,
      full_name: fullName,
      role,
      is_active: isActive,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const id = String(body.id ?? "");
  const fullName = String(body.full_name ?? "").trim();
  const role = normalizeRole(String(body.role ?? "cashier"));
  const isActive = body.is_active !== false;

  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin
    .from("staff_profiles")
    .update({
      full_name: fullName,
      role,
      is_active: isActive,
    })
    .eq("id", id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

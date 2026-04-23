import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

type AllowedRole = "admin" | "manager" | "cashier";

function normalizeRole(role: string): AllowedRole {
  if (role === "admin" || role === "manager" || role === "cashier") return role;
  return "cashier";
}

async function getRequestingUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { error: "Missing auth token" };
  }

  const supabaseServer = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData.user) {
    return { error: "Invalid session" };
  }

  const { data: profile, error: profileError } = await supabaseServer
    .from("staff_profiles")
    .select("id, role, is_active")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile || profile.is_active === false) {
    return { error: "Staff profile not found or inactive" };
  }

  return { user: userData.user, profile };
}

function isAdmin(role: string | null | undefined) {
  return role === "admin";
}

export async function GET(request: NextRequest) {
  const actor = await getRequestingUser(request);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: 401 });
  }

  if (!isAdmin(actor.profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

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
  const actor = await getRequestingUser(request);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: 401 });
  }

  if (!isAdmin(actor.profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

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
  const actor = await getRequestingUser(request);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: 401 });
  }

  if (!isAdmin(actor.profile.role)) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

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

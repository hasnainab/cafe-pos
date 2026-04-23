import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(request: NextRequest) {
  const actor = await getRequestingUser(request);
  if ("error" in actor) {
    return NextResponse.json({ error: actor.error }, { status: 401 });
  }

  if (actor.profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const supabaseServer = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabaseServer.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

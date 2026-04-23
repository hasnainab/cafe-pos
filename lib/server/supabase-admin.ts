import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url) {
    return NextResponse.json({ error: "Missing NEXT_PUBLIC_SUPABASE_URL" }, { status: 500 });
  }

  if (!key) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const supabaseAdmin = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await supabaseAdmin.auth.admin.listUsers();

  if (result.error) {
    return NextResponse.json(
      {
        error: result.error.message,
        url,
        key_prefix: key.slice(0, 12),
        key_length: key.length,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    url,
    key_prefix: key.slice(0, 12),
    key_length: key.length,
    user_count: result.data.users.length,
  });
}

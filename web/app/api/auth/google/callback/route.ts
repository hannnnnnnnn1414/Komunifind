import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { homeForRole, SESSION_COOKIE } from "@/lib/session";
import type { SessionUser } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("kf_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/login?error=state_mismatch", request.url));
  }
  store.delete("kf_oauth_state");
  const nextPath = store.get("kf_oauth_next")?.value ?? "";
  store.delete("kf_oauth_next");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=oauth_not_configured", request.url));
  }

  const redirect = process.env.GOOGLE_REDIRECT_URI ?? `${url.origin}/api/auth/google/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=token_exchange", request.url));
  }
  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  if (!tokenJson.id_token) {
    return NextResponse.redirect(new URL("/login?error=no_id_token", request.url));
  }

  try {
    const session = await apiFetch<{ token: string; user: SessionUser }>("/api/v1/auth/google", {
      method: "POST",
      body: { idToken: tokenJson.id_token },
    });
    store.set(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    const destination =
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : homeForRole(session.user.role);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}

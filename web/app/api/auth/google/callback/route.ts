import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { issueToken } from "@/lib/auth";
import { verifyGoogleIdToken } from "@/lib/google";
import { homeForRole, SESSION_COOKIE } from "@/lib/session";
import { upsertGoogleUser } from "@/lib/store/users";

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
    const identity = await verifyGoogleIdToken(tokenJson.id_token);
    const user = await upsertGoogleUser(identity.sub, identity.email, identity.name, identity.picture);
    const token = await issueToken(user.id, user.role, user.communityId);
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });
    const destination =
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : homeForRole(user.role);
    return NextResponse.redirect(new URL(destination, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  }
}

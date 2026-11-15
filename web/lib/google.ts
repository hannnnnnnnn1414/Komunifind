import { OAuth2Client } from "google-auth-library";

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture: string;
};

export async function verifyGoogleIdToken(token: string): Promise<GoogleIdentity> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: token, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("google token missing sub/email");
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name ?? "",
    picture: payload.picture ?? "",
  };
}

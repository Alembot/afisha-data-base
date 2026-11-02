// Narrow user-authorized browser route; server policy is injected privately at deployment.
// Never put SUPABASE_SERVICE_ROLE_KEY in the static frontend.
import { deploymentAllowedUserIds } from "./server-policy.ts";
const ALLOWED_ORIGINS = new Set(["https://alembot.github.io"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 8192;
type Settings = { url: string; serviceKey: string; allowedUserIds: string[] };
type Fetcher = typeof fetch;

export function createHandler(settings: Settings, fetcher: Fetcher = fetch) {
  const approvedUserIds = new Set(settings.allowedUserIds);
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") || "";
    const cors: Record<string, string> = ALLOWED_ORIGINS.has(origin) ? {
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "vary": "Origin",
    } : {};
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
      status, headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
    });
    // CORS is not the auth boundary. Missing/non-browser Origin is also denied here.
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!settings.url || !settings.serviceKey) return json({ error: "service_unavailable" }, 503);
    const auth = request.headers.get("authorization") || "";
    if (!/^Bearer\s+\S+$/i.test(auth)) return json({ error: "unauthorized" }, 401);
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json"))
      return json({ error: "json_required" }, 415);
    let payload: Record<string, unknown>;
    try {
      const reader = request.body?.getReader();
      if (!reader) return json({ error: "invalid_json" }, 400);
      const chunks: Uint8Array[] = []; let length = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.byteLength;
        if (length > MAX_BODY_BYTES) { await reader.cancel(); return json({ error: "payload_too_large" }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      payload = JSON.parse(new TextDecoder().decode(bytes));
      if (!payload || Array.isArray(payload) || typeof payload !== "object") return json({ error: "invalid_payload" }, 400);
    } catch { return json({ error: "invalid_json" }, 400); }
    const { action, event_id, program_features } = payload;
    if ((action !== "read" && action !== "save") || typeof event_id !== "string" || !UUID.test(event_id))
      return json({ error: "invalid_payload" }, 400);
    const keys = action === "save" ? ["action", "event_id", "program_features"] : ["action", "event_id"];
    if (Object.keys(payload).some(k => !keys.includes(k))) return json({ error: "unexpected_field" }, 400);
    if (action === "save" && (!Array.isArray(program_features) || program_features.length > 32 ||
        program_features.some(code => typeof code !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(code))))
      return json({ error: "invalid_program_features" }, 400);
    try {
      // Auth server verifies the actual bearer user token; do not decode or trust browser metadata.
      const userResponse = await fetcher(`${settings.url}/auth/v1/user`, {
        headers: { apikey: settings.serviceKey, authorization: auth },
      });
      if (!userResponse.ok) return json({ error: "unauthorized" }, 401);
      const user = await userResponse.json();
      if (typeof user?.id !== "string" || !approvedUserIds.has(user.id) ||
          !user.email_confirmed_at || user.is_anonymous === true)
        return json({ error: "forbidden" }, 403);
      const serviceHeaders = { apikey: settings.serviceKey, authorization: `Bearer ${settings.serviceKey}`, "content-type": "application/json" };
      const eventResponse = await fetcher(`${settings.url}/rest/v1/events?select=public_id&id=eq.${encodeURIComponent(event_id)}`, { headers: serviceHeaders });
      if (!eventResponse.ok) return json({ error: "database_unavailable" }, 502);
      const events = await eventResponse.json();
      if (!Array.isArray(events) || events.length !== 1 || typeof events[0].public_id !== "string")
        return json({ error: "event_not_found" }, 404);
      const publicId = events[0].public_id;
      // Fixed RPC names/payloads only: never forward a generic caller-controlled patch.
      const refsResponse = await fetcher(`${settings.url}/rest/v1/rpc/events_refs`, {
        method: "POST", headers: serviceHeaders, body: "{}",
      });
      if (!refsResponse.ok) return json({ error: "catalog_unavailable" }, 502);
      const refs = await refsResponse.json();
      if (!Array.isArray(refs?.program_features) || refs.program_features.length === 0)
        return json({ error: "catalog_unavailable" }, 503);
      const rpc = action === "save" ? "events_save" : "events_card";
      const args = action === "save" ? { p: { id: publicId, set: { program_features } } } : { p_id: publicId };
      const cardResponse = await fetcher(`${settings.url}/rest/v1/rpc/${rpc}`, {
        method: "POST", headers: serviceHeaders, body: JSON.stringify(args),
      });
      if (!cardResponse.ok) {
        const error = await cardResponse.json().catch(() => ({}));
        return error?.code === "22023" ? json({ error: "invalid_program_features" }, 422) : json({ error: "database_write_or_read_failed" }, 502);
      }
      const result = await cardResponse.json(); const card = action === "save" ? result?.card : result;
      if (!card || !Array.isArray(card.program_features) || !Array.isArray(card.program_feature_details))
        return json({ error: "invalid_server_response" }, 502);
      return json({
        catalog: refs.program_features.map((f: Record<string, unknown>) => ({ code: f.code, name: f.name, is_active: f.is_active })),
        program_features: card.program_features,
        program_feature_details: card.program_feature_details.map((f: Record<string, unknown>) => ({ code: f.code, name: f.name, is_active: f.is_active })),
        ...(action === "save" ? { changed: result.changed } : {}),
      });
    } catch { return json({ error: "upstream_unavailable" }, 502); }
  };
}

Deno.serve(createHandler({
  url: Deno.env.get("SUPABASE_URL") || "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  allowedUserIds: deploymentAllowedUserIds,
}));

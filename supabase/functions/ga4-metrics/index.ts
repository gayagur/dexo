import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  create,
  getNumericDate,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ─── Helpers ──────────────────────────────────────────────

/** Import a PEM private key for RS256 signing */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/** Create a signed JWT and exchange it for a Google access token */
async function getAccessToken(
  serviceAccountKey: { client_email: string; private_key: string },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPrivateKey(serviceAccountKey.private_key);

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccountKey.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    key,
  );

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error("[ga4] Token exchange failed:", tokenData);
    throw new Error("Failed to obtain access token");
  }

  return tokenData.access_token;
}

/** Call GA4 Data API runReport */
async function runReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<any> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ga4] runReport failed (${res.status}):`, text);
    throw new Error(`GA4 API error: ${res.status}`);
  }

  return res.json();
}

/** Extract a single metric total from a simple report */
function extractTotal(report: any): number {
  return parseInt(report?.rows?.[0]?.metricValues?.[0]?.value ?? "0", 10);
}

/** Format seconds into "Xm Ys" */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Main Handler ─────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify the caller is an admin
    const { userId, supabase } = await verifyAuth(req);

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (!profile?.is_admin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Load service account credentials
    const serviceAccountJson = Deno.env.get("GA_SERVICE_ACCOUNT_KEY");
    const propertyId = Deno.env.get("GA_PROPERTY_ID");

    if (!serviceAccountJson || !propertyId) {
      return new Response(
        JSON.stringify({
          error: "GA4 not configured",
          hint: "Set GA_SERVICE_ACCOUNT_KEY and GA_PROPERTY_ID in Supabase secrets",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let serviceAccountKey: { client_email: string; private_key: string };
    try {
      serviceAccountKey = JSON.parse(serviceAccountJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid GA_SERVICE_ACCOUNT_KEY JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. Get access token
    const accessToken = await getAccessToken(serviceAccountKey);

    // 4. Run all reports in parallel
    const [
      activeUsersToday,
      activeUsersWeek,
      pageViewsReport,
      sessionDurationReport,
      bounceRateReport,
      topSourcesReport,
      topPagesReport,
      newVsReturningReport,
    ] = await Promise.all([
      // Active users today
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
      // Active users this week
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
      // Page views last 7 days
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "screenPageViews" }],
      }),
      // Average session duration
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "averageSessionDuration" }],
      }),
      // Bounce rate
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "bounceRate" }],
      }),
      // Top sources
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
      // Top pages
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5,
      }),
      // New vs returning users
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    // 5. Parse results
    const avgSessionSec = parseFloat(
      sessionDurationReport?.rows?.[0]?.metricValues?.[0]?.value ?? "0",
    );
    const bounceRateVal = parseFloat(
      bounceRateReport?.rows?.[0]?.metricValues?.[0]?.value ?? "0",
    );

    // Top sources
    const topSources = (topSourcesReport?.rows ?? []).map((row: any) => ({
      source: row.dimensionValues[0].value || "(direct)",
      sessions: parseInt(row.metricValues[0].value, 10),
    }));

    // Top pages
    const topPages = (topPagesReport?.rows ?? []).map((row: any) => ({
      path: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value, 10),
    }));

    // New vs returning
    let newUsers = 0;
    let returningUsers = 0;
    for (const row of newVsReturningReport?.rows ?? []) {
      const type = row.dimensionValues[0].value;
      const count = parseInt(row.metricValues[0].value, 10);
      if (type === "new") newUsers = count;
      else if (type === "returning") returningUsers = count;
    }

    const result = {
      activeUsersToday: extractTotal(activeUsersToday),
      activeUsersWeek: extractTotal(activeUsersWeek),
      pageViews7d: extractTotal(pageViewsReport),
      avgSessionDuration: formatDuration(avgSessionSec),
      bounceRate: `${Math.round(bounceRateVal * 100)}%`,
      topSources,
      topPages,
      newUsers,
      returningUsers,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[ga4-metrics] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

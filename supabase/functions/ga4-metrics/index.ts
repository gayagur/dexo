import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.2.0";

// ─── Helpers ──────────────────────────────────────────────

/** Create a signed JWT and exchange it for a Google access token */
async function getAccessToken(
  serviceAccountKey: { client_email: string; private_key: string },
): Promise<string> {
  const privateKey = await importPKCS8(
    serviceAccountKey.private_key,
    "RS256",
  );

  const jwt = await new SignJWT({
    iss: serviceAccountKey.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

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
    console.error("[ga4] Token exchange failed:", JSON.stringify(tokenData));
    throw new Error(
      `Failed to obtain access token: ${tokenData.error_description || tokenData.error || "unknown"}`,
    );
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
  console.log("[ga4] runReport URL:", url);

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
    // Parse the Google error for details
    let detail = `GA4 API error: ${res.status}`;
    try {
      const errBody = JSON.parse(text);
      const msg = errBody?.error?.message || "";
      const status = errBody?.error?.status || "";
      detail = `GA4 API ${res.status} (${status}): ${msg}`;
      console.error("[ga4] Error details:", JSON.stringify(errBody?.error, null, 2));
    } catch { /* use default */ }
    throw new Error(detail);
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
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Load service account credentials
    const serviceAccountJson = Deno.env.get("GA_SERVICE_ACCOUNT_KEY");
    const propertyId = Deno.env.get("GA_PROPERTY_ID");

    if (!serviceAccountJson || !propertyId) {
      return new Response(
        JSON.stringify({
          error: "GA4 not configured",
          hint:
            "Set GA_SERVICE_ACCOUNT_KEY and GA_PROPERTY_ID in Supabase secrets",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let serviceAccountKey: { client_email: string; private_key: string };
    try {
      serviceAccountKey = JSON.parse(serviceAccountJson);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid GA_SERVICE_ACCOUNT_KEY JSON" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Log config for debugging
    console.log("[ga4] Service account email:", serviceAccountKey.client_email);
    console.log("[ga4] Property ID:", propertyId);
    console.log("[ga4] Property ID type:", typeof propertyId, "length:", propertyId.length);

    // 4. Get access token
    console.log("[ga4] Requesting access token...");
    const accessToken = await getAccessToken(serviceAccountKey);
    console.log("[ga4] Access token obtained, length:", accessToken.length);

    // 5. Test access with a single report first to get clear error message
    console.log("[ga4] Testing API access with single report...");
    try {
      await runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      });
      console.log("[ga4] Test report succeeded!");
    } catch (testErr: any) {
      console.error("[ga4] Test report FAILED:", testErr.message);

      // List accessible properties and return full debug info to the client
      let accessibleProperties = "Could not list";
      try {
        const listRes = await fetch(
          "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const listBody = await listRes.json();
        console.log("[ga4] Accessible:", JSON.stringify(listBody, null, 2));

        if (listBody.accountSummaries) {
          const props: string[] = [];
          for (const acct of listBody.accountSummaries) {
            for (const ps of acct.propertySummaries ?? []) {
              props.push(`${ps.displayName} (${ps.property?.replace("properties/", "")})`);
            }
          }
          accessibleProperties = props.length > 0 ? props.join(", ") : "None found";
        } else if (listBody.error) {
          accessibleProperties = `API error: ${listBody.error.message}`;
        } else {
          accessibleProperties = "No accounts returned";
        }
      } catch (listErr: any) {
        accessibleProperties = `List failed: ${listErr.message}`;
      }

      return new Response(
        JSON.stringify({
          error: testErr.message,
          debug: {
            propertyId,
            serviceAccount: serviceAccountKey.client_email,
            accessibleProperties,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Run all reports in parallel
    console.log("[ga4] Running all 8 reports...");
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
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "today", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "screenPageViews" }],
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "averageSessionDuration" }],
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "bounceRate" }],
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 5,
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [
          { metric: { metricName: "screenPageViews" }, desc: true },
        ],
        limit: 5,
      }),
      runReport(propertyId, accessToken, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "newVsReturning" }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);
    console.log("[ga4] All reports complete");

    // 5. Parse results
    const avgSessionSec = parseFloat(
      sessionDurationReport?.rows?.[0]?.metricValues?.[0]?.value ?? "0",
    );
    const bounceRateVal = parseFloat(
      bounceRateReport?.rows?.[0]?.metricValues?.[0]?.value ?? "0",
    );

    const topSources = (topSourcesReport?.rows ?? []).map((row: any) => ({
      source: row.dimensionValues[0].value || "(direct)",
      sessions: parseInt(row.metricValues[0].value, 10),
    }));

    const topPages = (topPagesReport?.rows ?? []).map((row: any) => ({
      path: row.dimensionValues[0].value,
      views: parseInt(row.metricValues[0].value, 10),
    }));

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
    console.error("[ga4-metrics] Error:", err.message, err.stack);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

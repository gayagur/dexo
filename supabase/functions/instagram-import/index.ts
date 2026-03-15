import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { instagramUrl } = await req.json();

    if (!instagramUrl || typeof instagramUrl !== "string") {
      return jsonResponse({ error: "instagramUrl is required" });
    }

    // Extract username from URL
    const username = extractUsername(instagramUrl);
    console.log("[ig-import] Extracted username:", username, "from:", instagramUrl);

    if (!username) {
      return jsonResponse({ error: "Invalid Instagram URL. Use a format like https://instagram.com/username" });
    }

    const apifyKey = Deno.env.get("APIFY_API_KEY");
    if (!apifyKey) {
      console.error("[ig-import] APIFY_API_KEY not set");
      return jsonResponse({
        error: "Instagram import is not configured. Set APIFY_API_KEY in Supabase secrets.",
      });
    }
    console.log("[ig-import] APIFY_API_KEY is set, length:", apifyKey.length);

    // Call Apify Instagram Profile Scraper (synchronous run)
    const apifyUrl =
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyKey}`;

    console.log("[ig-import] Calling Apify for username:", username);
    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: 6,
      }),
    });

    console.log("[ig-import] Apify response status:", apifyRes.status);

    if (!apifyRes.ok) {
      const errText = await apifyRes.text();
      console.error("[ig-import] Apify error:", apifyRes.status, errText);
      return jsonResponse({
        error: "Failed to fetch Instagram profile. Please try again later.",
        debug: { apifyStatus: apifyRes.status, apifyError: errText.slice(0, 500) },
      });
    }

    const apifyData = await apifyRes.json();
    console.log("[ig-import] Apify returned", Array.isArray(apifyData) ? apifyData.length : 0, "results");

    if (!Array.isArray(apifyData) || apifyData.length === 0) {
      console.error("[ig-import] Empty results. Raw:", JSON.stringify(apifyData).slice(0, 500));
      return jsonResponse({
        error: "We couldn't find this profile. Make sure it's public and try again.",
        debug: { rawType: typeof apifyData, isArray: Array.isArray(apifyData), length: Array.isArray(apifyData) ? apifyData.length : 0 },
      });
    }

    const profile = apifyData[0];
    console.log("[ig-import] Profile found:", profile.username, "| private:", profile.private, "| posts:", profile.latestPosts?.length ?? 0);

    // Check if profile is private
    if (profile.private) {
      return jsonResponse({ error: "This profile is private. Make it public and try again." });
    }

    // Use service role client for storage uploads (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Upload profile photo
    let profilePhotoUrl: string | null = null;
    const profilePicSrc = profile.profilePicUrlHD || profile.profilePicUrl;
    if (profilePicSrc) {
      profilePhotoUrl = await downloadAndUpload(
        serviceClient,
        profilePicSrc,
        `${userId}/ig-avatar-${Date.now()}.jpg`,
        "portfolio-images",
      );
    }

    // Upload recent post images (up to 6)
    const postImages: string[] = [];
    const posts = profile.latestPosts ?? [];
    for (const post of posts.slice(0, 6)) {
      const imgSrc = post.displayUrl || post.url;
      if (!imgSrc) continue;
      const uploaded = await downloadAndUpload(
        serviceClient,
        imgSrc,
        `${userId}/ig-post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
        "portfolio-images",
      );
      if (uploaded) postImages.push(uploaded);
    }

    console.log("[ig-import] Success! Photos uploaded:", postImages.length);

    return jsonResponse({
      fullName: profile.fullName || profile.username || "",
      bio: profile.biography || "",
      profilePhoto: profilePhotoUrl,
      portfolioImages: postImages,
      username: profile.username || username,
    });
  } catch (err: any) {
    console.error("[ig-import] Error:", err.message, err.stack);
    return jsonResponse({ error: err.message || "Something went wrong" });
  }
});

// ── Helpers ────────────────────────────────────────────

function extractUsername(url: string): string | null {
  const trimmed = url.trim();

  // Handle plain usernames (e.g. "corebeechat")
  if (/^[\w][\w.]{0,29}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("instagram.com")) return null;
    // Path like /username/ or /username
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const user = parts[0];
    // Ignore non-profile paths
    if (["p", "reel", "stories", "explore", "accounts"].includes(user)) return null;
    return user;
  } catch {
    return null;
  }
}

async function downloadAndUpload(
  supabase: ReturnType<typeof createClient>,
  imageUrl: string,
  path: string,
  bucket: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) {
      console.error("[ig-import] Image download failed:", res.status, imageUrl.slice(0, 100));
      return null;
    }
    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert: true });

    if (error) {
      console.error("[ig-import] Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    console.error("[ig-import] Download/upload error:", err.message);
    return null;
  }
}

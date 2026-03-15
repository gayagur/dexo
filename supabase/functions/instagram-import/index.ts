import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await verifyAuth(req);
    const { instagramUrl } = await req.json();

    if (!instagramUrl || typeof instagramUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "instagramUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract username from URL
    const username = extractUsername(instagramUrl);
    if (!username) {
      return new Response(
        JSON.stringify({ error: "Invalid Instagram URL. Use a format like https://instagram.com/username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apifyKey = Deno.env.get("APIFY_API_KEY");
    if (!apifyKey) {
      console.error("[instagram-import] APIFY_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Instagram import is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Apify Instagram Profile Scraper
    const apifyUrl =
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyKey}`;

    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames: [username],
        resultsLimit: 6,
      }),
    });

    if (!apifyRes.ok) {
      console.error("[instagram-import] Apify error:", apifyRes.status, await apifyRes.text());
      return new Response(
        JSON.stringify({ error: "Failed to fetch Instagram profile. Please try again later." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apifyData = await apifyRes.json();

    if (!Array.isArray(apifyData) || apifyData.length === 0) {
      return new Response(
        JSON.stringify({ error: "We couldn't find this profile. Make sure it's public and try again." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profile = apifyData[0];

    // Check if profile is private
    if (profile.private) {
      return new Response(
        JSON.stringify({ error: "This profile is private. Make it public and try again." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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

    return new Response(
      JSON.stringify({
        fullName: profile.fullName || profile.username || "",
        bio: profile.biography || "",
        profilePhoto: profilePhotoUrl,
        portfolioImages: postImages,
        username: profile.username || username,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[instagram-import] Error:", err.message);
    const status = err.message.includes("Invalid") || err.message.includes("Missing") ? 401 : 500;
    return new Response(
      JSON.stringify({ error: err.message || "Something went wrong" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// ── Helpers ────────────────────────────────────────────

function extractUsername(url: string): string | null {
  // Handle plain usernames
  if (/^[\w][\w.]{0,29}$/.test(url.trim())) return url.trim();

  try {
    const parsed = new URL(url.trim());
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
    if (!res.ok) return null;
    const blob = await res.blob();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert: true });

    if (error) {
      console.error("[instagram-import] Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (err: any) {
    console.error("[instagram-import] Download/upload error:", err.message);
    return null;
  }
}

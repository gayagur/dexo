import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}

// ─── Categories & styles the platform supports ────────
const CATEGORIES = [
  "Carpentry & Custom Woodworking",
  "Custom Furniture Design",
  "Furniture Restoration & Upcycling",
  "Kitchen & Dining Design",
  "Living Room Design & Styling",
  "Bedroom Design & Styling",
  "Home Office Design",
  "Bathroom Design",
  "Outdoor & Garden Design",
  "Lighting Design & Installation",
  "Wall Art & Gallery Walls",
  "Shelving & Storage Solutions",
  "Textile & Soft Furnishings",
  "Plants & Greenery Styling",
  "Storage & Organization Solutions",
  "Office Design & Ergonomics",
  "Full Interior Design (entire space)",
];

const STYLES = [
  "Minimalist", "Scandinavian", "Mid-Century Modern", "Bohemian",
  "Industrial", "Rustic", "Contemporary", "Traditional",
  "Art Deco", "Japandi", "Farmhouse", "Coastal",
];

// ─── Main Handler ─────────────────────────────────────
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

    const username = extractUsername(instagramUrl);
    console.log("[ig-import] Extracted username:", username, "from:", instagramUrl);

    if (!username) {
      return jsonResponse({ error: "Invalid Instagram URL. Use a format like https://instagram.com/username" });
    }

    const apifyKey = Deno.env.get("APIFY_API_KEY");
    if (!apifyKey) {
      console.error("[ig-import] APIFY_API_KEY not set");
      return jsonResponse({ error: "Instagram import is not configured. Set APIFY_API_KEY in Supabase secrets." });
    }

    // ─── 1. Call Apify ────────────────────────────────
    const apifyUrl =
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${apifyKey}`;

    console.log("[ig-import] Calling Apify for username:", username);
    const apifyRes = await fetch(apifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], resultsLimit: 12 }),
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
      return jsonResponse({ error: "We couldn't find this profile. Make sure it's public and try again." });
    }

    const profile = apifyData[0];

    // Log all available fields for debugging
    console.log("[ig-import] Profile keys:", Object.keys(profile).join(", "));
    console.log("[ig-import] Profile:", JSON.stringify({
      username: profile.username,
      fullName: profile.fullName,
      biography: profile.biography,
      externalUrl: profile.externalUrl,
      private: profile.private,
      followersCount: profile.followersCount,
      postsCount: profile.postsCount,
      latestPostsCount: profile.latestPosts?.length ?? 0,
    }));

    if (profile.private) {
      return jsonResponse({ error: "This profile is private. Make it public and try again." });
    }

    // ─── 2. Upload images ─────────────────────────────
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Profile photo
    let profilePhotoUrl: string | null = null;
    const profilePicSrc = profile.profilePicUrlHD || profile.profilePicUrl;
    if (profilePicSrc) {
      profilePhotoUrl = await downloadAndUpload(
        serviceClient, profilePicSrc,
        `${userId}/ig-avatar-${Date.now()}.jpg`, "portfolio-images",
      );
    }

    // Portfolio images (up to 6 most recent) with captions
    const portfolioItems: { url: string; caption: string }[] = [];
    const posts = profile.latestPosts ?? [];
    for (const post of posts.slice(0, 6)) {
      const imgSrc = post.displayUrl || post.url;
      if (!imgSrc) continue;
      const uploaded = await downloadAndUpload(
        serviceClient, imgSrc,
        `${userId}/ig-post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`,
        "portfolio-images",
      );
      if (uploaded) {
        portfolioItems.push({
          url: uploaded,
          caption: post.caption?.slice(0, 200) || "",
        });
      }
    }

    // ─── 3. AI suggestions from bio ───────────────────
    let aiSuggestions: Record<string, unknown> = {};
    const togetherKey = Deno.env.get("TOGETHER_API_KEY");
    const bio = profile.biography || "";

    if (togetherKey && (bio.length > 5 || profile.fullName)) {
      try {
        aiSuggestions = await getAiSuggestions(togetherKey, {
          username: profile.username || username,
          fullName: profile.fullName || "",
          bio,
          followersCount: profile.followersCount ?? 0,
          postsCount: profile.postsCount ?? 0,
        });
        console.log("[ig-import] AI suggestions:", JSON.stringify(aiSuggestions));
      } catch (err: any) {
        console.error("[ig-import] AI suggestions failed:", err.message);
      }
    }

    // ─── 4. Return everything ─────────────────────────
    const result = {
      // Direct from Instagram
      fullName: profile.fullName || profile.username || "",
      username: profile.username || username,
      bio: bio,
      profilePhoto: profilePhotoUrl,
      website: profile.externalUrl || null,
      location: profile.locationName || null,
      followersCount: profile.followersCount ?? null,
      postsCount: profile.postsCount ?? null,
      verified: profile.verified ?? false,
      // Uploaded portfolio with captions
      portfolioImages: portfolioItems.map((p) => p.url),
      portfolioCaptions: portfolioItems.map((p) => p.caption),
      // AI-suggested fields
      suggestedCategories: aiSuggestions.categories ?? [],
      suggestedStyles: aiSuggestions.styles ?? [],
      suggestedTagline: aiSuggestions.tagline ?? "",
      suggestedYearsExperience: aiSuggestions.yearsExperience ?? null,
    };

    console.log("[ig-import] Success! Portfolio:", portfolioItems.length, "AI:", !!togetherKey);
    return jsonResponse(result);
  } catch (err: any) {
    console.error("[ig-import] Error:", err.message, err.stack);
    return jsonResponse({ error: err.message || "Something went wrong" });
  }
});

// ─── AI Suggestions ───────────────────────────────────

async function getAiSuggestions(
  apiKey: string,
  profile: { username: string; fullName: string; bio: string; followersCount: number; postsCount: number },
): Promise<Record<string, unknown>> {
  const prompt = `You are helping auto-fill a creator profile on an interior design marketplace.

Given this Instagram profile:
- Name: ${profile.fullName}
- Username: @${profile.username}
- Bio: "${profile.bio}"
- Followers: ${profile.followersCount}
- Posts: ${profile.postsCount}

Available categories (pick 1-3 most relevant):
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Available styles (pick 1-4 most relevant):
${STYLES.join(", ")}

Respond in valid JSON only, no markdown. Format:
{
  "categories": ["category1", "category2"],
  "styles": ["style1", "style2"],
  "tagline": "A professional one-line tagline for their profile",
  "yearsExperience": null
}

Rules:
- Categories and styles MUST be exact matches from the lists above
- tagline should be professional, 5-10 words, based on their bio
- yearsExperience: extract a number if the bio mentions years of experience, otherwise null
- If the bio doesn't clearly relate to interior design, pick the closest categories anyway`;

  const res = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Together AI error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Extract JSON from response (handle possible markdown wrapping)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[ig-import] AI returned non-JSON:", content.slice(0, 300));
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    console.error("[ig-import] AI JSON parse failed:", jsonMatch[0].slice(0, 300));
    return {};
  }
}

// ─── Helpers ──────────────────────────────────────────

function extractUsername(url: string): string | null {
  const trimmed = url.trim();
  if (/^[\w][\w.]{0,29}$/.test(trimmed)) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname.includes("instagram.com")) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const user = parts[0];
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

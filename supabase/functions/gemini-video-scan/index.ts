import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  amazonLinks?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_GEMINI_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { productTitle, productAsin, productImageUrl, videos } = await req.json();

    if (!productTitle || !Array.isArray(videos) || videos.length === 0) {
      return new Response(
        JSON.stringify({ error: "productTitle and videos[] are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prepare a compact list to send to Gemini (text-only to avoid file uploads)
    const compactVideos: VideoItem[] = videos.map((v: any) => ({
      id: String(v.id),
      title: String(v.title || ""),
      description: String(v.description || ""),
      thumbnail: String(v.thumbnail || ""),
      channelTitle: String(v.channelTitle || ""),
      publishedAt: String(v.publishedAt || ""),
      url: String(v.url || ""),
      amazonLinks: Array.isArray(v.amazonLinks) ? v.amazonLinks.slice(0, 10) : [],
    }));

    const systemInstruction = `You are an expert at deciding whether a YouTube video likely SHOWS a specific product on-camera.
Given the product and a list of videos (title, description, channel, date, URL, and any Amazon links), rate for each video how likely it is that the product actually appears in the footage (not just mentioned).

Guidelines:
- Strong signals: the exact product name/model in the title, unboxing/review/comparison keywords, Amazon link that matches the product, clear mention of model numbers.
- Weak signals: generic gift guide/listicle without specific mention, vague descriptions, unrelated Amazon links.
- If product ASIN is provided, matching Amazon links are a very strong signal.
- If only the product title is provided, treat close variants and obvious abbreviations as matches.

Return ONLY compact JSON (no prose): an array of objects with fields:
{id, presenceScore, mentionsProduct, includesAmazonLinkToProduct, reason}
- presenceScore: number between 0 and 1
- mentionsProduct: boolean (title/description clearly reference the product/model)
- includesAmazonLinkToProduct: boolean (an Amazon link obviously for this product or its exact model/ASIN)
- reason: ONE short sentence justifying the score.
`;

    const userContent = {
      product: {
        title: productTitle,
        asin: productAsin || null,
        image: productImageUrl || null,
      },
      videos: compactVideos,
    };

    const prompt = `${systemInstruction}\nProduct:\n${productTitle}${productAsin ? ` (ASIN: ${productAsin})` : ""}\nVideos JSON:\n${JSON.stringify(compactVideos)}`;

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API error", errText);
      return new Response(
        JSON.stringify({ error: "Gemini API error", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();

    // Try to parse JSON content
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = String(text).trim().replace(/^```json\n?/i, "").replace(/```$/i, "");

    let results: any[] = [];
    try {
      results = JSON.parse(cleaned);
    } catch (e) {
      console.warn("Failed to parse JSON, returning empty results");
      results = [];
    }

    // Ensure default structure and clamp score
    const normalized = results.map((r) => ({
      id: String(r.id || ""),
      presenceScore: Math.max(0, Math.min(1, Number(r.presenceScore ?? 0))),
      mentionsProduct: Boolean(r.mentionsProduct),
      includesAmazonLinkToProduct: Boolean(r.includesAmazonLinkToProduct),
      reason: String(r.reason || ""),
    }));

    return new Response(JSON.stringify({ results: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gemini-video-scan error", err);
    return new Response(
      JSON.stringify({ error: "Internal error", detail: String(err?.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

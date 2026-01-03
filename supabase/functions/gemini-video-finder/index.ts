import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  channel: string;
  duration: string;
  description: string;
  platform: string;
  relevanceScore: number;
  aiReasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication - require Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        success: false 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Missing LOVABLE_API_KEY' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { productTitle, productAsin } = await req.json();

    if (!productTitle) {
      return new Response(JSON.stringify({ 
        error: 'productTitle is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Finding videos for product:', productTitle);

    // Step 1: Generate intelligent search queries using Lovable AI
    const searchQueries = await generateSearchQueries(productTitle, productAsin);
    console.log('Generated search queries:', searchQueries);

    // Step 2: Search YouTube for each query
    const allVideos = [];
    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
      const videos = await searchYouTubeVideos(query);
      allVideos.push(...videos);
    }

    // Step 3: Use Lovable AI to analyze and rank videos for relevance
    const rankedVideos = await analyzeVideoRelevance(productTitle, productAsin, allVideos);

    // Filter to only include videos with relevance score >= 60 (likely about this product)
    const relevantVideos = rankedVideos.filter(v => v.relevanceScore >= 60);

    console.log(`Filtered to ${relevantVideos.length} relevant videos (score >= 60) out of ${rankedVideos.length} total`);

    return new Response(JSON.stringify({
      success: true,
      videos: relevantVideos.slice(0, 8), // Return top 8 most relevant videos
      searchQueries: searchQueries,
      totalFound: allVideos.length,
      filteredCount: relevantVideos.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in video-finder:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSearchQueries(productTitle: string, productAsin?: string): Promise<string[]> {
  const prompt = `Generate 5 HIGHLY SPECIFIC YouTube search queries to find videos ONLY about this exact product: "${productTitle}"${productAsin ? ` (ASIN: ${productAsin})` : ''}

  CRITICAL: The queries MUST be specific to THIS EXACT product, not generic product categories.

  The queries should target:
  1. Detailed reviews and unboxings of THIS SPECIFIC product
  2. Comparison videos featuring THIS product
  3. Tutorial/how-to videos for THIS product
  4. Real user experiences with THIS product
  5. Expert analysis of THIS product

  Guidelines:
  - ALWAYS include the EXACT product name/model in each query
  - Include ASIN (${productAsin}) in at least 2 queries if available
  - Add specific brand names, model numbers, and unique identifiers
  - Include keywords: "review", "unboxing", "vs", "tutorial", "test"
  - Make queries as specific as possible to avoid generic/category videos
  - Avoid generic terms like "best headphones" - focus on THIS product

  Return ONLY a JSON array of 5 strings, no explanation:`;

  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_completion_tokens: 512
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate search queries with Lovable AI');
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '[]';
  
  try {
    // Remove markdown code fences if present
    const cleanText = text.trim()
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '');
    const queries = JSON.parse(cleanText);
    return Array.isArray(queries) ? queries : [productTitle + ' review', productTitle + ' unboxing'];
  } catch {
    return [productTitle + ' review', productTitle + ' unboxing'];
  }
}

async function searchYouTubeVideos(query: string) {
  try {
    console.log(`Searching YouTube API for: ${query}`);
    
    // Call the youtube-search edge function that uses the real YouTube API
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/youtube-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        query,
        maxResults: 5
      })
    });

    if (!response.ok) {
      console.error('YouTube search failed:', response.status);
      return [];
    }

    const data = await response.json();
    const videos = data.videos || [];
    
    console.log(`Found ${videos.length} videos for query: ${query}`);
    
    // Transform to expected format
    return videos.map((v: any) => ({
      id: v.id,
      title: v.title,
      channel: v.channelTitle,
      description: v.description,
      thumbnail: v.thumbnail,
      url: v.url
    }));
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

async function analyzeVideoRelevance(productTitle: string, productAsin: string | undefined, videos: any[]): Promise<VideoResult[]> {
  if (videos.length === 0) return [];

  const prompt = `Analyze these YouTube videos to determine if they are about THIS SPECIFIC product: "${productTitle}"${productAsin ? ` (ASIN: ${productAsin})` : ''}.

  CRITICAL SCORING RULES:
  - Score 80-100: Video is DEFINITELY about THIS EXACT product (product name/model in title, clear review/unboxing)
  - Score 60-79: Video LIKELY about this product (similar name, matching features)
  - Score 40-59: Video MIGHT mention this product (category match, but not focused on it)
  - Score 0-39: Video NOT about this specific product (generic category, different product, listicle)

  For each video, provide:
  1. relevanceScore (0-100): How confident you are this video is about THIS EXACT product
  2. aiReasoning: Brief explanation with specific evidence

  BE STRICT - Only high scores if:
  - Title contains exact product name/model number
  - ASIN appears in title or description
  - Clear review/unboxing indicators for THIS product
  - NOT generic "best of" or category videos

  Videos to analyze:
  ${JSON.stringify(videos.slice(0, 15))} // Limit to prevent token overflow

  Return ONLY a JSON array of objects with format:
  {
    "id": "video_id",
    "relevanceScore": 85,
    "aiReasoning": "Exact product match in title with detailed review keywords"
  }`;

  const response = await fetch(
    'https://ai.gateway.lovable.dev/v1/chat/completions',
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: prompt
        }],
        max_completion_tokens: 1024
      })
    }
  );

  if (!response.ok) {
    console.log('Lovable AI analysis failed, using default ranking');
    return videos.map((video, index) => ({
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      channel: video.channel,
      duration: 'Unknown',
      description: video.description?.substring(0, 150) + '...',
      platform: 'YouTube',
      relevanceScore: Math.max(0, 60 - index * 5), // Default decreasing relevance
      aiReasoning: 'Analysis unavailable - ranked by search order'
    }));
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '[]';
  
  try {
    // Remove markdown code fences if present
    const cleanText = text.trim()
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/i, '');
    const analyses = JSON.parse(cleanText);
    
    // Combine video data with AI analysis
    const rankedVideos = videos.map(video => {
      const analysis = analyses.find((a: any) => a.id === video.id) || {
        relevanceScore: 30,
        aiReasoning: 'No analysis available'
      };
      
      return {
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail,
        channel: video.channel,
        duration: 'Unknown',
        description: video.description?.substring(0, 150) + '...',
        platform: 'YouTube',
        relevanceScore: Math.max(0, Math.min(100, analysis.relevanceScore)),
        aiReasoning: analysis.aiReasoning
      };
    });

    // Sort by relevance score
    return rankedVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
  } catch (error) {
    console.error('Failed to parse OpenRouter analysis:', error);
    return videos.map((video, index) => ({
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      channel: video.channel,
      duration: 'Unknown',
      description: video.description?.substring(0, 150) + '...',
      platform: 'YouTube',
      relevanceScore: Math.max(0, 60 - index * 5),
      aiReasoning: 'Analysis failed - ranked by search order'
    }));
  }
}
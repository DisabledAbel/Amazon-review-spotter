import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GOOGLE_GEMINI_API_KEY');

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
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'Missing GOOGLE_GEMINI_API_KEY' 
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

    // Step 1: Generate intelligent search queries using Gemini
    const searchQueries = await generateSearchQueries(productTitle, productAsin);
    console.log('Generated search queries:', searchQueries);

    // Step 2: Search YouTube for each query
    const allVideos = [];
    for (const query of searchQueries.slice(0, 3)) { // Limit to 3 queries
      const videos = await searchYouTubeVideos(query);
      allVideos.push(...videos);
    }

    // Step 3: Use Gemini to analyze and rank videos for relevance
    const rankedVideos = await analyzeVideoRelevance(productTitle, productAsin, allVideos);

    return new Response(JSON.stringify({
      success: true,
      videos: rankedVideos.slice(0, 8), // Return top 8 most relevant videos
      searchQueries: searchQueries,
      totalFound: allVideos.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-video-finder:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSearchQueries(productTitle: string, productAsin?: string): Promise<string[]> {
  const prompt = `Generate 5 optimized YouTube search queries to find the most relevant product review and demonstration videos for this product: "${productTitle}"${productAsin ? ` (ASIN: ${productAsin})` : ''}

  The queries should target:
  1. Detailed reviews and unboxings
  2. Comparison videos 
  3. Tutorial/how-to videos
  4. Real user experiences
  5. Expert analysis

  Guidelines:
  - Use the exact product name when possible
  - Include relevant keywords like "review", "unboxing", "vs", "tutorial", "test"
  - Consider brand name, model numbers, and key features
  - Make queries specific enough to avoid generic results
  - Include variations in terminology that users might search for

  Return ONLY a JSON array of 5 strings, no explanation:`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 512,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error('Failed to generate search queries with Gemini');
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  try {
    const queries = JSON.parse(text);
    return Array.isArray(queries) ? queries : [productTitle + ' review', productTitle + ' unboxing'];
  } catch {
    return [productTitle + ' review', productTitle + ' unboxing'];
  }
}

async function searchYouTubeVideos(query: string) {
  try {
    // Use Gemini with Google Search to find YouTube videos
    const prompt = `Search YouTube for: "${query}"

Find 5-8 real YouTube videos using Google Search.

For EACH video, return this EXACT format (keep descriptions under 100 characters):
{
  "id": "VIDEO_ID",
  "title": "Video Title",
  "channel": "Channel Name",
  "description": "Short description max 100 chars",
  "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg",
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}

CRITICAL RULES:
1. Keep descriptions SHORT (under 100 characters)
2. Escape all quotes in strings with backslash
3. Return valid JSON array only
4. Use exact YouTube URLs you find`;

    console.log(`Searching for: ${query}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 2048,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini search error:', errorText);
      return [];
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean up the text before parsing - remove any truncated content
    let cleanText = text.trim();
    
    // If text seems incomplete, try to fix it
    if (!cleanText.endsWith(']')) {
      console.log('JSON appears incomplete, attempting to fix...');
      // Find the last complete object
      const lastCompleteObj = cleanText.lastIndexOf('}');
      if (lastCompleteObj > 0) {
        cleanText = cleanText.substring(0, lastCompleteObj + 1) + ']';
      }
    }
    
    try {
      const videos = JSON.parse(cleanText);
      console.log(`Found ${videos.length} videos for query: ${query}`);
      
      // Ensure all videos have required fields
      const validVideos = videos.filter((v: any) => v.id && v.title && v.url);
      return Array.isArray(validVideos) ? validVideos : [];
    } catch (parseError) {
      console.error('Failed to parse video results:', parseError);
      console.error('Raw text length:', text.length);
      console.error('First 500 chars:', text.substring(0, 500));
      return [];
    }
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

async function analyzeVideoRelevance(productTitle: string, productAsin: string | undefined, videos: any[]): Promise<VideoResult[]> {
  if (videos.length === 0) return [];

  const prompt = `Analyze these YouTube videos to determine how relevant they are for the product "${productTitle}"${productAsin ? ` (ASIN: ${productAsin})` : ''}.

  For each video, provide:
  1. relevanceScore (0-100): How likely this video shows/reviews the exact product
  2. aiReasoning: Brief explanation of the relevance score

  Consider:
  - Exact product name matches in title
  - Review/unboxing keywords
  - Channel credibility for product reviews
  - Description content relevance
  - Avoid generic listicles or unrelated content

  Videos to analyze:
  ${JSON.stringify(videos.slice(0, 15))} // Limit to prevent token overflow

  Return ONLY a JSON array of objects with format:
  {
    "id": "video_id",
    "relevanceScore": 85,
    "aiReasoning": "Exact product match in title with detailed review keywords"
  }`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      })
    }
  );

  if (!response.ok) {
    console.log('Gemini analysis failed, using default ranking');
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
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  
  try {
    const analyses = JSON.parse(text);
    
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
    console.error('Failed to parse Gemini analysis:', error);
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
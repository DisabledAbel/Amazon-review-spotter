import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: string;
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  amazonLinks: string[];
}

function extractAmazonLinks(text: string): string[] {
  const amazonRegex = /https?:\/\/(?:www\.)?amazon\.(?:com|ca|uk|de|fr|it|es|in|com\.au|co\.jp)\/(?:[^\/\s]+\/)?(?:dp|gp\/product|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/gi;
  const shortAmazonRegex = /https?:\/\/(?:www\.)?a\.co\/[a-zA-Z0-9]+/gi;
  const amznRegex = /https?:\/\/(?:www\.)?amzn\.to\/[a-zA-Z0-9]+/gi;
  
  const matches = [
    ...(text.match(amazonRegex) || []),
    ...(text.match(shortAmazonRegex) || []),
    ...(text.match(amznRegex) || [])
  ];
  
  return [...new Set(matches)]; // Remove duplicates
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!tavilyApiKey) {
      throw new Error('Tavily API key not configured');
    }

    const { query, maxResults = 10 }: YouTubeSearchParams = await req.json();

    if (!query) {
      throw new Error('Search query is required');
    }

    console.log(`Searching YouTube via Tavily for: ${query}`);

    // Use Tavily API to search for YouTube videos
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_domains: ['youtube.com'],
        max_results: maxResults,
        include_raw_content: false,
      }),
    });

    if (!tavilyResponse.ok) {
      const errorData = await tavilyResponse.json().catch(() => ({}));
      console.error('Tavily API error:', errorData);
      throw new Error(`Tavily API error: ${errorData.error || 'Unknown error'}`);
    }

    const tavilyData = await tavilyResponse.json();
    console.log(`Tavily found ${tavilyData.results?.length || 0} results`);

    // Process Tavily results and extract YouTube video information
    const videos: VideoItem[] = (tavilyData.results || [])
      .filter((result: any) => result.url?.includes('youtube.com/watch'))
      .map((result: any) => {
        // Extract video ID from URL
        const urlMatch = result.url.match(/[?&]v=([^&]+)/);
        const videoId = urlMatch ? urlMatch[1] : '';

        // Extract Amazon links from content
        const amazonLinks = extractAmazonLinks(`${result.title} ${result.content || ''}`);

        return {
          id: videoId,
          title: result.title || '',
          description: result.content?.substring(0, 500) + (result.content?.length > 500 ? '...' : '') || '',
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          channelTitle: result.url?.split('/')[3] || '',
          publishedAt: result.published_date || new Date().toISOString(),
          url: result.url,
          amazonLinks: amazonLinks,
        };
      })
      .filter((video: VideoItem) => video.id); // Only keep videos with valid IDs

    const totalAmazonLinks = videos.reduce((acc, v) => acc + (v.amazonLinks?.length || 0), 0);
    console.log(`Processed ${videos.length} videos, ${totalAmazonLinks} Amazon links total`);

    return new Response(JSON.stringify({ 
      videos,
      totalResults: videos.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in youtube-search function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      videos: [],
      totalResults: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
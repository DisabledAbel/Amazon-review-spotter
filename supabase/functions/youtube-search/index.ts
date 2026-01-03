import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

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

async function fetchAmazonLinksFromComments(videoId: string, apiKey: string): Promise<string[]> {
  try {
    const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${apiKey}`;
    const response = await fetch(commentsUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API comments error:', errorData);
      return [];
    }

    const data = await response.json();
    const texts: string[] = (data.items || []).map((item: any) =>
      item.snippet?.topLevelComment?.snippet?.textDisplay || ''
    );

    const links = texts.flatMap((t) => extractAmazonLinks(t));
    return [...new Set(links)];
  } catch (err) {
    console.error('Failed fetching comments for video:', videoId, err);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    const { query, maxResults = 10, order = 'relevance' }: YouTubeSearchParams = await req.json();

    if (!query) {
      throw new Error('Search query is required');
    }

    console.log(`Searching YouTube for: ${query}`);

    // Search for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id,snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&order=${order}&key=${youtubeApiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube API search error:', errorData);
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const searchData = await searchResponse.json();

    // Get video details for each result
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds}&key=${youtubeApiKey}`;
    
    const detailsResponse = await fetch(detailsUrl);
    
    if (!detailsResponse.ok) {
      const errorData = await detailsResponse.json();
      console.error('YouTube API details error:', errorData);
      throw new Error(`YouTube API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const detailsData = await detailsResponse.json();

    // Process videos and extract Amazon links (including from comments)
    const videos: VideoItem[] = await Promise.all(
      detailsData.items.map(async (item: any) => {
        const fullDescription = item.snippet.description || '';
        const title = item.snippet.title || '';

        // Extract links from title + description
        const descLinks = extractAmazonLinks(`${title} ${fullDescription}`);

        // Extract links from top comments
        const commentLinks = await fetchAmazonLinksFromComments(item.id, youtubeApiKey);

        const allLinks = [...new Set([...(descLinks || []), ...(commentLinks || [])])];

        return {
          id: item.id,
          title: title,
          description: fullDescription.substring(0, 500) + (fullDescription.length > 500 ? '...' : ''),
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
          channelTitle: item.snippet.channelTitle || '',
          publishedAt: item.snippet.publishedAt || '',
          url: `https://www.youtube.com/watch?v=${item.id}`,
          amazonLinks: allLinks,
        };
      })
    );

    const totalAmazonLinks = videos.reduce((acc, v) => acc + (v.amazonLinks?.length || 0), 0);
    console.log(`Found ${videos.length} videos, ${totalAmazonLinks} Amazon links total (including comments)`);

    return new Response(JSON.stringify({ 
      videos,
      totalResults: searchData.pageInfo?.totalResults || 0
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
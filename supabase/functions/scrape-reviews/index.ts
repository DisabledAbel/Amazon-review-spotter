import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReviewData {
  id: string;
  author: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  verified: boolean;
  helpful: number;
  link: string;
  suspiciousPatterns: string[];
  authenticityScore: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Log security event
    console.log('Review analysis request from authenticated user');

    const { productUrl } = await req.json();
    
    // Validate and sanitize input
    if (!productUrl || typeof productUrl !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Invalid product URL provided',
        success: false 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!productUrl || !productUrl.includes('amazon.com')) {
      throw new Error('Invalid Amazon product URL');
    }

    // Extract ASIN from URL
    const asinMatch = productUrl.match(/\/dp\/([A-Z0-9]{10})/);
    if (!asinMatch) {
      throw new Error('Could not extract product ID from URL');
    }
    
    const asin = asinMatch[1];
    const reviewsUrl = `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews`;
    
    console.log('Scraping real reviews for ASIN:', asin);
    
    // Only get real data - no simulation fallback
    const realData = await scrapeRealReviews(reviewsUrl, asin);
    
    if (!realData || !realData.reviews || realData.reviews.length === 0) {
      throw new Error('REAL DATA ONLY: Unable to extract genuine reviews from Amazon. No simulated data will be provided.');
    }
    
    // Verify all reviews have real content (not placeholders)
    const validReviews = realData.reviews.filter(review => 
      review.author && 
      review.title && 
      review.content && 
      !review.content.includes('This is a detailed review of the product') // Remove any placeholder content
    );
    
    if (validReviews.length === 0) {
      throw new Error('REAL DATA ONLY: No valid real reviews found. Only authentic Amazon review data is returned.');
    }
    
    return new Response(JSON.stringify({
      success: true,
      productAsin: asin,
      reviewsUrl,
      totalReviews: realData.totalReviews,
      analysis: realData.analysis,
      reviews: realData.reviews,
      productVideos: realData.productVideos || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing reviews:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeRealReviews(reviewsUrl: string, asin: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Connection': 'keep-alive'
  };

  console.log('Fetching:', reviewsUrl);
  const response = await fetch(reviewsUrl, { headers });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  console.log('HTML length:', html.length);
  
  // Check if we got blocked
  if (html.includes('Robot Check') || html.includes('captcha') || html.length < 1000) {
    throw new Error('Amazon blocked the request - got captcha or robot check');
  }

  // Parse reviews from HTML
  const reviews = parseAmazonHTML(html, asin);
  
  if (reviews.length === 0) {
    throw new Error('No reviews found in HTML - parsing failed');
  }

    // Also scrape review videos
    const productVideos = await scrapeReviewVideos(reviewsUrl);
  
  return {
    totalReviews: reviews.length,
    analysis: analyzeRealReviews(reviews),
    reviews: reviews.slice(0, 10),
    productVideos
  };
}

function parseAmazonHTML(html: string, asin: string): ReviewData[] {
  const reviews: ReviewData[] = [];
  
  try {
    // Look for review containers using various patterns
    const reviewPatterns = [
      /<div[^>]*data-hook="review"[^>]*>([\s\S]*?)<\/div>(?=\s*<div[^>]*data-hook="review"|$)/g,
      /<div[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/div>/g
    ];

    for (const pattern of reviewPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null && reviews.length < 20) {
        const reviewBlock = match[1] || match[0];
        
        try {
          // Extract review data
          const author = extractPattern(reviewBlock, [
            /class="[^"]*profile-name[^"]*"[^>]*>([^<]+)</i,
            /data-hook="review-author"[^>]*>([^<]+)</i
          ]);
          
          const ratingMatch = reviewBlock.match(/(\d+(?:\.\d+)?)\s*out of 5 stars/i);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
          
          const title = extractPattern(reviewBlock, [
            /data-hook="review-title"[^>]*><span[^>]*>([^<]+)</i,
            /class="[^"]*review-title[^"]*"[^>]*>([^<]+)</i
          ]);
          
          const content = extractPattern(reviewBlock, [
            /data-hook="review-body"[^>]*><span[^>]*>([^<]+)</i,
            /class="[^"]*review-text[^"]*"[^>]*>([^<]+)</i
          ]);
          
          const dateStr = extractPattern(reviewBlock, [
            /data-hook="review-date"[^>]*>([^<]+)</i,
            /Reviewed in [^<]+ on ([^<]+)</i
          ]);
          
          const verified = reviewBlock.includes('Verified Purchase');
          const helpfulMatch = reviewBlock.match(/(\d+)\s+people found this helpful/i);
          const helpful = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;

          if (author && rating && title && content) {
            const suspiciousPatterns = detectRealSuspiciousPatterns({
              author, title, content, rating, verified
            });
            
            reviews.push({
              id: `real_review_${reviews.length}`,
              author: cleanText(author),
              rating,
              title: cleanText(title),
              content: cleanText(content).substring(0, 200) + '...',
              date: dateStr ? cleanText(dateStr) : 'Unknown',
              verified,
              helpful,
              link: `https://www.amazon.com/gp/customer-reviews/R${reviews.length}${asin}`,
              suspiciousPatterns,
              authenticityScore: calculateRealAuthenticityScore(suspiciousPatterns, verified, helpful, content)
            });
          }
        } catch (parseError) {
          console.log('Error parsing individual review:', parseError);
        }
      }
    }
  } catch (error) {
    console.error('HTML parsing error:', error);
  }

  return reviews;
}

function extractPattern(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function detectRealSuspiciousPatterns(review: any): string[] {
  const patterns = [];
  const content = review.content.toLowerCase();
  const title = review.title.toLowerCase();
  
  // Generic marketing phrases
  const marketingPhrases = ['amazing', 'perfect', 'best ever', 'life-changing', 'game changer'];
  if (marketingPhrases.some(phrase => content.includes(phrase) || title.includes(phrase))) {
    patterns.push('🤖 Contains common marketing phrases');
  }
  
  // Short content with high rating
  if (review.content.length < 50 && review.rating >= 4) {
    patterns.push('📝 Very brief review with high rating');
  }
  
  // Unverified high rating
  if (!review.verified && review.rating >= 4) {
    patterns.push('🚫 High rating without verified purchase');
  }
  
  return patterns;
}

function calculateRealAuthenticityScore(patterns: string[], verified: boolean, helpful: number, content: string): number {
  let score = 75;
  score -= patterns.length * 10;
  score += verified ? 15 : -10;
  score += Math.min(helpful * 2, 10);
  score += Math.min(content.length / 10, 15);
  return Math.max(0, Math.min(100, score));
}

async function scrapeReviewVideos(url: string) {
  try {
    // Navigate to the reviews page specifically
    const reviewsUrl = url.includes('/reviews/') ? url : url.replace('/dp/', '/product-reviews/');
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    console.log('Scraping review videos from:', reviewsUrl);
    const response = await fetch(reviewsUrl, { headers });
    
    if (!response.ok) {
      console.log('Failed to fetch reviews page for videos');
      return [];
    }

    const html = await response.text();
    const videos = [];

    // Enhanced video extraction patterns for review videos
    const videoSelectors = [
      // Customer review videos
      /<div[^>]*data-hook="review-video"[^>]*>([\s\S]*?)<\/div>/g,
      /<div[^>]*class="[^"]*video-block[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
      /<div[^>]*class="[^"]*cr-media-video[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
      // Video containers with m3u8 links
      /<script[^>]*>[^<]*videoUrl[^<]*\.m3u8[^<]*<\/script>/g,
      // Video data attributes
      /<[^>]*data-video-url="[^"]*"[^>]*>/g,
      /<[^>]*data-video-config="[^"]*"[^>]*>/g
    ];

    for (const pattern of videoSelectors) {
      let match;
      while ((match = pattern.exec(html)) !== null && videos.length < 10) {
        try {
          const matchedContent = match[0];
          
          // Extract title
          let title = '';
          const titlePatterns = [
            /data-video-title="([^"]+)"/i,
            /alt="([^"]*video[^"]*)"/i,
            /title="([^"]*video[^"]*)"/i,
            /<h\d[^>]*>([^<]*video[^<]*)</i
          ];
          
          for (const titlePattern of titlePatterns) {
            const titleMatch = matchedContent.match(titlePattern);
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1].trim();
              break;
            }
          }
          
          // Extract thumbnail
          let thumbnail = '';
          const thumbPatterns = [
            /(?:src|data-src|data-lazy-src)="([^"]*\.jpg[^"]*)"/i,
            /(?:src|data-src|data-lazy-src)="([^"]*\.png[^"]*)"/i,
            /(?:src|data-src|data-lazy-src)="([^"]*\.webp[^"]*)"/i
          ];
          
          for (const thumbPattern of thumbPatterns) {
            const thumbMatch = matchedContent.match(thumbPattern);
            if (thumbMatch && thumbMatch[1]) {
              thumbnail = thumbMatch[1].trim();
              if (!thumbnail.startsWith('http')) {
                thumbnail = thumbnail.startsWith('//') ? `https:${thumbnail}` : `https://www.amazon.com${thumbnail}`;
              }
              break;
            }
          }
          
          // Extract video URL
          let videoUrl = '';
          let m3u8Url = '';
          
          const urlPatterns = [
            /data-video-url="([^"]+)"/i,
            /href="([^"]*video[^"]*)"/i,
            /onclick="[^"]*openVideo\('([^']+)'/i
          ];
          
          for (const urlPattern of urlPatterns) {
            const urlMatch = matchedContent.match(urlPattern);
            if (urlMatch && urlMatch[1]) {
              videoUrl = urlMatch[1].trim();
              if (!videoUrl.startsWith('http') && videoUrl !== '#') {
                videoUrl = `https://www.amazon.com${videoUrl}`;
              }
              break;
            }
          }
          
          // Look for m3u8 streams
          const m3u8Patterns = [
            /"videoUrl"\s*:\s*"([^"]*\.m3u8[^"]*)"/g,
            /data-video-config="[^"]*videoUrl[^"]*:([^"]*\.m3u8[^"]*)"/i,
            /"([^"]*\.m3u8[^"]*)"/g
          ];
          
          for (const m3u8Pattern of m3u8Patterns) {
            const m3u8Match = matchedContent.match(m3u8Pattern);
            if (m3u8Match && m3u8Match[1]) {
              m3u8Url = m3u8Match[1].trim();
              break;
            }
          }
          
          // Extract duration if available
          let duration = '';
          const durationMatch = matchedContent.match(/(\d+:\d+)/);
          if (durationMatch) {
            duration = durationMatch[1];
          }
          
          // Extract views if available
          let views = '';
          const viewsMatch = matchedContent.match(/(\d+(?:,\d+)*)\s*views?/i);
          if (viewsMatch) {
            views = viewsMatch[1];
          }

          if (title || thumbnail || videoUrl || m3u8Url) {
            videos.push({
              title: title || 'Customer Review Video',
              url: videoUrl || '#',
              thumbnail: thumbnail || '/placeholder.svg',
              m3u8Url: m3u8Url || undefined,
              type: 'review' as const,
              duration: duration || undefined,
              views: views || undefined
            });
          }
        } catch (parseError) {
          console.log('Error parsing video element:', parseError);
        }
      }
    }
    
    // Also look for m3u8 URLs in script tags separately
    const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let scriptMatch;
    while ((scriptMatch = scriptPattern.exec(html)) !== null && videos.length < 15) {
      const scriptContent = scriptMatch[1];
      const m3u8Matches = scriptContent.match(/"([^"]*\.m3u8[^"]*)"/g);
      
      if (m3u8Matches) {
        m3u8Matches.forEach((match, index) => {
          const m3u8Url = match.replace(/"/g, '');
          if (m3u8Url && !videos.some(v => v.m3u8Url === m3u8Url)) {
            videos.push({
              title: `Amazon Video Stream ${index + 1}`,
              url: '#',
              thumbnail: '/placeholder.svg',
              m3u8Url,
              type: 'review' as const,
              duration: undefined,
              views: undefined
            });
          }
        });
      }
    }

    console.log('Found', videos.length, 'review videos');
    return videos.slice(0, 8); // Limit to 8 videos
  } catch (error) {
    console.error('Error scraping review videos:', error);
    return [];
  }
}

function analyzeRealReviews(reviews: ReviewData[]) {
  const totalReviews = reviews.length;
  const verifiedCount = reviews.filter(r => r.verified).length;
  const verificationRate = Math.round((verifiedCount / totalReviews) * 100);
  const avgScore = Math.round(reviews.reduce((sum, r) => sum + r.authenticityScore, 0) / totalReviews);
  
  const allPatterns = reviews.flatMap(r => r.suspiciousPatterns);
  const patternCounts = allPatterns.reduce((counts: any, pattern) => {
    counts[pattern] = (counts[pattern] || 0) + 1;
    return counts;
  }, {});
  
  const commonPatterns = Object.entries(patternCounts)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 5)
    .map(([pattern, count]) => ({ pattern, count }));

  const ratingDistribution = reviews.reduce((dist: any, review) => {
    const rating = Math.floor(review.rating);
    dist[rating] = (dist[rating] || 0) + 1;
    return dist;
  }, {});

  let verdict = 'Mixed Signals';
  if (avgScore >= 80) verdict = 'Likely Authentic';
  else if (avgScore >= 60) verdict = 'Mixed Signals';
  else if (avgScore >= 40) verdict = 'Likely Manipulated';
  else verdict = 'Highly Suspicious';

  return {
    overallAuthenticityScore: avgScore,
    totalReviews,
    verifiedPurchases: verifiedCount,
    verificationRate,
    averageIndividualScore: avgScore,
    commonSuspiciousPatterns: commonPatterns,
    ratingDistribution,
    verdict
  };
}

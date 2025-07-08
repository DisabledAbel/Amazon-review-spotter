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
    const { productUrl } = await req.json();
    
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

  return {
    totalReviews: reviews.length,
    analysis: analyzeRealReviews(reviews),
    reviews: reviews.slice(0, 10)
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

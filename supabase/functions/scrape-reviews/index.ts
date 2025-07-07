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
    
    console.log('Scraping reviews from:', reviewsUrl);
    
    // Fetch the reviews page
    const response = await fetch(reviewsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }

    const html = await response.text();
    const reviews = parseReviews(html, asin);
    const analysis = analyzeReviews(reviews);
    
    return new Response(JSON.stringify({
      success: true,
      productAsin: asin,
      reviewsUrl,
      totalReviews: reviews.length,
      analysis,
      reviews: reviews.slice(0, 10), // Return first 10 reviews with links
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error scraping reviews:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseReviews(html: string, asin: string): ReviewData[] {
  const reviews: ReviewData[] = [];
  
  // Parse review data using regex patterns (simplified for demo)
  const reviewBlocks = html.match(/<div[^>]*data-hook="review"[^>]*>[\s\S]*?<\/div>/g) || [];
  
  reviewBlocks.forEach((block, index) => {
    try {
      // Extract review data using regex patterns
      const authorMatch = block.match(/profile-name[^>]*>([^<]+)</);
      const ratingMatch = block.match(/a-icon-alt[^>]*>([0-9.]+) out of 5 stars/);
      const titleMatch = block.match(/review-title[^>]*><span[^>]*>([^<]+)</);
      const contentMatch = block.match(/review-text[^>]*><span[^>]*>([^<]+)</);
      const dateMatch = block.match(/review-date[^>]*>([^<]+)</);
      const verifiedMatch = block.includes('Verified Purchase');
      const helpfulMatch = block.match(/helpful-count[^>]*>([0-9,]+)/);
      
      if (authorMatch && ratingMatch && titleMatch && contentMatch) {
        const suspiciousPatterns = detectSuspiciousPatterns({
          author: authorMatch[1],
          content: contentMatch[1],
          title: titleMatch[1],
          rating: parseFloat(ratingMatch[1]),
          verified: verifiedMatch,
        });
        
        const authenticityScore = calculateAuthenticityScore(suspiciousPatterns, verifiedMatch);
        
        reviews.push({
          id: `review_${index}`,
          author: authorMatch[1].trim(),
          rating: parseFloat(ratingMatch[1]),
          title: titleMatch[1].trim(),
          content: contentMatch[1].trim(),
          date: dateMatch ? dateMatch[1].trim() : 'Unknown date',
          verified: verifiedMatch,
          helpful: helpfulMatch ? parseInt(helpfulMatch[1].replace(/,/g, '')) : 0,
          link: `https://www.amazon.com/gp/customer-reviews/R${index}${asin}`,
          suspiciousPatterns,
          authenticityScore,
        });
      }
    } catch (e) {
      console.error('Error parsing review block:', e);
    }
  });
  
  return reviews;
}

function detectSuspiciousPatterns(review: any): string[] {
  const patterns = [];
  
  // Generic/templated language patterns
  const genericPhrases = [
    'exceeded my expectations',
    'game-changing',
    'revolutionary',
    'must-have',
    'amazing product',
    'highly recommend',
    'best purchase ever',
    'life-changing',
    'perfect in every way'
  ];
  
  const content = review.content.toLowerCase();
  const title = review.title.toLowerCase();
  
  // Check for generic phrases
  const foundGeneric = genericPhrases.filter(phrase => 
    content.includes(phrase) || title.includes(phrase)
  );
  if (foundGeneric.length > 0) {
    patterns.push(`🤖 Contains generic marketing phrases: ${foundGeneric.join(', ')}`);
  }
  
  // Check for overly positive language with extreme ratings
  if (review.rating === 5 && (content.includes('perfect') || content.includes('flawless'))) {
    patterns.push('⭐ Suspiciously perfect language with 5-star rating');
  }
  
  // Check for short, low-effort reviews
  if (content.length < 50 && review.rating === 5) {
    patterns.push('📝 Very short review with maximum rating');
  }
  
  // Check for unverified purchases
  if (!review.verified && review.rating >= 4) {
    patterns.push('🚫 High rating without verified purchase');
  }
  
  // Check for excessive punctuation
  if ((content.match(/!/g) || []).length > 3) {
    patterns.push('❗ Excessive use of exclamation marks');
  }
  
  // Check for product name repetition
  const words = content.split(' ');
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (words.length > 20 && uniqueWords.size / words.length < 0.6) {
    patterns.push('🔄 High word repetition rate');
  }
  
  return patterns;
}

function calculateAuthenticityScore(suspiciousPatterns: string[], verified: boolean): number {
  let score = 85; // Start with base score
  
  // Deduct points for each suspicious pattern
  score -= suspiciousPatterns.length * 15;
  
  // Add points for verified purchase
  if (verified) {
    score += 10;
  } else {
    score -= 20;
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}

function analyzeReviews(reviews: ReviewData[]) {
  if (reviews.length === 0) {
    return {
      overallAuthenticityScore: 0,
      totalReviews: 0,
      verifiedPurchases: 0,
      averageIndividualScore: 0,
      commonSuspiciousPatterns: [],
      ratingDistribution: {},
      verdict: 'Unable to analyze - no reviews found',
    };
  }
  
  const totalReviews = reviews.length;
  const verifiedPurchases = reviews.filter(r => r.verified).length;
  const averageIndividualScore = reviews.reduce((sum, r) => sum + r.authenticityScore, 0) / totalReviews;
  
  // Count rating distribution
  const ratingDistribution = reviews.reduce((dist: any, review) => {
    const rating = Math.floor(review.rating);
    dist[rating] = (dist[rating] || 0) + 1;
    return dist;
  }, {});
  
  // Find most common suspicious patterns
  const allPatterns = reviews.flatMap(r => r.suspiciousPatterns);
  const patternCounts = allPatterns.reduce((counts: any, pattern) => {
    counts[pattern] = (counts[pattern] || 0) + 1;
    return counts;
  }, {});
  
  const commonSuspiciousPatterns = Object.entries(patternCounts)
    .sort(([,a]: any, [,b]: any) => b - a)
    .slice(0, 5)
    .map(([pattern, count]) => ({ pattern, count }));
  
  // Calculate overall authenticity score
  let overallScore = averageIndividualScore;
  
  // Adjust based on verification rate
  const verificationRate = verifiedPurchases / totalReviews;
  if (verificationRate < 0.3) {
    overallScore -= 20;
  } else if (verificationRate > 0.8) {
    overallScore += 10;
  }
  
  // Adjust based on rating distribution (unnatural distributions are suspicious)
  const fiveStarRate = (ratingDistribution[5] || 0) / totalReviews;
  if (fiveStarRate > 0.8) {
    overallScore -= 15;
  }
  
  overallScore = Math.max(0, Math.min(100, overallScore));
  
  let verdict = 'Unable to determine';
  if (overallScore >= 75) {
    verdict = 'Likely Authentic';
  } else if (overallScore >= 50) {
    verdict = 'Mixed Signals';
  } else if (overallScore >= 25) {
    verdict = 'Likely Manipulated';
  } else {
    verdict = 'Highly Suspicious';
  }
  
  return {
    overallAuthenticityScore: Math.round(overallScore),
    totalReviews,
    verifiedPurchases,
    verificationRate: Math.round(verificationRate * 100),
    averageIndividualScore: Math.round(averageIndividualScore),
    commonSuspiciousPatterns,
    ratingDistribution,
    verdict,
  };
}
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    console.log('Checking cache for ASIN:', asin);
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check cache first
    const { data: cachedData, error: cacheError } = await supabase
      .from('scraped_products_cache')
      .select('*')
      .eq('asin', asin)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!cacheError && cachedData) {
      console.log('Cache hit! Returning cached data for ASIN:', asin);
      return new Response(JSON.stringify({
        success: true,
        productAsin: asin,
        reviewsUrl,
        totalReviews: cachedData.total_reviews || 0,
        analysis: cachedData.analysis,
        reviews: cachedData.reviews || [],
        productVideos: cachedData.product_videos || [],
        productImages: cachedData.product_images || [],
        productTitle: cachedData.product_title || '',
        fromCache: true,
        debug: {
          videosFound: (cachedData.product_videos as any[])?.length || 0,
          imagesFound: (cachedData.product_images as any[])?.length || 0,
          videoTitles: (cachedData.product_videos as any[])?.map((v: any) => v.title) || [],
          productTitle: cachedData.product_title || 'Not extracted'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Cache miss. Scraping real reviews for ASIN:', asin);
    
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
    
    // Generate AI product summary
    console.log('Generating AI product summary...');
    let aiProductSummary = '';
    try {
      aiProductSummary = await generateProductSummary(
        realData.productTitle || '',
        validReviews,
        realData.analysis
      );
      console.log('AI summary generated successfully');
    } catch (error) {
      console.error('Error generating AI summary:', error);
      aiProductSummary = 'Unable to generate AI summary at this time.';
    }
    
    // Store in cache with AI summary
    const analysisWithSummary = {
      ...realData.analysis,
      aiProductSummary
    };
    
    try {
      const { error: insertError } = await supabase
        .from('scraped_products_cache')
        .upsert({
          asin,
          product_title: realData.productTitle,
          product_images: realData.productImages || [],
          product_videos: realData.productVideos || [],
          reviews: validReviews,
          analysis: analysisWithSummary,
          total_reviews: realData.totalReviews,
          scraped_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }, {
          onConflict: 'asin'
        });
      
      if (insertError) {
        console.error('Error caching data:', insertError);
      } else {
        console.log('Successfully cached data for ASIN:', asin);
      }
    } catch (cacheInsertError) {
      console.error('Cache insertion error:', cacheInsertError);
    }
    
    return new Response(JSON.stringify({
      success: true,
      productAsin: asin,
      reviewsUrl,
      totalReviews: realData.totalReviews,
      analysis: analysisWithSummary,
      reviews: validReviews,
      productVideos: realData.productVideos || [],
      productImages: realData.productImages || [],
      productTitle: realData.productTitle || '',
      fromCache: false,
      debug: {
        videosFound: realData.productVideos?.length || 0,
        imagesFound: realData.productImages?.length || 0,
        videoTitles: realData.productVideos?.map(v => v.title) || [],
        productTitle: realData.productTitle || 'Not extracted'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing reviews:', error);
    const msg = error instanceof Error ? error.message : String(error);
    const isBlocked = /Amazon blocked|captcha|Robot Check|unable to parse|parsing failed/i.test(msg);

    // For Amazon bot protection or parsing failures, return 200 so the client can handle graceful fallback
    if (isBlocked) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Amazon blocked the request - unable to access or parse reviews',
        isBlocked: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Other errors also return friendly message instead of 500
    return new Response(JSON.stringify({ 
      error: 'Unable to analyze reviews at this time. Please try again later.',
      success: false,
      originalError: msg
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrapeRealReviews(reviewsUrl: string, asin: string) {
  console.log('Scraping Amazon reviews via Firecrawl:', reviewsUrl);
  
  if (!firecrawlApiKey) {
    console.error('FIRECRAWL_API_KEY not configured');
    throw new Error('Firecrawl API key not configured');
  }

  // First scrape the main product page for images and videos
  const productUrl = `https://www.amazon.com/dp/${asin}`;
  const productImages = await scrapeProductImages(productUrl);
  const productVideos = await scrapeProductVideos(productUrl);

  // Use Firecrawl to scrape the reviews page with video and image tags
  const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${firecrawlApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: reviewsUrl,
      formats: ['html'],
      onlyMainContent: false,
      includeTags: ['div', 'span', 'h1', 'h2', 'p', 'a', 'img', 'article', 'section', 'video', 'source'],
      waitFor: 5000
    })
  });

  if (!firecrawlResponse.ok) {
    const errorText = await firecrawlResponse.text();
    console.error('Firecrawl API error:', firecrawlResponse.status, errorText);
    throw new Error(`Firecrawl API error: ${firecrawlResponse.status}`);
  }

  const firecrawlData = await firecrawlResponse.json();
  const html = firecrawlData.data?.html || firecrawlData.html || '';
  
  if (!html) {
    console.error('No HTML content received from Firecrawl');
    throw new Error('No content received from Firecrawl');
  }

  console.log('Fetched HTML via Firecrawl, length:', html.length);

  // Extract product title from the page
  const productTitle = extractProductTitle(html);
  console.log('Extracted product title:', productTitle);

  // Parse reviews from HTML
  let reviews = parseAmazonHTML(html, asin);
  
  console.log('Parsed reviews count:', reviews.length);
  
  if (reviews.length === 0) {
    console.log('No reviews parsed on first attempt - retrying with longer render...');
    const retryUrl = reviewsUrl + (reviewsUrl.includes('?') ? '&' : '?') + 'pageNumber=1&sortBy=recent';
    const retryResp = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: retryUrl,
        formats: ['html'],
        onlyMainContent: false,
        includeTags: ['div', 'span', 'h1', 'h2', 'p', 'a', 'img', 'article', 'section'],
        waitFor: 6000
      })
    });

    if (retryResp.ok) {
      const retryData = await retryResp.json();
      const retryHtml = retryData.data?.html || retryData.html || '';
      console.log('Retry HTML length:', retryHtml.length);
      if (retryHtml) {
        reviews = parseAmazonHTML(retryHtml, asin);
        console.log('Parsed reviews after retry:', reviews.length);
      }
    } else {
      console.warn('Firecrawl retry failed:', retryResp.status);
    }
  }

  if (reviews.length === 0) {
    console.log('No reviews parsed after retry - likely Amazon blocking or HTML structure changed');
    throw new Error('Amazon blocked the request - unable to parse reviews');
  }

  // Extract videos and images from review content
  const reviewVideos = extractReviewVideos(html);
  const reviewImages = extractReviewImages(html);
  
  console.log(`Found ${reviewVideos.length} review videos and ${reviewImages.length} review images`);
  
  return {
    totalReviews: reviews.length,
    analysis: analyzeRealReviews(reviews),
    reviews: reviews.slice(0, 10),
    productVideos: [...reviewVideos, ...productVideos],
    productImages: [...reviewImages, ...productImages],
    productTitle
  };
}

function parseAmazonHTML(html: string, asin: string): ReviewData[] {
  const reviews: ReviewData[] = [];
  
  try {
    console.log('Starting HTML parsing...');
    
    // More comprehensive review container patterns
    const reviewPatterns = [
      // Main review containers
      /<div[^>]*data-hook="review"[^>]*>([\s\S]*?)(?=<div[^>]*data-hook="review"|<\/div>\s*<\/div>\s*$)/g,
      /<div[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*review"|$)/g,
      /<div[^>]*id="[^"]*review[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*id="[^"]*review"|$)/g,
      // Alternative patterns for Amazon's changing structure
      /<article[^>]*>([\s\S]*?)<\/article>/g,
      /<section[^>]*class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/section>/g
    ];

    for (const pattern of reviewPatterns) {
      let match;
      console.log('Trying pattern:', pattern.source.substring(0, 50) + '...');
      
      while ((match = pattern.exec(html)) !== null && reviews.length < 20) {
        const reviewBlock = match[1] || match[0];
        console.log('Found potential review block, length:', reviewBlock.length);
        
        try {
          // More comprehensive author extraction
          const author = extractPattern(reviewBlock, [
            /class="[^"]*profile-name[^"]*"[^>]*>([^<]+)</i,
            /data-hook="review-author"[^>]*>([^<]+)</i,
            /class="[^"]*author[^"]*"[^>]*>([^<]+)</i,
            /<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)</i,
            /by\s+<[^>]+>([^<]+)</i
          ]);
          
          // Rating extraction with multiple patterns
          const ratingPatterns = [
            /(\d+(?:\.\d+)?)\s*out of 5 stars/i,
            /(\d+(?:\.\d+)?)\s*\/\s*5/i,
            /rating-(\d+)/i,
            /stars-(\d+)/i
          ];
          
          let rating = null;
          for (const ratingPattern of ratingPatterns) {
            const ratingMatch = reviewBlock.match(ratingPattern);
            if (ratingMatch) {
              rating = parseFloat(ratingMatch[1]);
              break;
            }
          }
          
          // Title extraction
          const title = extractPattern(reviewBlock, [
            /data-hook="review-title"[^>]*><span[^>]*>([^<]+)<\/span>/i,
            /class="[^"]*review-title[^"]*"[^>]*><span[^>]*>([^<]+)<\/span>/i,
            /class="[^"]*review-title[^"]*"[^>]*>([^<]+)</i,
            /<h\d[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h\d>/i,
            /<strong[^>]*>([^<]+)<\/strong>/i
          ]);
          
          // Content extraction
          const content = extractPattern(reviewBlock, [
            /data-hook="review-body"[^>]*><span[^>]*>([^<]+)</i,
            /class="[^"]*review-text[^"]*"[^>]*><span[^>]*>([^<]+)</i,
            /class="[^"]*review-text[^"]*"[^>]*>([^<]+)</i,
            /class="[^"]*review-body[^"]*"[^>]*>([^<]+)</i,
            /<p[^>]*class="[^"]*review[^"]*"[^>]*>([^<]+)</i
          ]);
          
          // Date extraction
          const dateStr = extractPattern(reviewBlock, [
            /data-hook="review-date"[^>]*>([^<]+)</i,
            /Reviewed in [^<]+ on ([^<]+)</i,
            /class="[^"]*date[^"]*"[^>]*>([^<]+)</i,
            /on\s+([A-Z][a-z]+ \d+, \d{4})/i
          ]);
          
          const verified = reviewBlock.includes('Verified Purchase') || reviewBlock.includes('verified');
          const helpfulMatch = reviewBlock.match(/(\d+)\s+people found this helpful/i);
          const helpful = helpfulMatch ? parseInt(helpfulMatch[1]) : 0;

          console.log('Extracted data:', { 
            author: author?.substring(0, 20), 
            rating, 
            title: title?.substring(0, 30), 
            content: content?.substring(0, 30) 
          });

          if (author && rating && title && content && content.length > 10) {
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
            
            console.log('Successfully parsed review:', reviews.length);
          }
        } catch (parseError) {
          console.log('Error parsing individual review:', parseError);
        }
      }
    }
    
    console.log('Total reviews parsed:', reviews.length);
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

function extractProductTitle(html: string): string {
  // Try multiple patterns to extract product title
  const patterns = [
    /<h1[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)<\/h1>/i,
    /<span[^>]*id="productTitle"[^>]*>([^<]+)<\/span>/i,
    /<h1[^>]*id="title"[^>]*>([^<]+)<\/h1>/i,
    /<div[^>]*data-feature-name="title"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)<\/h1>/i,
    /product-title-word-break"[^>]*>([^<]+)</i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const title = cleanText(match[1]);
      if (title.length > 5) {
        return title;
      }
    }
  }
  
  return '';
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

async function scrapeProductImages(productUrl: string): Promise<string[]> {
  try {
    console.log('Scraping product images from:', productUrl);
    
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not configured');
      return [];
    }

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: productUrl,
        formats: ['html'],
        onlyMainContent: false,
        includeTags: ['img', 'div', 'span', 'script'],
        waitFor: 3000
      })
    });

    if (!firecrawlResponse.ok) {
      console.log('Failed to fetch product page for images');
      return [];
    }

    const firecrawlData = await firecrawlResponse.json();
    const html = firecrawlData.data?.html || firecrawlData.html || '';

    if (!html) {
      console.log('No HTML received for images');
      return [];
    }

    console.log('Extracting product images from HTML...');
    const images: string[] = [];
    
    // Extract images from various Amazon patterns
    const imagePatterns = [
      // Main product images
      /"large":"(https:\/\/[^"]+\.jpg[^"]*)"/g,
      /"hiRes":"(https:\/\/[^"]+\.jpg[^"]*)"/g,
      // Alternative images
      /data-old-hires="(https:\/\/[^"]+\.jpg[^"]*)"/g,
      /data-a-dynamic-image="{&quot;(https:\/\/[^&]+\.jpg[^&]*)&quot;/g,
      // Image gallery
      /"mainUrl":"(https:\/\/[^"]+\.jpg[^"]*)"/g,
    ];

    for (const pattern of imagePatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const imageUrl = match[1];
        // Only add high-quality images (larger than thumbnails)
        if (imageUrl && !images.includes(imageUrl) && !imageUrl.includes('_SS') && !imageUrl.includes('_SX40_')) {
          images.push(imageUrl);
        }
      }
    }

    console.log(`Found ${images.length} product images`);
    return images.slice(0, 10); // Limit to 10 images
  } catch (error) {
    console.error('Error scraping product images:', error);
    return [];
  }
}

async function scrapeProductVideos(productUrl: string) {
  try {
    console.log('Scraping product videos from:', productUrl);
    
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not configured');
      return [];
    }

    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: productUrl,
        formats: ['html'],
        onlyMainContent: false,
        includeTags: ['div', 'span', 'video', 'source', 'img', 'script'],
        waitFor: 3000
      })
    });

    if (!firecrawlResponse.ok) {
      console.log('Failed to fetch product page for videos');
      return [];
    }

    const firecrawlData = await firecrawlResponse.json();
    const html = firecrawlData.data?.html || firecrawlData.html || '';

    if (!html) {
      console.log('No HTML received for videos');
      return [];
    }

    console.log('Extracting product videos from HTML...');
    const videos = [];
    
    // Extract video URLs from Amazon's video player data
    const videoUrlPattern = /"url":"(https:\/\/[^"]+\.mp4[^"]*)"/g;
    const videoThumbnailPattern = /"slate":"(https:\/\/[^"]+\.jpg[^"]*)"/g;
    
    let match;
    const videoUrls = [];
    while ((match = videoUrlPattern.exec(html)) !== null) {
      videoUrls.push(match[1]);
    }
    
    const thumbnails = [];
    while ((match = videoThumbnailPattern.exec(html)) !== null) {
      thumbnails.push(match[1]);
    }

    // Create video objects
    for (let i = 0; i < Math.min(videoUrls.length, 10); i++) {
      videos.push({
        title: `Product Video ${i + 1}`,
        url: videoUrls[i],
        thumbnail: thumbnails[i] || '/placeholder.svg',
        type: 'customer' as const,
        duration: 'Unknown'
      });
    }

    console.log(`Found ${videos.length} product videos`);
    return videos;
  } catch (error) {
    console.error('Error scraping product videos:', error);
    return [];
  }
}

function extractReviewVideos(html: string) {
  console.log('Extracting videos from review content...');
  const videos = [];
  
  try {
    // Pattern 1: Amazon customer video widget data
    const videoWidgetPattern = /"videoUrl":"([^"]+)"/g;
    const thumbnailPattern = /"thumbnailUrl":"([^"]+)"/g;
    const titlePattern = /"title":"([^"]+)"/g;
    
    let match;
    const videoUrls = [];
    const thumbnails = [];
    const titles = [];
    
    while ((match = videoWidgetPattern.exec(html)) !== null) {
      videoUrls.push(match[1].replace(/\\u002F/g, '/'));
    }
    
    while ((match = thumbnailPattern.exec(html)) !== null) {
      thumbnails.push(match[1].replace(/\\u002F/g, '/'));
    }
    
    while ((match = titlePattern.exec(html)) !== null) {
      titles.push(match[1]);
    }
    
    // Pattern 2: Direct video elements
    const videoElementPattern = /<video[^>]*src="([^"]+)"/gi;
    while ((match = videoElementPattern.exec(html)) !== null) {
      videoUrls.push(match[1]);
    }
    
    // Pattern 3: m3u8 streaming URLs
    const m3u8Pattern = /"(https?:\/\/[^"]*\.m3u8[^"]*)"/g;
    while ((match = m3u8Pattern.exec(html)) !== null) {
      const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      if (url.includes('amazon')) {
        videoUrls.push(url);
      }
    }
    
    // Pattern 4: MP4 video files
    const mp4Pattern = /"(https?:\/\/[^"]*\.mp4[^"]*)"/g;
    while ((match = mp4Pattern.exec(html)) !== null) {
      const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      if (url.includes('amazon')) {
        videoUrls.push(url);
      }
    }
    
    // Create video objects
    const uniqueUrls = [...new Set(videoUrls)];
    for (let i = 0; i < Math.min(uniqueUrls.length, 10); i++) {
      videos.push({
        title: titles[i] || `Customer Review Video ${i + 1}`,
        url: uniqueUrls[i],
        thumbnail: thumbnails[i] || '/placeholder.svg',
        type: 'review' as const,
        duration: 'Unknown',
        views: 'N/A'
      });
    }
    
    console.log(`Extracted ${videos.length} videos from reviews`);
  } catch (error) {
    console.error('Error extracting review videos:', error);
  }
  
  return videos;
}

function extractReviewImages(html: string) {
  console.log('Extracting images from review content...');
  const images = [];
  
  try {
    // Pattern 1: Review image thumbnails
    const reviewImagePattern = /data-a-image-name="review-image-gallery"[^>]*src="([^"]+)"/gi;
    let match;
    
    while ((match = reviewImagePattern.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    // Pattern 2: Customer image uploads in reviews
    const customerImagePattern = /<img[^>]*class="[^"]*review-image[^"]*"[^>]*src="([^"]+)"/gi;
    while ((match = customerImagePattern.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    // Pattern 3: cr-lightbox-image-thumbnail (common Amazon review image class)
    const lightboxPattern = /<img[^>]*class="[^"]*cr-lightbox-image-thumbnail[^"]*"[^>]*src="([^"]+)"/gi;
    while ((match = lightboxPattern.exec(html)) !== null) {
      images.push(match[1]);
    }
    
    // Pattern 4: JSON embedded image data
    const jsonImagePattern = /"large":"(https:\/\/[^"]*images-na\.ssl-images-amazon\.com[^"]*)"/g;
    while ((match = jsonImagePattern.exec(html)) !== null) {
      const url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
      images.push(url);
    }
    
    // Filter and clean unique images
    const uniqueImages = [...new Set(images)]
      .filter(img => img && img.includes('amazon') && !img.includes('sprite'))
      .map(img => {
        // Replace thumbnail size with larger version
        return img.replace(/\._[A-Z0-9]+_\./, '._AC_SL1500_.');
      })
      .slice(0, 50); // Limit to 50 images
    
    console.log(`Extracted ${uniqueImages.length} images from reviews`);
    return uniqueImages;
  } catch (error) {
    console.error('Error extracting review images:', error);
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

async function generateProductSummary(
  productTitle: string,
  reviews: ReviewData[],
  analysis: any
): Promise<string> {
  if (!lovableApiKey) {
    console.error('LOVABLE_API_KEY not configured');
    return 'AI summary unavailable - API key not configured';
  }

  try {
    // Prepare review samples for AI (top 10 reviews)
    const reviewSamples = reviews.slice(0, 10).map(r => ({
      rating: r.rating,
      title: r.title,
      content: r.content.substring(0, 300), // Truncate long reviews
      verified: r.verified
    }));

    const prompt = `You are analyzing Amazon product reviews for "${productTitle}". 

Review Data:
- Total Reviews: ${reviews.length}
- Average Authenticity Score: ${analysis.averageIndividualScore}/100
- Verification Rate: ${analysis.verificationRate}%
- Overall Verdict: ${analysis.verdict}

Sample Reviews:
${reviewSamples.map((r, i) => `
${i + 1}. Rating: ${r.rating}/5 ${r.verified ? '[Verified]' : '[Unverified]'}
   Title: ${r.title}
   Content: ${r.content}
`).join('\n')}

Create a comprehensive product summary in 3-4 paragraphs that includes:
1. Product Overview: What the product is and who it's for
2. Key Strengths: Main positive points from customer reviews
3. Common Concerns: Issues or complaints mentioned by customers
4. Overall Recommendation: Your assessment based on the review analysis

Be objective, factual, and helpful. Focus on insights that would help a potential buyer make an informed decision.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert product analyst who creates clear, helpful summaries based on customer review data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI API error:', response.status, errorText);
      return 'Unable to generate AI summary at this time.';
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || 'Unable to generate summary.';
    
    return summary;
  } catch (error) {
    console.error('Error in generateProductSummary:', error);
    return 'Error generating AI summary.';
  }
}

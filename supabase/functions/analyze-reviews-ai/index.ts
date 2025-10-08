import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const { reviews, productTitle } = await req.json();

    if (!reviews || reviews.length === 0) {
      throw new Error('No reviews provided');
    }

    console.log(`Analyzing ${reviews.length} reviews for: ${productTitle}`);

    // Prepare review data for analysis
    const reviewSummary = reviews.slice(0, 20).map((r: any, i: number) => 
      `Review ${i + 1}:
- Rating: ${r.rating}/5
- Verified: ${r.verified ? 'Yes' : 'No'}
- Title: ${r.title}
- Authenticity Score: ${r.authenticityScore}/100
- Suspicious Patterns: ${r.suspiciousPatterns?.join(', ') || 'None'}`
    ).join('\n\n');

    const prompt = `Analyze these Amazon product reviews for "${productTitle}" and provide insights:

${reviewSummary}

Provide a comprehensive summary including:
1. Overall authenticity assessment
2. Common themes in positive reviews
3. Common concerns in negative reviews
4. Most suspicious patterns detected
5. Recommendation for potential buyers

Keep your response concise but informative (max 500 words).`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://reviewdetective.app',
        'X-Title': 'Review Detective'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert at analyzing product reviews for authenticity and providing actionable insights to consumers.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated');
    }

    return new Response(JSON.stringify({ 
      success: true,
      analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-reviews-ai function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

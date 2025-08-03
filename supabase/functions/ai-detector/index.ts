import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context = 'general' } = await req.json();

    if (!text || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text content is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Analyzing text for AI detection:', { textLength: text.length, context });

    const systemPrompt = context === 'review' 
      ? `You are an expert AI detector specializing in Amazon product reviews. Analyze the given text and determine if it's likely to be AI-generated, human-written, or AI-assisted.

Consider these factors for Amazon reviews:
- Natural language patterns vs robotic phrasing
- Repetitive sentence structures common in AI
- Generic praise/criticism vs specific details
- Emotional authenticity vs artificial sentiment
- Product-specific knowledge vs generic descriptions
- Review length and depth patterns

Respond with a JSON object containing:
- "probability": number from 0-100 (likelihood it's AI-generated)
- "classification": "human", "ai-generated", or "ai-assisted"
- "confidence": "high", "medium", or "low"
- "indicators": array of specific indicators found
- "explanation": brief explanation of the assessment`
      : `You are an expert AI content detector. Analyze the given text and determine if it's likely to be AI-generated, human-written, or AI-assisted.

Consider these factors:
- Writing style and flow patterns
- Repetitive phrases or structures
- Depth of personal experience vs generic content
- Natural language variation vs artificial consistency
- Specific details vs vague generalizations

Respond with a JSON object containing:
- "probability": number from 0-100 (likelihood it's AI-generated)
- "classification": "human", "ai-generated", or "ai-assisted"
- "confidence": "high", "medium", or "low"
- "indicators": array of specific indicators found
- "explanation": brief explanation of the assessment`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please analyze this text for AI detection:\n\n"${text}"`
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Anthropic API error:', errorData);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.content[0].text;
    
    // Parse the JSON response from Claude
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
      // Fallback analysis
      analysis = {
        probability: 50,
        classification: "uncertain",
        confidence: "low",
        indicators: ["Unable to fully analyze"],
        explanation: "Analysis was inconclusive"
      };
    }

    console.log('AI detection analysis completed:', analysis);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI detector function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to analyze content'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const chatterBotApiUrl = Deno.env.get('CHATTERBOT_API_URL');
const chatterBotApiKey = Deno.env.get('CHATTERBOT_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { message, productContext } = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required');
    }

    // Sanitize and validate input
    const sanitizedMessage = message.trim().substring(0, 1000);
    
    let response: string;

    // Check if ChatterBot API is configured
    if (chatterBotApiUrl && chatterBotApiKey) {
      try {
        // Use ChatterBot API
        const chatterBotResponse = await fetch(chatterBotApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${chatterBotApiKey}`,
          },
          body: JSON.stringify({
            text: sanitizedMessage,
            context: productContext ? {
              product_title: productContext.title,
              authenticity_score: productContext.score,
              verdict: productContext.verdict,
              red_flags: productContext.redFlags || []
            } : null,
            system_prompt: `You are an AI assistant specialized in Amazon product reviews and authenticity. 
            You can only discuss topics related to:
            - Amazon product reviews and authenticity
            - How to spot fake reviews
            - Shopping tips and advice
            - Product evaluation techniques
            - Review analysis
            
            If asked about anything else, politely redirect the conversation back to these topics.
            Keep responses helpful, concise, and focused on review authenticity.`
          }),
        });

        if (!chatterBotResponse.ok) {
          throw new Error('ChatterBot API error');
        }

        const chatterBotData = await chatterBotResponse.json();
        response = chatterBotData.text || chatterBotData.response || "I'm sorry, I couldn't process that request.";
      } catch (error) {
        console.error('ChatterBot API error:', error);
        // Fallback to built-in responses
        response = generateFallbackResponse(sanitizedMessage, productContext);
      }
    } else {
      // Use built-in responses if ChatterBot is not configured
      response = generateFallbackResponse(sanitizedMessage, productContext);
    }

    return new Response(
      JSON.stringify({ 
        response,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function generateFallbackResponse(message: string, productContext?: any): string {
  const lowerMessage = message.toLowerCase();
  
  // Product-specific responses
  if (productContext) {
    const { title, score, verdict, redFlags } = productContext;
    
    if (lowerMessage.includes('this product') || lowerMessage.includes('current product')) {
      return `Based on my analysis of "${title}", here's what I found:
      
• **Authenticity Score**: ${score}/100
• **Verdict**: ${verdict}
• **Red Flags**: ${redFlags && redFlags.length > 0 ? redFlags.join(', ') : 'None detected'}

Would you like me to explain any specific aspect of this analysis?`;
    }
    
    if (lowerMessage.includes('score') || lowerMessage.includes('rating')) {
      return `The authenticity score for "${title}" is ${score}/100. ${
        score >= 70 ? 'This indicates generally trustworthy reviews.' :
        score >= 40 ? 'This suggests mixed reliability - some reviews may be suspicious.' :
        'This indicates potential issues with review authenticity.'
      }`;
    }
    
    if (lowerMessage.includes('red flag') || lowerMessage.includes('suspicious')) {
      if (redFlags && redFlags.length > 0) {
        return `I found these red flags for "${title}": ${redFlags.join(', ')}. These patterns often indicate fake or manipulated reviews.`;
      }
      return `I didn't detect any major red flags for "${title}", which is a good sign for review authenticity.`;
    }
  }
  
  // General review-related responses
  if (lowerMessage.includes('fake review') || lowerMessage.includes('spot fake')) {
    return `Here are key signs of fake reviews:

🚩 **Language patterns**: Overly generic praise, similar phrasing across reviews
🚩 **Timing**: Burst of reviews in short timeframes
🚩 **Reviewer behavior**: New accounts, few reviews, no verified purchases
🚩 **Content**: Lacks specific product details, focuses on shipping/seller rather than product
🚩 **Ratings**: Unusual distribution (mostly 5-star or 1-star)

Would you like me to explain any of these in more detail?`;
  }
  
  if (lowerMessage.includes('trust') || lowerMessage.includes('reliable')) {
    return `To find trustworthy reviews:

✅ Look for **verified purchases** - these carry more weight
✅ Check **reviewer history** - established accounts with varied reviews
✅ Read **detailed reviews** with specific product mentions
✅ Consider **photo/video reviews** - harder to fake
✅ Check **review dates** - spread over time vs. concentrated bursts
✅ Look for **balanced feedback** - mentions both pros and cons

What specific aspect would you like to know more about?`;
  }
  
  if (lowerMessage.includes('amazon') || lowerMessage.includes('shopping')) {
    return `Smart Amazon shopping tips:

🛍️ **Before buying**: Check multiple review sources, compare prices, verify seller reputation
🔍 **Review analysis**: Focus on recent reviews, look for patterns, check verified purchases
⭐ **Rating wisdom**: Don't just look at average - check the distribution
📊 **Use tools**: Compare prices across sites, check price history
🚚 **Seller check**: Verify seller ratings and return policies

Need help with anything specific about Amazon shopping?`;
  }
  
  // Redirect non-product related questions
  if (lowerMessage.includes('weather') || lowerMessage.includes('news') || 
      lowerMessage.includes('recipe') || lowerMessage.includes('movie') ||
      lowerMessage.includes('sports') || lowerMessage.includes('politics')) {
    return `I'm specialized in helping with Amazon product reviews and shopping advice. I can help you:

• Understand how to spot fake reviews
• Analyze product authenticity
• Learn about review patterns and red flags
• Get shopping tips for Amazon

What would you like to know about product reviews or Amazon shopping?`;
  }
  
  // Default response
  return `I'm here to help you with Amazon product reviews and authenticity! I can help you:

• **Spot fake reviews** - Learn the warning signs
• **Understand review patterns** - What to look for
• **Shopping tips** - Make smarter purchases
• **Product analysis** - Evaluate authenticity

What would you like to know about Amazon reviews or product authenticity?`;
}
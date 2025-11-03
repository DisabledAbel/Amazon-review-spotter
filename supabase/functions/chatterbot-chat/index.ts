import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Public access: authentication optional for chatbot
    // Note: If a user session is present, you can read it from the Authorization header,
    // but we don't require it to respond to general inquiries.

    const { message, productContext } = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error('Message is required');
    }

    // Sanitize and validate input
    const sanitizedMessage = message.trim().substring(0, 1000);
    
    let response: string;
    let youtubeVideos: any[] = []; // Declare in outer scope

    // Check if Lovable AI is configured
    if (lovableApiKey) {
      try {
        // Prepare system prompt and context
        const systemPrompt = `You are an AI assistant specialized in Amazon product reviews and authenticity. 
        You can only discuss topics related to:
        - Amazon product reviews and authenticity
        - How to spot fake reviews
        - Shopping tips and advice
        - Product evaluation techniques
        - Review analysis
        - Finding coupons and deals for products
        
        If asked about anything else, politely redirect the conversation back to these topics.
        Keep responses helpful, concise, and focused on review authenticity.`;

        let contextMessage = '';
        
        if (productContext) {
          contextMessage = `\n\nCurrent product context:
          - Product: ${productContext.title}
          - Authenticity Score: ${productContext.score}/100
          - Verdict: ${productContext.verdict}
          - Red Flags: ${productContext.redFlags?.join(', ') || 'None detected'}`;
          
          // Auto-search for YouTube videos when product is analyzed
          try {
            const { data: videoData } = await supabase.functions.invoke('youtube-search', {
              body: { 
                query: `${productContext.title} review`,
                maxResults: 5 
              }
            });
            
            if (videoData?.videos) {
              youtubeVideos = videoData.videos;
              contextMessage += `\n\nI also found these YouTube reviews for this product:
${youtubeVideos.map((video: any, index: number) => 
  `${index + 1}. ${video.title} by ${video.channelTitle} (${video.publishedAt})`
).join('\n')}`;
            }
          } catch (error) {
            console.error('Error fetching YouTube videos:', error);
          }

          // Auto-search for coupons when product is analyzed
          try {
            const { data: couponData } = await supabase.functions.invoke('search-coupons', {
              body: { 
                productName: productContext.title,
                productUrl: productContext.url
              }
            });
            
            if (couponData?.message) {
              contextMessage += `\n\nCoupon availability: ${couponData.message}`;
              if (couponData.suggestions?.length > 0) {
                contextMessage += `\nSuggestions:\n${couponData.suggestions.map((s: string) => `- ${s}`).join('\n')}`;
              }
            }
          } catch (error) {
            console.error('Error searching for coupons:', error);
          }
        }

        // Use Lovable AI Gateway with GPT-5 and tool calling
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-5-mini',
            messages: [
              { role: 'system', content: systemPrompt + contextMessage },
              { role: 'user', content: sanitizedMessage }
            ],
            max_completion_tokens: 1000,
            tools: [
              {
                type: 'function',
                function: {
                  name: 'search_youtube_videos',
                  description: 'Search for YouTube videos about a specific product, review, unboxing, or topic. Use this when users ask about videos, want to see reviews, or need visual content about a product.',
                  parameters: {
                    type: 'object',
                    properties: {
                      query: {
                        type: 'string',
                        description: 'The search query for YouTube videos (e.g., "iPhone 15 Pro review", "standing desk unboxing")'
                      },
                      maxResults: {
                        type: 'number',
                        description: 'Maximum number of videos to return (default: 5)',
                        default: 5
                      }
                    },
                    required: ['query']
                  }
                }
              }
            ]
          }),
        });

        if (!aiResponse.ok) {
          const errorData = await aiResponse.text();
          console.error('Lovable AI Gateway error:', aiResponse.status, errorData);
          
          if (aiResponse.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }
          if (aiResponse.status === 402) {
            throw new Error('AI credits depleted. Please add credits to your workspace.');
          }
          throw new Error('AI Gateway error');
        }

        const aiData = await aiResponse.json();
        let assistantResponse = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't process that request.";
        const toolCalls = aiData.choices?.[0]?.message?.tool_calls;

        // Handle tool calls if GPT5 wants to search YouTube
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'search_youtube_videos') {
              const args = JSON.parse(toolCall.function.arguments);
              console.log('GPT5 requesting YouTube search:', args);
              
              try {
                const { data: videoData } = await supabase.functions.invoke('youtube-search', {
                  body: { 
                    query: args.query,
                    maxResults: args.maxResults || 5
                  }
                });

                if (videoData?.videos && videoData.videos.length > 0) {
                  const videos = videoData.videos.slice(0, 3);
                  assistantResponse += `\n\n📺 Here are relevant YouTube videos:\n\n${videos.map((video: any) => 
                    `🎥 **${video.title}**\nBy ${video.channelTitle}\nWatch: ${video.url}\n`
                  ).join('\n')}`;
                }
              } catch (error) {
                console.error('Error fetching YouTube videos via tool call:', error);
              }
            }
          }
        }
        
        // Add YouTube videos to response if available from product context
        if (youtubeVideos.length > 0) {
          assistantResponse += `\n\nI also found these YouTube reviews for this product:\n\n${youtubeVideos.map((video: any) => 
            `🎥 **${video.title}**\nBy ${video.channelTitle}\nWatch: ${video.url}\n`
          ).join('\n')}`;
        }
        
        response = assistantResponse;
      } catch (error) {
        console.error('Lovable AI error:', error);
        // Fallback to built-in responses
        response = generateFallbackResponse(sanitizedMessage, productContext, youtubeVideos);
      }
    } else {
      // Use built-in responses if Lovable AI is not configured
      response = generateFallbackResponse(sanitizedMessage, productContext, youtubeVideos);
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

function generateFallbackResponse(message: string, productContext?: any, youtubeVideos?: any[]): string {
  const lowerMessage = message.toLowerCase();
  
  // Product-specific responses
  if (productContext) {
    const { title, score, verdict, redFlags } = productContext;
    
    if (lowerMessage.includes('this product') || lowerMessage.includes('current product')) {
      let response = `Based on my analysis of "${title}", here's what I found:
      
• **Authenticity Score**: ${score}/100
• **Verdict**: ${verdict}
• **Red Flags**: ${redFlags && redFlags.length > 0 ? redFlags.join(', ') : 'None detected'}

Would you like me to explain any specific aspect of this analysis?`;

      // Add YouTube videos if available
      if (youtubeVideos && youtubeVideos.length > 0) {
        response += `\n\nI also found these YouTube reviews for this product:\n\n${youtubeVideos.map((video: any) => 
          `🎥 **${video.title}**\nBy ${video.channelTitle}\nWatch: ${video.url}\n`
        ).join('\n')}`;
      }

      return response;
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
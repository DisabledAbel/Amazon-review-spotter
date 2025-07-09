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
    const { message, productContext } = await req.json();
    
    // Simulate AI responses for Amazon product questions
    const responses = [
      `Based on the reviews analyzed, here's what I found: ${message.includes('fake') ? 'There are some red flags in the review patterns that suggest potential manipulation.' : 'The reviews appear mostly authentic with normal patterns.'}`,
      `Regarding Amazon reviews: ${message.includes('trust') ? 'I recommend looking for verified purchases and detailed reviews with photos.' : 'Check the review timeline and look for sudden spikes in activity.'}`,
      `For this product: ${message.includes('buy') ? 'Consider the overall authenticity score and read recent verified reviews before purchasing.' : 'The analysis shows patterns that can help you make an informed decision.'}`,
      `Amazon review tip: ${message.includes('how') ? 'Look for reviews that mention specific product features and have photos or videos.' : 'Be cautious of generic praise without specific details about the product.'}`,
    ];
    
    const response = responses[Math.floor(Math.random() * responses.length)];
    
    return new Response(JSON.stringify({ 
      response,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in amazon-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process chat message',
      response: 'Sorry, I encountered an error. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
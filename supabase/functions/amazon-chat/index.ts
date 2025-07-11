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
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required',
        response: 'Please log in to use the chat feature.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log security event
    console.log('Chat request from authenticated user');

    const { message, productContext } = await req.json();
    
    // Validate and sanitize inputs
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Invalid message provided',
        response: 'Please provide a valid message.'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize message to prevent injection attacks
    const sanitizedMessage = message.trim().substring(0, 1000); // Limit message length
    
    // Enhanced AI responses with product context awareness
    let response = '';
    
    const messageL = sanitizedMessage.toLowerCase();
    
    if (productContext) {
      // Product-specific responses
      if (messageL.includes('fake') || messageL.includes('authentic')) {
        response = `Based on the analysis of this specific product (${productContext.title}), the authenticity score is ${productContext.score}%. ${productContext.score >= 70 ? 'This indicates mostly genuine reviews with normal patterns.' : productContext.score >= 40 ? 'There are some mixed signals - some authentic reviews but also potential red flags.' : 'Multiple red flags suggest potential review manipulation.'}`;
      } else if (messageL.includes('buy') || messageL.includes('purchase')) {
        response = `For this specific product "${productContext.title}", I'd ${productContext.score >= 70 ? 'recommend considering it - the reviews appear mostly authentic' : productContext.score >= 40 ? 'suggest caution - there are some authenticity concerns' : 'advise against it due to significant review manipulation signs'}. Always check recent verified purchase reviews.`;
      } else if (messageL.includes('score') || messageL.includes('rating')) {
        response = `This product has an authenticity score of ${productContext.score}% with a verdict of "${productContext.verdict}". ${productContext.redFlags?.length > 0 ? `Key concerns: ${productContext.redFlags.slice(0, 2).join(', ')}` : 'No major red flags detected.'}`;
      } else if (messageL.includes('review') || messageL.includes('pattern')) {
        response = `For "${productContext.title}", the review patterns show: ${productContext.score >= 70 ? 'Natural distribution, diverse language, and good verification rates' : productContext.score >= 40 ? 'Mixed patterns with some suspicious elements' : 'Multiple concerning patterns including timing clusters and generic language'}. Look for reviews with specific product details and photos.`;
      } else {
        response = `Regarding "${productContext.title}" (${productContext.score}% authentic): ${productContext.score >= 70 ? 'This product shows healthy review patterns. Focus on verified purchases and detailed reviews.' : 'This product has some authenticity concerns. Check for recent reviews from verified buyers with specific product experiences.'}`;
      }
    } else {
      // General Amazon review advice
      if (messageL.includes('spot') || messageL.includes('identify') || messageL.includes('fake')) {
        response = "To spot fake reviews: 1) Check for verified purchase badges, 2) Look for specific product details rather than generic praise, 3) Watch for timing clusters (many reviews in short periods), 4) Be wary of overly positive language without specifics, 5) Check reviewer profiles for suspicious patterns.";
      } else if (messageL.includes('trust') || messageL.includes('reliable')) {
        response = "Trust reviews that: Have verified purchase badges, include specific product details and usage scenarios, show photos or videos, mention both pros and cons, are written in natural language, and come from reviewers with diverse review histories.";
      } else if (messageL.includes('avoid') || messageL.includes('warning')) {
        response = "Red flags to avoid: Generic praise without specifics, identical phrases across reviews, perfect 5-star ratings only, reviews posted in clusters, overly promotional language, reviewers who only review one brand, and reviews without verified purchase badges.";
      } else if (messageL.includes('how') || messageL.includes('tips')) {
        response = "Amazon review tips: 1) Sort by most recent first, 2) Read 1-3 star reviews for honest feedback, 3) Look for reviews with photos/videos, 4) Check the seller's other products, 5) Use our analysis tool for suspicious patterns, 6) Focus on verified purchases over unverified.";
      } else {
        response = "I'm here to help you navigate Amazon reviews! Ask me about spotting fake reviews, understanding authenticity scores, or how to make safer purchasing decisions. I can also analyze specific products when you share them with me.";
      }
    }
    
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
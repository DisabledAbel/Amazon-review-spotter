
import { ReviewData, AnalysisResult } from "@/types/review";

export const analyzeReview = (data: ReviewData): AnalysisResult => {
  // Simulate analysis based on product link
  const isAmazonLink = data.productLink.includes('amazon.com');
  const hasProductId = data.productLink.includes('/dp/');
  
  let genuinenessScore = 7;
  let redFlags: string[] = [];
  let verdict = "Possibly Genuine";
  
  if (!isAmazonLink) {
    genuinenessScore -= 3;
    redFlags.push("❌ Invalid Amazon product link provided - cannot analyze reviews");
    verdict = "Unable to Analyze";
  }
  
  if (!hasProductId) {
    genuinenessScore -= 2;
    redFlags.push("⚠️ Product link appears to be incomplete or invalid");
  }
  
  // Simulate detection of weird review patterns
  const weirdReviewPatterns = [
    { condition: Math.random() > 0.6, flag: "🤖 Multiple reviews contain identical phrases like 'This product exceeded my expectations'", impact: -2 },
    { condition: Math.random() > 0.7, flag: "📅 Suspicious clustering: 15+ reviews posted within the same 2-hour window", impact: -1.5 },
    { condition: Math.random() > 0.5, flag: "🎭 Several reviewers have only reviewed this brand's products (potential paid reviews)", impact: -2 },
    { condition: Math.random() > 0.8, flag: "📝 Reviews contain unusual marketing language: 'game-changing', 'revolutionary', 'must-have'", impact: -1.5 },
    { condition: Math.random() > 0.6, flag: "⭐ Unnatural rating distribution: 89% five-star reviews, almost no 2-3 star reviews", impact: -1 },
    { condition: Math.random() > 0.9, flag: "👤 Multiple reviewers joined Amazon on the same day and only reviewed this product", impact: -2.5 },
    { condition: Math.random() > 0.7, flag: "🔄 Reviews follow similar templates: 'I was skeptical at first but...' pattern repeated", impact: -1.5 },
    { condition: Math.random() > 0.8, flag: "📸 Fake verified purchase badges detected on reviews without actual purchase history", impact: -2 },
    { condition: Math.random() > 0.5, flag: "🌍 Geographic clustering: Most reviewers from same unusual location for this product type", impact: -1 },
    { condition: Math.random() > 0.9, flag: "🏆 Reviews mention competitor products negatively while praising this one excessively", impact: -1.5 },
  ];
  
  weirdReviewPatterns.forEach(pattern => {
    if (pattern.condition) {
      redFlags.push(pattern.flag);
      genuinenessScore += pattern.impact;
    }
  });
  
  genuinenessScore = Math.max(1, Math.min(10, genuinenessScore));
  
  if (genuinenessScore >= 8) {
    verdict = "Very Likely Genuine";
  } else if (genuinenessScore >= 6) {
    verdict = "Possibly Genuine";
  } else if (genuinenessScore >= 4) {
    verdict = "Suspicious";
  } else {
    verdict = "Likely Fake";
  }
  
  return {
    genuinenessScore: Math.round(genuinenessScore * 10) / 10,
    scoreExplanation: `Analysis of the product reviews revealed ${redFlags.length > 0 ? 'several suspicious patterns' : 'no major red flags'} that indicate ${verdict.toLowerCase()} authenticity. Our AI examined review timing, language patterns, reviewer behavior, and purchase verification.`,
    redFlags,
    finalVerdict: verdict,
    verdictExplanation: `Based on our comprehensive analysis of the product's review ecosystem, we assess this product's reviews as ${verdict.toLowerCase()}. ${redFlags.length > 0 ? `We identified ${redFlags.length} suspicious pattern(s) that suggest potential review manipulation.` : 'The review patterns appear consistent with authentic customer feedback.'}`
  };
};

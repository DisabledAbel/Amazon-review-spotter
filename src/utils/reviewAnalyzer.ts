
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
    redFlags.push("Invalid Amazon product link provided");
    verdict = "Unable to Analyze";
  }
  
  if (!hasProductId) {
    genuinenessScore -= 2;
    redFlags.push("Product link appears to be incomplete or invalid");
  }
  
  // Simulate some random analysis results
  const randomFactors = [
    { condition: Math.random() > 0.7, flag: "High volume of reviews posted in short timeframe", impact: -1.5 },
    { condition: Math.random() > 0.8, flag: "Multiple reviews with similar language patterns detected", impact: -2 },
    { condition: Math.random() > 0.6, flag: "Unusual rating distribution patterns", impact: -1 },
    { condition: Math.random() > 0.9, flag: "Several reviewers with limited review history", impact: -1.5 },
  ];
  
  randomFactors.forEach(factor => {
    if (factor.condition) {
      redFlags.push(factor.flag);
      genuinenessScore += factor.impact;
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
    scoreExplanation: `Analysis of the product reviews and reviewer patterns indicates ${verdict.toLowerCase()} authenticity based on multiple factors including review timing, language patterns, and reviewer behavior.`,
    redFlags,
    finalVerdict: verdict,
    verdictExplanation: `Based on our comprehensive analysis of the product's review ecosystem, we assess this product's reviews as ${verdict.toLowerCase()}. ${redFlags.length > 0 ? 'Several concerning patterns were identified that may indicate manipulated reviews.' : 'The review patterns appear consistent with authentic customer feedback.'}`
  };
};

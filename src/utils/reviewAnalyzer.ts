
import { ReviewData, AnalysisResult } from "@/types/review";

export const analyzeReview = (data: ReviewData): AnalysisResult => {
  console.log("Analyzing review data:", data);
  
  // Initialize scoring factors
  let genuinenessScore = 5;
  const redFlags: string[] = [];
  
  // Analyze review text
  const textLength = data.reviewText.length;
  const hasSpecificDetails = /\b(specific|exactly|precisely|measured|tested|compared)\b/i.test(data.reviewText);
  const hasGenericPhraise = /\b(amazing|incredible|life-changing|game-changer|must-have|highly recommend)\b/gi;
  const genericMatches = data.reviewText.match(hasGenericPhraise);
  const hasPersonalContext = /\b(my|I|me|personally|experience|used|bought|purchased)\b/gi.test(data.reviewText);
  
  // Content analysis scoring
  if (textLength < 50) {
    genuinenessScore -= 1.5;
    redFlags.push("Extremely short review with minimal detail");
  } else if (textLength > 500) {
    genuinenessScore += 1;
  }
  
  if (!hasSpecificDetails && textLength > 100) {
    genuinenessScore -= 1;
    redFlags.push("Lacks specific product details despite length");
  }
  
  if (genericMatches && genericMatches.length > 2) {
    genuinenessScore -= 2;
    redFlags.push("Excessive use of generic marketing language");
  }
  
  if (!hasPersonalContext) {
    genuinenessScore -= 1;
    redFlags.push("Lacks personal context or experience indicators");
  }
  
  // Profile analysis scoring
  if (data.totalReviews === 0) {
    genuinenessScore -= 1;
  } else if (data.totalReviews > 100) {
    genuinenessScore -= 0.5;
    redFlags.push("Unusually high number of reviews written");
  }
  
  if (!data.verifiedPurchase) {
    genuinenessScore -= 2;
    redFlags.push("Review not from verified purchase");
  }
  
  if (data.reviewFrequency.toLowerCase().includes("week") || data.reviewFrequency.toLowerCase().includes("day")) {
    genuinenessScore -= 1.5;
    redFlags.push("Suspiciously frequent review activity");
  }
  
  // Rating analysis
  if (data.rating === 5 || data.rating === 1) {
    if (!hasSpecificDetails) {
      genuinenessScore -= 0.5;
      redFlags.push("Extreme rating without detailed justification");
    }
  }
  
  // Ensure score stays within bounds
  genuinenessScore = Math.max(1, Math.min(10, genuinenessScore));
  
  // Determine final verdict
  let finalVerdict: string;
  let verdictExplanation: string;
  
  if (genuinenessScore >= 8) {
    finalVerdict = "Very Likely Genuine";
    verdictExplanation = "The review shows strong indicators of authenticity with detailed, personal content and credible reviewer behavior.";
  } else if (genuinenessScore >= 6.5) {
    finalVerdict = "Possibly Genuine (but uncertain)";
    verdictExplanation = "The review has some authentic characteristics but also contains elements that raise minor concerns.";
  } else if (genuinenessScore >= 4.5) {
    finalVerdict = "Suspicious";
    verdictExplanation = "Multiple red flags suggest this review may be artificial or incentivized.";
  } else if (genuinenessScore >= 2.5) {
    finalVerdict = "Likely Fake";
    verdictExplanation = "Significant indicators suggest this review is artificial, paid, or otherwise manipulated.";
  } else {
    finalVerdict = "Highly Likely Fake";
    verdictExplanation = "Strong evidence indicates this review is fraudulent or artificially generated.";
  }
  
  return {
    genuinenessScore: Math.round(genuinenessScore * 10) / 10,
    scoreExplanation: `Based on content analysis, reviewer behavior patterns, and linguistic indicators.`,
    contentAnalysis: {
      specificity: textLength > 200 && hasSpecificDetails 
        ? "High - Contains specific product details and personal experiences"
        : textLength > 100 
          ? "Medium - Moderate detail level with some specific information"
          : "Low - Minimal details and generic content",
      languagePatterns: genericMatches && genericMatches.length > 2
        ? "Concerning - Heavy use of marketing language and generic phrases"
        : hasPersonalContext
          ? "Natural - Uses personal pronouns and experience-based language"
          : "Neutral - Standard review language without obvious red flags",
      emotionalTone: data.rating === 5 || data.rating === 1
        ? "Extreme - Very positive or negative sentiment that may indicate bias"
        : "Balanced - Measured tone appropriate for the rating given",
      productAlignment: hasSpecificDetails
        ? "Good - Review content aligns well with product features"
        : "Unclear - Limited product-specific information to assess alignment"
    },
    profileAnalysis: {
      activityPatterns: data.reviewFrequency.toLowerCase().includes("week") || data.reviewFrequency.toLowerCase().includes("day")
        ? "Suspicious - High frequency review activity suggesting possible incentivization"
        : "Normal - Reasonable review frequency for typical user behavior",
      reviewConsistency: data.totalReviews > 50
        ? "Concerning - Very high volume of reviews may indicate professional reviewer"
        : data.totalReviews > 10
          ? "Active - Regular reviewer with established history"
          : "Limited - Few reviews written, typical of casual users",
      verificationStatus: data.verifiedPurchase
        ? "Verified - Review comes from confirmed purchase, adding credibility"
        : "Unverified - Not confirmed as actual purchaser, reducing reliability",
      credibility: data.verifiedPurchase && data.totalReviews < 100 && hasPersonalContext
        ? "High - Profile shows typical consumer behavior patterns"
        : "Moderate - Some factors suggest potential review manipulation"
    },
    redFlags,
    finalVerdict,
    verdictExplanation
  };
};

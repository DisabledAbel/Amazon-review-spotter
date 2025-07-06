
export interface ReviewData {
  reviewText: string;
  rating: number;
  reviewerName: string;
  totalReviews: number;
  reviewFrequency: string;
  verifiedPurchase: boolean;
  profileAge: string;
}

export interface AnalysisResult {
  genuinenessScore: number;
  scoreExplanation: string;
  contentAnalysis: {
    specificity: string;
    languagePatterns: string;
    emotionalTone: string;
    productAlignment: string;
  };
  profileAnalysis: {
    activityPatterns: string;
    reviewConsistency: string;
    verificationStatus: string;
    credibility: string;
  };
  redFlags: string[];
  finalVerdict: string;
  verdictExplanation: string;
}

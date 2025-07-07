
export interface ReviewData {
  productLink: string;
}

export interface ProductInfo {
  title: string;
  image: string;
  link: string;
  asin: string;
}

export interface AnalysisResult {
  genuinenessScore: number;
  scoreExplanation: string;
  redFlags: string[];
  finalVerdict: string;
  verdictExplanation: string;
  productInfo: ProductInfo;
  realAnalysis?: {
    totalReviews: number;
    verificationRate: number;
    authenticityPercentage: number;
    ratingDistribution: Record<number, number>;
    individualReviews: {
      author: string;
      rating: number;
      title: string;
      link: string;
      verified: boolean;
      authenticityScore: number;
      suspiciousPatterns: string[];
    }[];
  };
}

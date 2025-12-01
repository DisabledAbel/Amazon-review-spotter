
export interface ReviewData {
  productLink: string;
}

export interface ProductInfo {
  title: string;
  image: string;
  images: string[];
  link: string;
  asin: string;
}

export interface OnlineVideo {
  title: string;
  url: string;
  thumbnail: string;
  channel: string;
  duration: string;
  description: string;
  platform: string;
  relevanceScore?: number;
  aiReasoning?: string;
}

export interface ProductVideo {
  title: string;
  url: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  m3u8Url?: string;
  type: 'customer' | 'brand' | 'promotional' | 'review';
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
    onlineVideos?: OnlineVideo[];
    productVideos?: ProductVideo[];
    aiProductSummary?: string;
    isBlocked?: boolean;
  };
}

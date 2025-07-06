
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
}

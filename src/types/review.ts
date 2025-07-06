
export interface ReviewData {
  productLink: string;
}

export interface AnalysisResult {
  genuinenessScore: number;
  scoreExplanation: string;
  redFlags: string[];
  finalVerdict: string;
  verdictExplanation: string;
}

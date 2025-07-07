
import { useState } from "react";
import { ReviewInput } from "@/components/ReviewInput";
import { AnalysisDisplay } from "@/components/AnalysisDisplay";
import { analyzeReview } from "@/utils/reviewAnalyzer";
import { ReviewData, AnalysisResult } from "@/types/review";
import { Shield, Search, AlertTriangle } from "lucide-react";

const Index = () => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async (reviewData: ReviewData) => {
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeReview(reviewData);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      // Handle error - could show error state
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Amazon Review Fraud Detector</h1>
              <p className="text-slate-600">AI-powered product review authenticity analysis</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!analysisResult ? (
          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-white rounded-xl p-6 shadow-sm border max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                  <Search className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 mb-2">How it works</h2>
                  <p className="text-slate-600 leading-relaxed">
                    Simply paste an Amazon product link below and our AI will analyze all the reviews 
                    for that product to detect fake, paid, or manipulated reviews. We examine review patterns, 
                    timing, language, and reviewer behavior to give you an authenticity assessment.
                  </p>
                </div>
              </div>
            </div>

            <ReviewInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          </div>
        ) : (
          <AnalysisDisplay result={analysisResult} onReset={handleReset} />
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>This tool is for educational and research purposes. Results should be used as guidance only.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

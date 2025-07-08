
import { useState } from "react";
import { ReviewInput } from "@/components/ReviewInput";
import { AnalysisDisplay } from "@/components/AnalysisDisplay";
import { AuthButton } from "@/components/AuthButton";
import { analyzeReview } from "@/utils/reviewAnalyzer";
import { ReviewData, AnalysisResult } from "@/types/review";
import { Shield, Search, AlertTriangle, Sparkles, TrendingUp, Users } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10">
      {/* Modern Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <div className="relative bg-background/95 backdrop-blur-sm border-b border-border/50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-xl blur-sm" />
                  <div className="relative p-3 bg-primary rounded-xl shadow-lg">
                    <Shield className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Amazon Review Spotter
                  </h1>
                  <p className="text-muted-foreground font-medium">AI-powered authenticity analysis for Amazon reviews</p>
                </div>
              </div>
              <AuthButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!analysisResult ? (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-4xl mx-auto">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                  Detect Fake Reviews with 
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> AI Precision</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Our advanced AI analyzes Amazon reviews to identify fake, paid, or manipulated content. 
                  Get authentic insights before you buy.
                </p>
              </div>
              
              {/* Feature Cards */}
              <div className="grid md:grid-cols-3 gap-6 mt-12">
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">AI-Powered Analysis</h3>
                    <p className="text-muted-foreground text-sm">Advanced machine learning algorithms detect suspicious patterns and fake review behaviors.</p>
                  </div>
                </div>
                
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="p-3 bg-accent/10 rounded-xl w-fit mb-4">
                      <TrendingUp className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Real-Time Insights</h3>
                    <p className="text-muted-foreground text-sm">Get instant authenticity scores and detailed analysis of review patterns and behaviors.</p>
                  </div>
                </div>
                
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl blur-sm group-hover:blur-md transition-all duration-300" />
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                    <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Verified Analysis</h3>
                    <p className="text-muted-foreground text-sm">Focus on verified purchases and authentic reviewer behavior for reliable results.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* How it Works */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-3xl" />
              <div className="relative bg-card/60 backdrop-blur-sm border border-border/30 rounded-3xl p-8 max-w-4xl mx-auto">
                <div className="flex items-start gap-6">
                  <div className="p-3 bg-primary/10 rounded-2xl flex-shrink-0">
                    <Search className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">How it works</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Simply paste an Amazon product link below and our AI will analyze all the reviews 
                      for that product to detect fake, paid, or manipulated reviews. We examine review patterns, 
                      timing, language, and reviewer behavior to give you an authenticity assessment.
                    </p>
                  </div>
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

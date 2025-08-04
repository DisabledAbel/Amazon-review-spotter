import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ReviewInput } from "@/components/ReviewInput";
import { AnalysisDisplay } from "@/components/AnalysisDisplay";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatBot } from "@/components/ChatBot";
import { YouTubeSearchWidget } from "@/components/YouTubeSearchWidget";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIDetector } from "@/components/AIDetector";
import { analyzeReview } from "@/utils/reviewAnalyzer";
import { ReviewData, AnalysisResult } from "@/types/review";
import { Shield, Search, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Reviews = () => {
  const { user, loading } = useAuth();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  // Listen for product analysis requests from YouTube search
  useEffect(() => {
    const handleAnalyzeProduct = (event: CustomEvent) => {
      const { url } = event.detail;
      if (url) {
        // Auto-fill the URL and trigger analysis
        const urlInput = document.querySelector('input[placeholder*="Amazon"]') as HTMLInputElement;
        if (urlInput) {
          urlInput.value = url;
          urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Trigger analysis
          setTimeout(() => {
            const analyzeButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (analyzeButton) {
              analyzeButton.click();
            }
          }, 100);
        }
      }
    };

    const handleShowYouTubeSearch = (event: CustomEvent) => {
      console.log("showYouTubeSearch event received:", event.detail);
      const { productTitle } = event.detail;
      if (productTitle) {
        // Scroll to YouTube search widget and trigger search
        const youtubeWidget = document.querySelector('[data-component="youtube-search"]');
        console.log("YouTube widget found:", youtubeWidget);
        if (youtubeWidget) {
          youtubeWidget.scrollIntoView({ behavior: 'smooth' });
          
          // Trigger search with product title
          const searchInput = youtubeWidget.querySelector('input') as HTMLInputElement;
          const searchButton = youtubeWidget.querySelector('button[type="submit"]') as HTMLButtonElement;
          
          console.log("Search input found:", searchInput);
          console.log("Search button found:", searchButton);
          
          if (searchInput && searchButton) {
            searchInput.value = `${productTitle} review`;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            console.log("Setting search value to:", `${productTitle} review`);
            setTimeout(() => {
              console.log("Clicking search button");
              searchButton.click();
            }, 100);
          }
        }
      }
    };

    window.addEventListener('analyzeProduct', handleAnalyzeProduct as EventListener);
    window.addEventListener('showYouTubeSearch', handleShowYouTubeSearch as EventListener);
    
    return () => {
      window.removeEventListener('analyzeProduct', handleAnalyzeProduct as EventListener);
      window.removeEventListener('showYouTubeSearch', handleShowYouTubeSearch as EventListener);
    };
  }, []);

  const handleAnalyze = async (reviewData: ReviewData) => {
    // Validate user authentication before analysis
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to analyze product reviews.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeReview(reviewData);
      setAnalysisResult(result);
      
      // Dispatch event to trigger chatbot YouTube video search
      const productAnalyzedEvent = new CustomEvent('productAnalyzed', {
        detail: { productTitle: result.productInfo.title }
      });
      window.dispatchEvent(productAnalyzedEvent);
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('Authentication required') || errorMessage.includes('401')) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('429')) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Please wait before analyzing another product.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('400')) {
        toast({
          title: "Invalid Request",
          description: "Please check your product URL and try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: "Unable to analyze reviews. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-3 bg-primary rounded-2xl shadow-lg w-fit mx-auto">
            <Shield className="h-8 w-8 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="p-3 bg-primary rounded-2xl shadow-lg w-fit mx-auto">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground">Please log in to access the review analysis features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <AppSidebar />
      <ChatBot />
      
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Review Analysis</h1>
              <p className="text-muted-foreground">Analyze Amazon product reviews for authenticity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {!analysisResult ? (
          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-card rounded-xl p-6 shadow-sm border max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">How it works</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Simply paste an Amazon product link below and our AI will analyze all the reviews 
                    for that product to detect fake, paid, or manipulated reviews. We examine review patterns, 
                    timing, language, and reviewer behavior to give you an authenticity assessment.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ReviewInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              <div data-component="youtube-search">
                <YouTubeSearchWidget />
              </div>
            </div>

            {/* AI Content Detector Section */}
            <div className="max-w-4xl mx-auto">
              <AIDetector context="general" />
            </div>
          </div>
        ) : (
          <>
            <AnalysisDisplay result={analysisResult} onReset={handleReset} />
            
            {/* YouTube Search Widget - Always rendered but hidden when analysis result is shown */}
            <div className="mt-8">
              <div data-component="youtube-search">
                <YouTubeSearchWidget />
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>This tool is for educational and research purposes. Results should be used as guidance only.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reviews;
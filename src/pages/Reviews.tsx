import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ReviewInput } from "@/components/ReviewInput";
import { AnalysisDisplay } from "@/components/AnalysisDisplay";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatBot } from "@/components/ChatBot";
import { ReviewTips } from "@/components/ReviewTips";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProductVideos } from "@/components/ProductVideos";
import { analyzeReview } from "@/utils/reviewAnalyzer";
import { ReviewData, AnalysisResult } from "@/types/review";
import { Shield, Search, AlertTriangle, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Reviews = () => {
const { user, loading, isGuest } = useAuth();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const { toast } = useToast();

  // Listen for product analysis requests
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

    window.addEventListener('analyzeProduct', handleAnalyzeProduct as EventListener);
    
    return () => {
      window.removeEventListener('analyzeProduct', handleAnalyzeProduct as EventListener);
    };
  }, []);

  const handleAnalyze = async (reviewData: ReviewData) => {
    // No authentication required for basic analysis

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeReview(reviewData);
      setAnalysisResult(result);
      
      // Switch to analysis tab to show results
      setActiveTab("analysis");
      
      // Dispatch event to inform chatbot about the analyzed product
      const productAnalyzedEvent = new CustomEvent('productAnalyzed', {
        detail: { productTitle: result.productInfo.title }
      });
      window.dispatchEvent(productAnalyzedEvent);
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Enhanced error handling with user-friendly messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      if (errorMessage.includes('AMAZON_BLOCKED')) {
        toast({
          title: "⚠️ Amazon Bot Protection Active",
          description: "Amazon blocked scraping. Wait 5-10 minutes and try the Refresh Data button. Check Videos tab for alternatives.",
          variant: "default",
          duration: 8000,
        });
      } else if (errorMessage.includes('Authentication required') || errorMessage.includes('401')) {
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

  const handleRefresh = async (productUrl: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeReview({ productLink: productUrl });
      setAnalysisResult(result);
      setActiveTab("analysis");
      
      toast({
        title: "Analysis Refreshed",
        description: "Successfully refreshed with latest data",
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
  };

  // Show minimal loading only while checking auth
  if (loading) {
    return null; // Don't block the UI while auth loads
  }

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <AppSidebar />
      
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

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {!analysisResult ? (
              <div className="space-y-8">
                {/* Introduction */}
                <div className="bg-card rounded-xl p-6 shadow-sm border">
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

                <ReviewTips />

                <div>
                  <ReviewInput onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
                </div>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="analysis" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Analysis
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Videos
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="analysis">
                  <AnalysisDisplay 
                    result={analysisResult} 
                    onReset={handleReset}
                    onRefresh={handleRefresh}
                  />
                </TabsContent>
                
                <TabsContent value="videos">
                  <ProductVideos 
                    videos={analysisResult.realAnalysis?.productVideos}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* AI Assistant Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <ChatBot inline />
            </div>
          </div>
        </div>

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
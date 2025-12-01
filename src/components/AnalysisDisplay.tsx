
import { useState, useEffect } from "react";
import { AnalysisResult } from "@/types/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { secureStorage } from "@/lib/secureStorage";
import { AIAssistant } from "@/components/AIAssistant";
import { ProductMediaGallery } from "@/components/ProductMediaGallery";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Shield,
  Eye,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Loader2,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AnalysisDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
  onRefresh: (productUrl: string) => Promise<void>;
}

export const AnalysisDisplay = ({ result, onReset, onRefresh }: AnalysisDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Store product context for chatbot using secure storage
  useEffect(() => {
    if (result) {
      const productContext = {
        title: result.productInfo.title,
        score: Math.round(result.genuinenessScore * 10),
        verdict: result.finalVerdict,
        redFlags: result.redFlags
      };
      secureStorage.setProductAnalysis(productContext);
    }
  }, [result]);

  // YouTube video search disabled per user request
  // useEffect(() => {
  //   const findVideos = async () => {
  //     if (!result?.productInfo?.title) return;
  //     
  //     setLoadingVideos(true);
  //     try {
  //       const { data, error } = await supabase.functions.invoke('gemini-video-finder', {
  //         body: {
  //           productTitle: result.productInfo.title,
  //           productAsin: result.productInfo.asin
  //         }
  //       });

  //       if (error) throw error;
  //       
  //       if (data?.videos && data.videos.length > 0) {
  //         setYoutubeVideos(data.videos);
  //         toast({
  //           title: "Videos Found!",
  //           description: `Found ${data.videos.length} relevant YouTube reviews for this product`
  //         });
  //       }
  //     } catch (error) {
  //       console.error('Error finding videos:', error);
  //     } finally {
  //       setLoadingVideos(false);
  //     }
  //   };

  //   findVideos();
  // }, [result, toast]);

  // Generate AI summary of reviews - Removed as AI summary now comes from edge function cache

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    if (score >= 4) return "text-orange-600";
    return "text-red-600";
  };

  const getVerdictColor = (verdict: string) => {
    if (verdict.includes("Genuine")) return "bg-green-100 text-green-800 border-green-200";
    if (verdict.includes("Suspicious")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (verdict.includes("Fake")) return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getVerdictIcon = (verdict: string) => {
    if (verdict.includes("Genuine")) return <CheckCircle className="h-4 w-4" />;
    if (verdict.includes("Fake") || verdict.includes("Suspicious")) return <XCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const handleSaveProduct = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Save product to local storage for now
      const productData = {
        id: Date.now().toString(),
        product_url: result.productInfo.link,
        product_title: result.productInfo.title,
        product_image: result.productInfo.image,
        asin: result.productInfo.asin,
        analysis_score: result.realAnalysis?.authenticityPercentage || Math.round(result.genuinenessScore * 10),
        analysis_verdict: result.finalVerdict,
        total_reviews: result.realAnalysis?.totalReviews || 0,
        fake_review_count: result.realAnalysis?.individualReviews?.filter(r => r.authenticityScore < 50).length || 0,
        confidence_score: result.genuinenessScore * 10 || 0,
        analysis_data: JSON.parse(JSON.stringify(result)),
        created_at: new Date().toISOString()
      };

      const savedProducts = JSON.parse(localStorage.getItem('saved_products') || '[]');
      savedProducts.push(productData);
      localStorage.setItem('saved_products', JSON.stringify(savedProducts));

      setIsSaved(true);
      toast({
        title: "Success",
        description: "Product saved to your collection"
      });
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    
    try {
      // Delete the cache entry for this product
      const { error: deleteError } = await supabase
        .from('scraped_products_cache')
        .delete()
        .eq('asin', result.productInfo.asin);

      if (deleteError) {
        console.error('Error deleting cache:', deleteError);
        throw new Error('Failed to clear cache');
      }

      toast({
        title: "Cache Cleared",
        description: "Refreshing analysis with latest data...",
      });

      // Trigger re-analysis
      await onRefresh(result.productInfo.link);
      
    } catch (error) {
      console.error('Error refreshing cache:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh analysis",
        variant: "destructive"
      });
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analysis Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Analyze Another Product
            </Button>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleRefreshCache}
                disabled={refreshing}
                variant="outline"
                className="flex items-center gap-2"
                title="Clear cache and fetch fresh data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </Button>
              {user && (
                <Button 
                  onClick={handleSaveProduct}
                  disabled={saving || isSaved}
                  variant={isSaved ? "outline" : "default"}
                  className="flex items-center gap-2"
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  {saving ? "Saving..." : isSaved ? "Saved" : "Save Product"}
                </Button>
              )}
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Analysis Complete</span>
              </div>
            </div>
          </div>

          {/* Genuineness Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Overall Review Authenticity Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress value={result.realAnalysis?.authenticityPercentage || result.genuinenessScore * 10} className="h-3" />
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(result.genuinenessScore)}`}>
                  {result.realAnalysis?.authenticityPercentage || Math.round(result.genuinenessScore * 10)}%
                </div>
              </div>
              <p className="mt-2 text-slate-600">{result.scoreExplanation}</p>
              
              {result.realAnalysis && (
                <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-800">{result.realAnalysis.totalReviews}</div>
                    <div className="text-sm text-blue-600">Total Reviews</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-800">{result.realAnalysis.verificationRate}%</div>
                    <div className="text-sm text-blue-600">Verified Purchases</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-800">
                      {Object.values(result.realAnalysis.ratingDistribution).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-sm text-blue-600">Analyzed Reviews</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weird/Suspicious Reviews - Enhanced */}
          <Card className={result.redFlags.length > 0 ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {result.redFlags.length > 0 ? "🚨 Weird & Suspicious Review Patterns Detected" : "✅ No Suspicious Patterns Found"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.redFlags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-3">
                    Our AI has identified the following suspicious patterns that suggest potential review manipulation:
                  </p>
                  {result.redFlags.map((flag, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 bg-white border border-red-200 rounded-lg shadow-sm">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-red-800 font-medium">{flag}</span>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-red-800 text-sm font-medium">
                      ⚠️ Recommendation: Be cautious when making purchasing decisions based on these reviews. Consider looking for more recent, verified reviews from different sources.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 bg-white border border-green-200 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">No significant suspicious patterns detected in the review analysis</span>
                  </div>
                  <p className="text-sm text-slate-600">
                    The reviews appear to follow natural patterns with diverse language, realistic timing, and authentic reviewer behavior.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI-Powered Product Summary */}
          {result.realAnalysis?.aiProductSummary && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  🤖 AI Product Summary
                  <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                    Powered by Gemini
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  AI-generated comprehensive summary based on all customer reviews
                </p>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="p-4 bg-white border border-blue-200 rounded-lg whitespace-pre-wrap leading-relaxed">
                    {result.realAnalysis.aiProductSummary}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* YouTube Videos Section - Disabled */}

          {/* Product Media Gallery - Images and Videos from Amazon */}
          <ProductMediaGallery 
            images={result.productInfo.images}
            videos={result.realAnalysis?.productVideos}
            productTitle={result.productInfo.title}
          />



          {/* Individual Reviews Analysis */}
          {result.realAnalysis?.individualReviews && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Individual Review Analysis & Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.realAnalysis.individualReviews.slice(0, 5).map((review, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-slate-800">{review.author}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-500' : 'text-gray-300'}`}>★</span>
                              ))}
                            </div>
                            {review.verified && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-sm mb-2">{review.title}</h4>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${review.authenticityScore >= 70 ? 'text-green-600' : review.authenticityScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {review.authenticityScore}%
                          </div>
                          <div className="text-xs text-slate-500">Authenticity</div>
                        </div>
                      </div>
                      
                      {review.suspiciousPatterns.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded p-2">
                          <div className="text-sm font-medium text-red-800 mb-1">Suspicious Patterns:</div>
                          <div className="text-xs text-red-700">
                            {review.suspiciousPatterns.slice(0, 2).join('; ')}
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex items-center gap-2"
                        onClick={() => window.open(review.link, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Review on Amazon
                      </Button>
                    </div>
                  ))}
                  
                  {result.realAnalysis.individualReviews.length > 5 && (
                    <div className="text-center pt-4">
                      <p className="text-sm text-slate-600">
                        Showing 5 of {result.realAnalysis.individualReviews.length} analyzed reviews
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Final Verdict */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Final Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                className={`text-sm px-4 py-2 flex items-center gap-2 w-fit ${getVerdictColor(result.finalVerdict)}`}
                variant="outline"
              >
                {getVerdictIcon(result.finalVerdict)}
                {result.finalVerdict}
              </Badge>
              <p className="mt-4 text-slate-600">{result.verdictExplanation}</p>
            </CardContent>
          </Card>
        </div>

        {/* Product Information - Right Side */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Product Being Analyzed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={result.productInfo.image} 
                  alt={result.productInfo.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder.svg";
                  }}
                />
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium text-slate-800 line-clamp-2">
                  {result.productInfo.title}
                </h3>
                
                {result.productInfo.asin && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">ASIN:</span> {result.productInfo.asin}
                  </p>
                )}
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center gap-2"
                    onClick={() => window.open(result.productInfo.link, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on Amazon
                  </Button>
                  
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* AI Assistant Chatbot */}
      <AIAssistant />
    </div>
  );
};

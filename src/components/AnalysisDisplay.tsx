
import { AnalysisResult } from "@/types/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Shield,
  Eye,
  ExternalLink
} from "lucide-react";

interface AnalysisDisplayProps {
  result: AnalysisResult;
  onReset: () => void;
}

export const AnalysisDisplay = ({ result, onReset }: AnalysisDisplayProps) => {
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

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analysis Content - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Analyze Another Product
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-slate-700">Analysis Complete</span>
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
                  <Progress value={result.genuinenessScore * 10} className="h-3" />
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(result.genuinenessScore)}`}>
                  {result.genuinenessScore}/10
                </div>
              </div>
              <p className="mt-2 text-slate-600">{result.scoreExplanation}</p>
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
                
                <Button 
                  variant="outline" 
                  className="w-full flex items-center gap-2"
                  onClick={() => window.open(result.productInfo.link, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Amazon
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

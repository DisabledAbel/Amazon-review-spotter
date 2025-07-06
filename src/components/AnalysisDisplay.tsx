
import { AnalysisResult } from "@/types/review";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, 
  FileText, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  Shield
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={onReset} variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Analyze Another Review
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
            🧠 1. Genuineness Score
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

      {/* Review Content Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            🗒️ 2. Review Content Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Specificity and Detail Level</h4>
            <p className="text-slate-600">{result.contentAnalysis.specificity}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Language Patterns</h4>
            <p className="text-slate-600">{result.contentAnalysis.languagePatterns}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Emotional Tone</h4>
            <p className="text-slate-600">{result.contentAnalysis.emotionalTone}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Product Alignment</h4>
            <p className="text-slate-600">{result.contentAnalysis.productAlignment}</p>
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Profile Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            🔍 3. Reviewer Profile Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Activity Patterns</h4>
            <p className="text-slate-600">{result.profileAnalysis.activityPatterns}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Review Consistency</h4>
            <p className="text-slate-600">{result.profileAnalysis.reviewConsistency}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Verification Status</h4>
            <p className="text-slate-600">{result.profileAnalysis.verificationStatus}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Profile Credibility</h4>
            <p className="text-slate-600">{result.profileAnalysis.credibility}</p>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            🚩 4. Red Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.redFlags.length > 0 ? (
            <div className="space-y-2">
              {result.redFlags.map((flag, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-red-800">{flag}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-green-800">No significant red flags detected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Verdict */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ✅ 5. Final Verdict
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
  );
};

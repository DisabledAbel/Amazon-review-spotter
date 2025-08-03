import { HistoricalAnalysis } from "@/components/HistoricalAnalysis";
import { ChatBot } from "@/components/ChatBot";
import { YouTubeSearchWidget } from "@/components/YouTubeSearchWidget";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AIDetector } from "@/components/AIDetector";

const HistoricalAnalysisPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <ChatBot />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <HistoricalAnalysis />
          
          {/* YouTube Search Section */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">YouTube Product Reviews</h2>
            <YouTubeSearchWidget />
          </div>

          {/* AI Content Detector Section */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <AIDetector context="review" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalAnalysisPage;
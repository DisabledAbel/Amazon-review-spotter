import { HistoricalAnalysis } from "@/components/HistoricalAnalysis";
import { ChatBot } from "@/components/ChatBot";
import { ThemeToggle } from "@/components/ThemeToggle";

const HistoricalAnalysisPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <ChatBot />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-8">
          <HistoricalAnalysis />
        </div>
      </div>
    </div>
  );
};

export default HistoricalAnalysisPage;
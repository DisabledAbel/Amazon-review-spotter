
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/components/LandingPage";
import { AppSidebar } from "@/components/AppSidebar";
import { ChatBot } from "@/components/ChatBot";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PWAPrompt } from "@/components/PWAPrompt";
import { InstallationGuide } from "@/components/InstallationGuide";
import { Shield, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const { user, loading } = useAuth();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // Show installation guide for new users
  useEffect(() => {
    if (user) {
      const hasSeenGuide = localStorage.getItem('has-seen-install-guide');
      if (!hasSeenGuide) {
        setShowInstallGuide(true);
        localStorage.setItem('has-seen-install-guide', 'true');
      }
    }
  }, [user]);

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
      <>
        <ThemeToggle />
        <PWAPrompt />
        <LandingPage />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      <AppSidebar />
      <ChatBot />
      <PWAPrompt />
      <InstallationGuide 
        open={showInstallGuide} 
        onOpenChange={setShowInstallGuide} 
      />
      
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Amazon Review Spotter</h1>
              <p className="text-muted-foreground">Your dashboard for review analysis tools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-card rounded-xl p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Welcome to Amazon Review Spotter</h2>
            <p className="text-muted-foreground mb-6">
              Analyze Amazon product reviews for authenticity and view customer review videos directly from Amazon.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Review Analysis Card */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open('/reviews', '_self')}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Review Analysis</CardTitle>
                  </div>
                  <CardDescription>
                    Analyze Amazon product reviews for authenticity and detect fake reviews
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Start Analysis
                  </Button>
                </CardContent>
              </Card>

              {/* Historical Analysis Card */}
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open('/historical-analysis', '_self')}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Historical Analysis</CardTitle>
                  </div>
                  <CardDescription>
                    View historical analysis data and track authenticity trends over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View History
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold">10K+</CardTitle>
                <CardDescription>Products Analyzed</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold">95%</CardTitle>
                <CardDescription>Accuracy Rate</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl font-bold">5K+</CardTitle>
                <CardDescription>Active Users</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

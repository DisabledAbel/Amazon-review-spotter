import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Eye, Star, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Real-time Analysis",
      description: "Advanced AI analyzes Amazon reviews in real-time to detect fake, paid, or manipulated content"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Authenticity Score",
      description: "Get a comprehensive authenticity percentage based on reviewer patterns and linguistic analysis"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Instant Results",
      description: "Get detailed analysis reports in seconds with individual review breakdowns and red flags"
    },
    {
      icon: <Star className="h-6 w-6" />,
      title: "Save & Track",
      description: "Save analyzed products and track their review authenticity over time"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-24">
          <div className="text-center space-y-8">
            {/* Logo and Title */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-3 bg-primary rounded-2xl shadow-lg">
                <Shield className="h-10 w-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Amazon Review Spotter
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Spot fake reviews with AI-powered analysis
                </p>
              </div>
            </div>

            {/* Main CTA */}
            <div className="space-y-6">
              <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed">
                Don't get fooled by fake reviews. Our AI highlights clear risk signals and review patterns so you can make informed decisions. By combining our insights with product details and seller history, you can avoid wasting money on items that haven't earned your trust.
              </p>
              
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button 
                  onClick={() => navigate('/reviews')}
                  size="lg" 
                  className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Try It Now - No Signup Needed
                </Button>
                
                <Button 
                  onClick={() => navigate('/auth')}
                  size="lg"
                  variant="outline"
                  className="h-14 px-8 text-lg font-semibold"
                >
                  Sign Up to Save Results
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Free forever • No credit card required • Instant analysis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Review Spotter?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI technology combined with real-time web scraping to give you the most accurate review analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-muted/50 hover:border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="p-2 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                  <div className="text-primary">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-muted/20 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to analyze any Amazon product
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Paste Amazon URL",
                description: "Copy and paste any Amazon product link into our analyzer"
              },
              {
                step: "2", 
                title: "AI Analysis",
                description: "Our AI scrapes and analyzes all reviews for authenticity patterns"
              },
              {
                step: "3",
                title: "Get Results",
                description: "Receive detailed authenticity scores and red flag warnings"
              }
            ].map((item, index) => (
              <div key={index} className="text-center space-y-4">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-xl">{item.title}</h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Trusted by Smart Shoppers
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: <CheckCircle className="h-6 w-6" />, text: "Real-time analysis" },
              { icon: <CheckCircle className="h-6 w-6" />, text: "No fake data simulation" },
              { icon: <CheckCircle className="h-6 w-6" />, text: "Secure email authentication" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3 justify-center text-lg">
                <div className="text-green-500">{item.icon}</div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>

          <Button 
            onClick={() => navigate('/auth')}
            size="lg" 
            variant="outline"
            className="h-12 px-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            Get Started Now
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center gap-4">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">Amazon Review Spotter</span>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Educational and research purposes only. Results should be used as guidance.
          </p>
        </div>
      </footer>
    </div>
  );
};
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewData } from "@/types/review";
import { Loader2, Link } from "lucide-react";
import { ScrapeProgressIndicator } from "./ScrapeProgressIndicator";
import { ScrapeProgress } from "@/hooks/useScrapeProgress";

interface ReviewInputProps {
  onAnalyze: (data: ReviewData) => void;
  isAnalyzing: boolean;
  scrapeProgress?: ScrapeProgress;
}

export const ReviewInput = ({ onAnalyze, isAnalyzing, scrapeProgress }: ReviewInputProps) => {
  const [productLink, setProductLink] = useState("");

  // Enhanced URL validation
  const validateAmazonURL = (url: string): boolean => {
    try {
      const parsedUrl = new URL(url);
      const validDomains = [
        'amazon.com', 'www.amazon.com', 
        'amazon.co.uk', 'www.amazon.co.uk',
        'amazon.ca', 'www.amazon.ca',
        'amazon.de', 'www.amazon.de',
        'amazon.fr', 'www.amazon.fr',
        'amazon.it', 'www.amazon.it',
        'amazon.es', 'www.amazon.es',
        'amazon.co.jp', 'www.amazon.co.jp'
      ];
      
      const isValidDomain = validDomains.some(domain => 
        parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
      );
      
      const hasProductId = parsedUrl.pathname.includes('/dp/') || parsedUrl.pathname.includes('/gp/product/');
      
      return isValidDomain && hasProductId;
    } catch {
      return false;
    }
  };

  const sanitizeURL = (url: string): string => {
    try {
      const parsedUrl = new URL(url);
      // Remove tracking parameters for privacy
      const cleanParams = new URLSearchParams();
      
      // Keep only essential Amazon parameters
      const allowedParams = ['tag', 'ref', 'psc'];
      for (const [key, value] of parsedUrl.searchParams) {
        if (allowedParams.includes(key)) {
          cleanParams.set(key, value);
        }
      }
      
      parsedUrl.search = cleanParams.toString();
      return parsedUrl.toString();
    } catch {
      return url;
    }
  };

  const handleSubmit = () => {
    const trimmedLink = productLink.trim();
    
    if (!validateAmazonURL(trimmedLink)) {
      return; // Invalid URL, don't proceed
    }
    
    const sanitizedLink = sanitizeURL(trimmedLink);
    
    const data: ReviewData = {
      productLink: sanitizedLink,
    };
    onAnalyze(data);
  };

  const isValid = productLink.trim().length > 0 && validateAmazonURL(productLink.trim());

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Product Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="product-link">Amazon Product Link *</Label>
            <Input
              id="product-link"
              placeholder="https://www.amazon.com/product-name/dp/PRODUCT_ID"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              className="mt-1"
              disabled={isAnalyzing}
            />
          </div>

          {scrapeProgress && scrapeProgress.status !== 'idle' && (
            <ScrapeProgressIndicator progress={scrapeProgress} />
          )}
          
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isAnalyzing}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Scraping Reviews...
              </>
            ) : (
              "Analyze Product Reviews"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

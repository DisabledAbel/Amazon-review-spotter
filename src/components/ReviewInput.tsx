
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewData } from "@/types/review";
import { Loader2, Link } from "lucide-react";

interface ReviewInputProps {
  onAnalyze: (data: ReviewData) => void;
  isAnalyzing: boolean;
}

export const ReviewInput = ({ onAnalyze, isAnalyzing }: ReviewInputProps) => {
  const [productLink, setProductLink] = useState("");

  const handleSubmit = () => {
    const data: ReviewData = {
      productLink,
    };
    onAnalyze(data);
  };

  const isValid = productLink.trim().length > 0;

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
            />
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isAnalyzing}
            className="w-full h-12 text-lg font-semibold"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Analyzing Product Reviews...
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

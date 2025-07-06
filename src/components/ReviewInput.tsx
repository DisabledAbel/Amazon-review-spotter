
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ReviewData } from "@/types/review";
import { Loader2, FileText, User } from "lucide-react";

interface ReviewInputProps {
  onAnalyze: (data: ReviewData) => void;
  isAnalyzing: boolean;
}

export const ReviewInput = ({ onAnalyze, isAnalyzing }: ReviewInputProps) => {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [totalReviews, setTotalReviews] = useState("");
  const [reviewFrequency, setReviewFrequency] = useState("");
  const [verifiedPurchase, setVerifiedPurchase] = useState(true);
  const [profileAge, setProfileAge] = useState("");

  const handleSubmit = () => {
    const data: ReviewData = {
      reviewText,
      rating: parseInt(rating) || 5,
      reviewerName,
      totalReviews: parseInt(totalReviews) || 0,
      reviewFrequency,
      verifiedPurchase,
      profileAge,
    };
    onAnalyze(data);
  };

  const isValid = reviewText.trim().length > 0 && rating;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Review Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="review-text">Review Text *</Label>
            <Textarea
              id="review-text"
              placeholder="Enter the full review text here..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="rating">Star Rating *</Label>
            <Input
              id="rating"
              type="number"
              min="1"
              max="5"
              placeholder="1-5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reviewer Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Reviewer Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="reviewer-name">Reviewer Name</Label>
            <Input
              id="reviewer-name"
              placeholder="e.g., John D."
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="total-reviews">Total Reviews Written</Label>
            <Input
              id="total-reviews"
              type="number"
              placeholder="e.g., 25"
              value={totalReviews}
              onChange={(e) => setTotalReviews(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="review-frequency">Review Frequency Pattern</Label>
            <Input
              id="review-frequency"
              placeholder="e.g., 5 reviews in last week"
              value={reviewFrequency}
              onChange={(e) => setReviewFrequency(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="profile-age">Profile Age</Label>
            <Input
              id="profile-age"
              placeholder="e.g., 2 years, 6 months"
              value={profileAge}
              onChange={(e) => setProfileAge(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="verified-purchase"
              checked={verifiedPurchase}
              onCheckedChange={setVerifiedPurchase}
            />
            <Label htmlFor="verified-purchase">Verified Purchase</Label>
          </div>
        </CardContent>
      </Card>

      {/* Analyze Button */}
      <div className="md:col-span-2">
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isAnalyzing}
          className="w-full h-12 text-lg font-semibold"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Analyzing Review...
            </>
          ) : (
            "Analyze Review Authenticity"
          )}
        </Button>
      </div>
    </div>
  );
};

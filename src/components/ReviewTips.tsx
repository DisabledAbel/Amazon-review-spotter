import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, SortDesc, Filter, AlertTriangle } from "lucide-react";

export const ReviewTips = () => {
  return (
    <section aria-labelledby="review-tips-heading" className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle id="review-tips-heading" className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Review Tips for Better Judgement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SortDesc className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">1. Change Review Filters</h3>
              <Badge variant="outline" className="ml-2">WIRED</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Switch the review sorting from “Top reviews” to “Most recent”. This can surface up-to-date, possibly more honest feedback rather than older or promoted ones.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">2. Avoid Misleading Variation Reviews</h3>
              <Badge variant="outline" className="ml-2">WIRED</Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Some listings bundle different products under one umbrella to carry over average ratings. Expand “See more reviews” and use the “All formats” dropdown to isolate reviews specific to the variant you're considering.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">3. Spot Red Flags in Reviews</h3>
            </div>
            <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1">
              <li>An overabundance of 5-star reviews</li>
              <li>Generic or one-liner praise</li>
              <li>Repetitive wording across reviews</li>
              <li>Poor grammar or vague language</li>
              <li>Reviews containing both praise and a small, seemingly strategic flaw</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ReviewTips;

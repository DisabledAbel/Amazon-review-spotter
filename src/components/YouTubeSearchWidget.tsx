import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, ShoppingCart, Youtube, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
  amazonLinks: string[];
}

interface YouTubeSearchResponse {
  videos: VideoItem[];
  totalResults: number;
  error?: string;
}

export const YouTubeSearchWidget = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-search', {
        body: { 
          query: searchQuery,
          maxResults: 6,
          order: 'relevance'
        }
      });

      if (error) throw error;

      const response: YouTubeSearchResponse = data;
      
      if (response.error) {
        throw new Error(response.error);
      }

      setVideos(response.videos || []);
      setTotalResults(response.totalResults || 0);
      setIsExpanded(true);
      
      const videosWithProducts = response.videos?.filter(v => v.amazonLinks.length > 0).length || 0;
      
      toast({
        title: "Search Complete",
        description: `Found ${response.videos?.length || 0} videos, ${videosWithProducts} contain Amazon products`
      });

    } catch (error) {
      console.error('YouTube search error:', error);
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search YouTube videos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeProduct = (amazonLink: string) => {
    // Trigger the existing review analysis by setting the URL
    const event = new CustomEvent('analyzeProduct', { detail: { url: amazonLink } });
    window.dispatchEvent(event);
    
    toast({
      title: "Product Analysis Started",
      description: "Starting review analysis for this product"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg">
            <Youtube className="h-5 w-5 text-white" />
          </div>
          Find Products in YouTube Videos
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search for product videos (e.g., 'iPhone 15 review', 'best laptops')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>

        {totalResults > 0 && (
          <p className="text-sm text-muted-foreground">
            Found {totalResults.toLocaleString()} total videos
          </p>
        )}

        {/* Collapsible Results */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {videos.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span>{videos.length} videos found</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 gap-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-24 h-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Results */}
            {!loading && videos.length > 0 && (
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        {/* Video Thumbnail */}
                        <div className="w-24 flex-shrink-0">
                          <div className="relative aspect-video">
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover rounded"
                            />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center group"
                                 onClick={() => window.open(video.url, '_blank')}>
                              <Youtube className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>

                        {/* Video Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <h4 className="font-medium text-sm line-clamp-2 hover:text-primary cursor-pointer"
                              onClick={() => window.open(video.url, '_blank')}>
                            {video.title}
                          </h4>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate">{video.channelTitle}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(video.publishedAt)}
                            </div>
                          </div>

                          {/* Amazon Products Found */}
                          {video.amazonLinks.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1">
                                <ShoppingCart className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-medium text-green-600">
                                  {video.amazonLinks.length} product{video.amazonLinks.length > 1 ? 's' : ''} found
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-1">
                                {video.amazonLinks.slice(0, 2).map((link, index) => (
                                  <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAnalyzeProduct(link)}
                                    className="text-xs h-6 px-2"
                                  >
                                    <ShoppingCart className="h-2 w-2 mr-1" />
                                    Analyze {index + 1}
                                  </Button>
                                ))}
                                {video.amazonLinks.length > 2 && (
                                  <Badge variant="secondary" className="text-xs h-6">
                                    +{video.amazonLinks.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <ShoppingCart className="h-3 w-3" />
                              <span className="text-xs">No products detected</span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(video.url, '_blank')}
                              className="text-xs h-6 px-2"
                            >
                              <ExternalLink className="h-2 w-2 mr-1" />
                              Watch
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* No Results */}
        {!loading && videos.length === 0 && searchQuery && (
          <div className="text-center py-4">
            <Youtube className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No videos found. Try different search terms.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
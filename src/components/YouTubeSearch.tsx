import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, ShoppingCart, Youtube, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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

export const YouTubeSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

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
          maxResults: 20,
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
    <div className="space-y-6">
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500 rounded-lg">
            <Youtube className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">YouTube Product Search</h1>
            <p className="text-muted-foreground">Find Amazon products mentioned in YouTube videos</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search for products in YouTube videos (e.g., 'best laptops 2024', 'phone review')"
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
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-32 h-20 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
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
        <div className="grid grid-cols-1 gap-4">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Video Thumbnail */}
                  <div className="md:w-80 flex-shrink-0">
                    <div className="relative aspect-video md:aspect-[16/9]">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors cursor-pointer flex items-center justify-center group"
                           onClick={() => window.open(video.url, '_blank')}>
                        <Youtube className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>

                  {/* Video Details */}
                  <div className="flex-1 p-4 space-y-3">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg line-clamp-2 hover:text-primary cursor-pointer"
                          onClick={() => window.open(video.url, '_blank')}>
                        {video.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {video.channelTitle}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(video.publishedAt)}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {video.description}
                    </p>

                    {/* Amazon Products Found */}
                    {video.amazonLinks.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            {video.amazonLinks.length} Amazon product{video.amazonLinks.length > 1 ? 's' : ''} found
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {video.amazonLinks.slice(0, 3).map((link, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleAnalyzeProduct(link)}
                              className="text-xs"
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Analyze Product {index + 1}
                            </Button>
                          ))}
                          {video.amazonLinks.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{video.amazonLinks.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm">No Amazon products detected</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Watch Video
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && videos.length === 0 && searchQuery && (
        <Card>
          <CardContent className="p-8 text-center">
            <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No videos found</h3>
            <p className="text-muted-foreground">
              Try different search terms or check your spelling
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!loading && videos.length === 0 && !searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold mx-auto">
                  1
                </div>
                <h4 className="font-medium">Search Videos</h4>
                <p className="text-sm text-muted-foreground">
                  Enter keywords to find YouTube videos about products
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold mx-auto">
                  2
                </div>
                <h4 className="font-medium">Detect Products</h4>
                <p className="text-sm text-muted-foreground">
                  AI scans video descriptions for Amazon product links
                </p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold mx-auto">
                  3
                </div>
                <h4 className="font-medium">Analyze Reviews</h4>
                <p className="text-sm text-muted-foreground">
                  Click to analyze product reviews for authenticity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
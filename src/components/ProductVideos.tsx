import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ExternalLink, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductVideosProps {
  productTitle: string;
  productAsin?: string;
}

interface Video {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  publishedAt?: string;
  description?: string;
}

export const ProductVideos = ({ productTitle, productAsin }: ProductVideosProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!productTitle) return;
      
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase.functions.invoke('youtube-search', {
          body: { 
            query: `${productTitle} review`,
            maxResults: 10
          }
        });

        if (fetchError) throw fetchError;

        if (data?.videos) {
          setVideos(data.videos);
        } else {
          setError("No videos found for this product.");
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
        setError("Failed to load videos. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [productTitle, productAsin]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Finding relevant YouTube videos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (videos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No videos found for this product.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Product Review Videos</h2>
          <p className="text-muted-foreground">Found {videos.length} relevant videos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Thumbnail */}
              {video.thumbnailUrl && (
                <div className="relative aspect-video md:col-span-1">
                  <img 
                    src={video.thumbnailUrl} 
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {/* Content */}
              <div className={video.thumbnailUrl ? "md:col-span-2" : "md:col-span-3"}>
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-lg">
                    {video.title}
                  </CardTitle>
                  <CardDescription className="space-y-2">
                    {video.channelTitle && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>{video.channelTitle}</span>
                      </div>
                    )}
                    {video.publishedAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {video.description}
                    </p>
                  )}
                  <Button 
                    onClick={() => window.open(video.url, '_blank')}
                    className="w-full md:w-auto"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

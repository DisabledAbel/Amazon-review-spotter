import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVideo } from "@/types/review";

interface ProductVideosProps {
  videos?: ProductVideo[];
}

export const ProductVideos = ({ videos = [] }: ProductVideosProps) => {


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
          <h2 className="text-2xl font-bold">Amazon Review Videos</h2>
          <p className="text-muted-foreground">
            {videos.length > 0 
              ? `Found ${videos.length} video${videos.length === 1 ? '' : 's'} from Amazon reviews` 
              : 'No videos found on the Amazon review page'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted">
              {video.thumbnail ? (
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Content */}
            <CardHeader>
              <CardTitle className="line-clamp-2 text-base">
                {video.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-3 text-xs">
                {video.duration && <span>{video.duration}</span>}
                {video.views && <span>{video.views} views</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.open(video.url, '_blank')}
                className="w-full"
                size="sm"
              >
                <Play className="h-4 w-4 mr-2" />
                Watch Video
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

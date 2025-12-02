import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Play, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductVideo, OnlineVideo } from "@/types/review";

interface ProductVideosProps {
  videos?: ProductVideo[];
  onlineVideos?: OnlineVideo[];
}

export const ProductVideos = ({ videos = [], onlineVideos = [] }: ProductVideosProps) => {

  if (videos.length === 0 && onlineVideos.length === 0) {
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
    <div className="space-y-8">
      {/* YouTube Videos Section */}
      {onlineVideos.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Youtube className="h-6 w-6 text-red-600" />
                YouTube Reviews & Analysis
              </h2>
              <p className="text-muted-foreground">
                {`Found ${onlineVideos.length} AI-curated video${onlineVideos.length === 1 ? '' : 's'} from YouTube`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {onlineVideos.map((video, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-base">
                    {video.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-3 text-xs">
                    {video.channel && <span className="font-medium">{video.channel}</span>}
                    {video.duration && <span>{video.duration}</span>}
                  </CardDescription>
                  {video.relevanceScore && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Relevance</span>
                        <span className="font-semibold">{video.relevanceScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${video.relevanceScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => window.open(video.url, '_blank')}
                    className="w-full"
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Amazon Product Videos Section */}
      {videos.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Amazon Product Videos</h2>
              <p className="text-muted-foreground">
                {`Found ${videos.length} video${videos.length === 1 ? '' : 's'} from Amazon product page`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
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
      )}
    </div>
  );
};

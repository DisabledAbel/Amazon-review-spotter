import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Image, Video, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { ProductVideo } from "@/types/review";

interface ProductMediaGalleryProps {
  images: string[];
  videos?: ProductVideo[];
  productTitle: string;
}

export const ProductMediaGallery = ({ images, videos, productTitle }: ProductMediaGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images?.length && !videos?.length) {
    return null;
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Product Images & Videos from Amazon
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          All media content from the Amazon product listing
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Images Section */}
        {images?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Image className="h-4 w-4" />
                Product Images ({images.length})
              </h3>
            </div>

            {/* Main Image Display */}
            <Dialog>
              <DialogTrigger asChild>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group">
                  <img
                    src={images[selectedImageIndex]}
                    alt={`${productTitle} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          prevImage();
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage();
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <img
                  src={images[selectedImageIndex]}
                  alt={`${productTitle} - Full size`}
                  className="w-full h-auto"
                />
              </DialogContent>
            </Dialog>

            {/* Thumbnail Grid */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Videos Section */}
        {videos && videos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Video className="h-4 w-4" />
                Product Videos ({videos.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((video, index) => (
                <div
                  key={index}
                  className="border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 text-white rounded-full p-3">
                        <Video className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {video.duration && <span>{video.duration}</span>}
                      {video.views && <span>{video.views} views</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(video.url, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View Video
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

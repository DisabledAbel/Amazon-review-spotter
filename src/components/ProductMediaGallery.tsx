import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Image, Video, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ProductVideo } from "@/types/review";

interface ProductMediaGalleryProps {
  images: string[];
  videos?: ProductVideo[];
  productTitle: string;
}

export const ProductMediaGallery = ({ images, videos, productTitle }: ProductMediaGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  if (!images?.length && !videos?.length) {
    return null;
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
    resetZoom();
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
    resetZoom();
  };

  const resetZoom = () => {
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 1));
    if (zoom <= 1.5) {
      setImagePosition({ x: 0, y: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });

    if (isDragging && zoom > 1) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setImagePosition({
        x: imagePosition.x + deltaX,
        y: imagePosition.y + deltaY,
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isDialogOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          prevImage();
          break;
        case 'ArrowRight':
          nextImage();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'Escape':
          setIsDialogOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDialogOpen, selectedImageIndex, zoom]);

  useEffect(() => {
    if (!isDialogOpen) {
      resetZoom();
    }
  }, [isDialogOpen]);

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

            {/* Main Image Display with Enhanced Carousel */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-zoom-in group">
                  <img
                    src={images[selectedImageIndex]}
                    alt={`${productTitle} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-contain transition-all duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/placeholder.svg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="h-3 w-3" />
                    Click to zoom
                  </div>
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          nextImage();
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
                <div className="relative w-full h-full bg-black">
                  {/* Zoom Controls */}
                  <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleZoomOut}
                      disabled={zoom <= 1}
                      className="bg-black/80 hover:bg-black/90 text-white"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <div className="bg-black/80 text-white px-3 py-2 rounded-md text-sm font-medium">
                      {Math.round(zoom * 100)}%
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className="bg-black/80 hover:bg-black/90 text-white"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Navigation Arrows */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-black/50 hover:bg-black/70 text-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-black/50 hover:bg-black/70 text-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}

                  {/* Image Counter */}
                  {images.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Zoomable Image Container */}
                  <div
                    ref={imageRef}
                    className="w-full h-[90vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <img
                      src={images[selectedImageIndex]}
                      alt={`${productTitle} - Full size`}
                      className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                      style={{
                        transform: `scale(${zoom}) translate(${imagePosition.x / zoom}px, ${imagePosition.y / zoom}px)`,
                        transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                      }}
                      draggable={false}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </div>

                  {/* Keyboard Shortcuts Helper */}
                  <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-md text-xs">
                    <div className="flex gap-4">
                      <span>← → Navigate</span>
                      <span>+ - Zoom</span>
                      <span>ESC Close</span>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Enhanced Thumbnail Grid with Smooth Transitions */}
            {images.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click any image to view • Use arrow keys to navigate
                </p>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        resetZoom();
                      }}
                      className={`group aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                        selectedImageIndex === index
                          ? "border-primary ring-2 ring-primary/30 scale-105 shadow-lg"
                          : "border-border hover:border-primary/50 hover:scale-105 hover:shadow-md"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.svg";
                        }}
                      />
                      {selectedImageIndex === index && (
                        <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
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

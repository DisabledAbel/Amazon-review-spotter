import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Bookmark, 
  Github, 
  LogOut, 
  Menu,
  ExternalLink,
  Trash2,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedProduct {
  id: string;
  product_title: string;
  product_url: string;
  product_image: string;
  analysis_score: number;
  analysis_verdict: string;
  saved_at: string;
}

export const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedProducts();
    }
  }, [user]);

  const fetchSavedProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_products')
        .select('*')
        .order('saved_at', { ascending: false });
      
      if (error) throw error;
      setSavedProducts(data || []);
    } catch (error) {
      console.error('Error fetching saved products:', error);
      toast({
        title: "Error",
        description: "Failed to load saved products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setSavedProducts(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Product removed from saved list"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error", 
        description: "Failed to remove product",
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="fixed top-4 right-4 z-50 shadow-lg">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account & Saved Products
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* User Profile */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">
                    @{user?.user_metadata?.user_name || 'github-user'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => window.open('/historical-analysis', '_self')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Historical Analysis
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => window.open('https://github.com/DisabledAbel/Amazon-review-spotter/issues', '_blank')}
              >
                <Github className="mr-2 h-4 w-4" />
                Support & Feedback
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start text-red-600 hover:text-red-700" 
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Saved Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Saved Products ({savedProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading saved products...</p>
              ) : savedProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No saved products yet. Analyze some Amazon products to save them here!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProducts.map((product) => (
                    <div key={product.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={product.product_image || '/placeholder.svg'} 
                          alt={product.product_title}
                          className="w-12 h-12 object-cover rounded border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-2">
                            {product.product_title}
                          </h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${getScoreColor(product.analysis_score)}`}>
                              {product.analysis_score}% Authentic
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {product.analysis_verdict}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(product.saved_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => window.open(product.product_url, '_blank')}
                        >
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View Product
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deleteSavedProduct(product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
};
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Calendar, TrendingDown, TrendingUp, AlertTriangle, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface HistoricalData {
  id: string;
  product_url: string;
  asin: string | null;
  product_title: string | null;
  analysis_score: number;
  analysis_verdict: string;
  total_reviews: number | null;
  fake_review_count: number | null;
  confidence_score: number | null;
  analyzed_at: string;
  analysis_data: any;
}

interface TimelineData {
  date: string;
  score: number;
  verdict: string;
  totalReviews: number;
  fakeCount: number;
  confidence: number;
}

export const HistoricalAnalysis = () => {
  const { toast } = useToast();
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<{ url: string; title: string; count: number }[]>([]);

  useEffect(() => {
    fetchHistoricalData();
  }, []);

  useEffect(() => {
    if (selectedProduct && historicalData.length > 0) {
      generateTimeline();
    }
  }, [selectedProduct, historicalData]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    try {
      const data = JSON.parse(localStorage.getItem('saved_products') || '[]');

      setHistoricalData(data.map((item: any) => ({
        ...item,
        analyzed_at: item.created_at
      })));
      
      // Group products and count analyses
      const productGroups = data.reduce((acc: Record<string, { title: string; count: number }>, item: any) => {
        const key = item.product_url;
        if (!acc[key]) {
          acc[key] = {
            title: item.product_title || 'Unknown Product',
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {});

      const productList = Object.entries(productGroups).map(([url, data]) => ({
        url,
        title: (data as any).title,
        count: (data as any).count
      }));

      setProducts(productList);
      
      if (productList.length > 0 && !selectedProduct) {
        setSelectedProduct(productList[0].url);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      toast({
        title: "Error",
        description: "Failed to load historical analysis data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateTimeline = () => {
    const productData = historicalData
      .filter(item => item.product_url === selectedProduct)
      .sort((a, b) => new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime());

    const timeline: TimelineData[] = productData.map(item => ({
      date: format(new Date(item.analyzed_at), 'MMM dd, yyyy'),
      score: item.analysis_score,
      verdict: item.analysis_verdict,
      totalReviews: item.total_reviews || 0,
      fakeCount: item.fake_review_count || 0,
      confidence: item.confidence_score || 0
    }));

    setTimelineData(timeline);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'trustworthy':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Trustworthy</Badge>;
      case 'suspicious':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Suspicious</Badge>;
      case 'highly suspicious':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Highly Suspicious</Badge>;
      default:
        return <Badge variant="outline">{verdict}</Badge>;
    }
  };

  const getTrendIcon = () => {
    if (timelineData.length < 2) return null;
    
    const latest = timelineData[timelineData.length - 1];
    const previous = timelineData[timelineData.length - 2];
    
    if (latest.score > previous.score) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (latest.score < previous.score) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historical Analysis</h2>
          <p className="text-muted-foreground">Track how review authenticity changes over time</p>
        </div>
        <Button onClick={fetchHistoricalData} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Eye className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No historical data available</p>
              <p className="text-sm text-muted-foreground">Analyze products to start tracking their review patterns over time</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Product
              </CardTitle>
              <CardDescription>Choose a product to view its analysis timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.url} value={product.url}>
                      <div className="flex justify-between items-center w-full">
                        <span className="truncate max-w-[300px]">{product.title}</span>
                        <Badge variant="outline" className="ml-2">{product.count} analyses</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Timeline Overview */}
          {timelineData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Analysis Timeline
                  {getTrendIcon()}
                </CardTitle>
                <CardDescription>
                  {timelineData.length} analysis{timelineData.length !== 1 ? 'es' : ''} tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(label) => `Date: ${label}`}
                        formatter={(value: number, name: string) => [
                          name === 'score' ? `${value}%` : value,
                          name === 'score' ? 'Authenticity Score' : 'Confidence'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confidence" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(var(--muted-foreground))", strokeWidth: 1, r: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Volume Analysis */}
          {timelineData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Review Volume Analysis</CardTitle>
                <CardDescription>Track total reviews and suspected fake reviews over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="totalReviews" fill="hsl(var(--primary))" name="Total Reviews" />
                      <Bar dataKey="fakeCount" fill="hsl(var(--destructive))" name="Suspected Fake" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis History Table */}
          {timelineData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Analysis History</CardTitle>
                <CardDescription>Detailed timeline of all analyses for this product</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {historicalData
                    .filter(item => item.product_url === selectedProduct)
                    .sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())
                    .map((item, index) => (
                      <div key={item.id}>
                        <div className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(item.analyzed_at), 'MMM dd, yyyy HH:mm')}
                            </div>
                            <div className={`text-lg font-semibold ${getScoreColor(item.analysis_score)}`}>
                              {item.analysis_score}%
                            </div>
                            {getVerdictBadge(item.analysis_verdict)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {item.total_reviews && (
                              <span>{item.total_reviews} reviews</span>
                            )}
                            {item.fake_review_count && (
                              <span className="text-red-600">{item.fake_review_count} suspected fake</span>
                            )}
                            {item.confidence_score && (
                              <span>{Math.round(item.confidence_score * 100)}% confidence</span>
                            )}
                          </div>
                        </div>
                        {index < historicalData.filter(item => item.product_url === selectedProduct).length - 1 && (
                          <Separator />
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
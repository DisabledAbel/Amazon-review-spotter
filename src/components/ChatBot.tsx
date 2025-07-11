import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, Bot, User, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { secureStorage } from "@/lib/secureStorage";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm here to help you understand Amazon reviews and product authenticity. Ask me anything about fake reviews, shopping tips, or how to identify suspicious patterns!",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const { toast } = useToast();

  // Rate limiting - max 10 messages per minute
  const RATE_LIMIT_INTERVAL = 60000; // 1 minute
  const MAX_MESSAGES_PER_INTERVAL = 10;

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const rateLimitKey = 'chat-rate-limit';
    
    const rateData = secureStorage.getItem<{ count: number; resetTime: number }>(rateLimitKey);
    
    if (!rateData || now > rateData.resetTime) {
      // Reset or initialize rate limit
      secureStorage.setItem(rateLimitKey, { 
        count: 1, 
        resetTime: now + RATE_LIMIT_INTERVAL 
      });
      return true;
    }
    
    if (rateData.count >= MAX_MESSAGES_PER_INTERVAL) {
      toast({
        title: "Rate limit exceeded",
        description: "Please wait before sending another message.",
        variant: "destructive"
      });
      return false;
    }
    
    // Increment count
    secureStorage.setItem(rateLimitKey, { 
      ...rateData, 
      count: rateData.count + 1 
    });
    return true;
  };

  // Input validation and sanitization
  const validateAndSanitizeInput = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    
    // Remove potentially dangerous characters and limit length
    const sanitized = text
      .trim()
      .replace(/[<>]/g, '') // Remove basic HTML chars
      .substring(0, 1000); // Limit message length
    
    return sanitized;
  };

  const sendMessage = async () => {
    const sanitizedInput = validateAndSanitizeInput(input);
    if (!sanitizedInput) return;

    // Check rate limit
    if (!checkRateLimit()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: sanitizedInput,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Safely get product context using secure storage
      const productContext = secureStorage.getItem<{
        title: string;
        score: number;
        verdict: string;
        redFlags?: string[];
      }>('current-product-analysis');

      const { data, error } = await supabase.functions.invoke('amazon-chat', {
        body: { 
          message: sanitizedInput,
          productContext: productContext
        }
      });

      if (error) throw error;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "Sorry, I couldn't process that request.",
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-[400px] sm:w-[500px] flex flex-col h-full">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Amazon Review Assistant
          </SheetTitle>
        </SheetHeader>

        <Card className="flex-1 flex flex-col mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ask me about Amazon reviews!</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-4 pb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    {message.isBot && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.isBot
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      <p className="leading-relaxed">{message.text}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    {!message.isBot && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-secondary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about fake reviews, shopping tips..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 text-xs text-muted-foreground">
                <p>Try asking: "How to spot fake reviews?" or "What makes a review suspicious?"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </SheetContent>
    </Sheet>
  );
};
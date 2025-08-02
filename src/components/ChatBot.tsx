import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Bot, User, Send, Loader2, Maximize2 } from "lucide-react";
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
      text: "Hi! I'm your Amazon Review Assistant powered by Google Gemini AI. I specialize in helping you understand product authenticity and spot fake reviews. Ask me anything about Amazon reviews, shopping tips, or product analysis!",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      const { data, error } = await supabase.functions.invoke('chatterbot-chat', {
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Amazon Review Assistant</h3>
                <p className="text-sm text-muted-foreground">Powered by Google Gemini AI</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {message.isBot && (
                    <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.isBot
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>
                    <div className="text-xs opacity-70 mt-2 flex items-center gap-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  {!message.isBot && (
                    <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="h-10 w-10 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Assistant is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t bg-background p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about Amazon reviews, fake review detection, or shopping tips..."
                  disabled={loading}
                  className="flex-1 h-12 px-4"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="h-12 px-6"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
              
              <div className="mt-3 text-sm text-muted-foreground text-center">
                <p>💡 Try: "How do I spot fake reviews?" • "Analyze this product" • "Shopping safety tips"</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
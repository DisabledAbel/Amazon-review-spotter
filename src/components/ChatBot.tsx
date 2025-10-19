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

interface ChatBotProps {
  inline?: boolean;
}

export const ChatBot = ({ inline = false }: ChatBotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your Amazon Review Assistant powered by Meta Llama 3.2 3B Instruct. I specialize in helping you understand product authenticity and spot fake reviews. Ask me anything about Amazon reviews, shopping tips, or product analysis!",
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

  // Listen for product analysis events to automatically provide context
  useEffect(() => {
    const handleProductAnalyzed = async (event: CustomEvent) => {
      const { productTitle } = event.detail;
      if (productTitle && (inline || isOpen)) {
        // Automatically send a message about the analyzed product
        const autoMessage: Message = {
          id: (Date.now() + 1000).toString(),
          text: `I see you just analyzed "${productTitle}". Feel free to ask me any questions about this product's reviews!`,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, autoMessage]);
      }
    };

    window.addEventListener('productAnalyzed', handleProductAnalyzed as EventListener);
    
    return () => {
      window.removeEventListener('productAnalyzed', handleProductAnalyzed as EventListener);
    };
  }, [inline, isOpen]);

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

  // Inline mode - renders as a card component
  if (inline) {
    return (
      <Card className="w-full flex flex-col h-[600px]">
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-semibold">AI Review Assistant</h3>
              <p className="text-xs text-muted-foreground">Meta Llama 3.2 3B</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {message.isBot && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      message.isBot
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{message.text}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  {!message.isBot && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t bg-background p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about reviews..."
                disabled={loading}
                className="flex-1 h-10 px-3 text-sm"
              />
              <Button 
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-10 px-4"
                size="sm"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Dialog mode - renders as floating button with dialog
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
      
      <DialogContent className="max-w-2xl w-full h-[65vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary rounded-lg">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Review Assistant</h3>
                <p className="text-xs text-muted-foreground">Meta Llama 3.2 3B</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {message.isBot && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-xl px-3 py-2 ${
                      message.isBot
                        ? 'bg-muted text-foreground'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{message.text}</div>
                    <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  {!message.isBot && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-secondary">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          <div className="border-t bg-background p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about reviews..."
                disabled={loading}
                className="flex-1 h-10 px-3 text-sm"
              />
              <Button 
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-10 px-4"
                size="sm"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
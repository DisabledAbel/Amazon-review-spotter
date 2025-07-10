import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, X, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(isRunningStandalone);
    
    // If not in standalone mode, force installation
    if (!isRunningStandalone) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setShowPrompt(true);
      };

      window.addEventListener('beforeinstallprompt', handler);
      
      // Show prompt after a delay if no install prompt available
      setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 2000);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // If no native prompt, redirect to prevent browser usage
      window.location.href = 'about:blank';
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      // If user dismisses, prevent browser usage
      window.location.href = 'about:blank';
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    // Don't allow dismissing - force installation
    handleInstall();
  };

  // Check if user dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const oneDayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < oneDayInMs) {
        setShowPrompt(false);
      }
    }
  }, []);

  // Don't show if already installed/running in standalone
  if (isStandalone || (!showPrompt && !deferredPrompt)) return null;

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 shadow-lg border-primary/20 bg-card/95 backdrop-blur-sm md:left-auto md:right-4 md:w-80">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Add to Home Screen</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Install Review Spotter for quick access and offline use
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="h-8 text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Install
              </Button>
              <Button onClick={handleDismiss} variant="outline" size="sm" className="h-8 text-xs">
                <X className="mr-1 h-3 w-3" />
                Force Install
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
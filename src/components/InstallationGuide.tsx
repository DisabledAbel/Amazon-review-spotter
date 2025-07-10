import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Smartphone, 
  Monitor, 
  Download, 
  CheckCircle, 
  Share, 
  MoreVertical,
  X,
  Settings
} from "lucide-react";

interface InstallationGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DeviceType = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'auto';

export const InstallationGuide = ({ open, onOpenChange }: InstallationGuideProps) => {
  const [deviceType, setDeviceType] = useState<DeviceType>('auto');
  const [detectedDevice, setDetectedDevice] = useState<DeviceType>('auto');

  useEffect(() => {
    // Auto-detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDetectedDevice('ios');
    } else if (/android/.test(userAgent)) {
      setDetectedDevice('android');
    } else if (/win/.test(platform)) {
      setDetectedDevice('windows');
    } else if (/mac/.test(platform)) {
      setDetectedDevice('mac');
    } else if (/linux/.test(platform)) {
      setDetectedDevice('linux');
    }
  }, []);

  const currentDevice = deviceType === 'auto' ? detectedDevice : deviceType;

  const installInstructions = {
    ios: {
      title: "🍎 iPhone / iPad (Safari)",
      icon: <Smartphone className="h-5 w-5" />,
      steps: [
        "Open the app in Safari browser",
        "Tap the Share icon (square with arrow up)",
        "Scroll down and tap 'Add to Home Screen'",
        "Tap 'Add' — you're done!"
      ],
      note: "Note: Installation only works in Safari browser on iOS"
    },
    android: {
      title: "🤖 Android (Chrome or Edge)",
      icon: <Smartphone className="h-5 w-5" />,
      steps: [
        "Open the app in Chrome or Edge browser",
        "Tap the ⋮ menu in the top-right corner",
        "Tap 'Add to Home screen' or 'Install App'",
        "Confirm by tapping 'Add' or 'Install'"
      ],
      note: "Note: Installation works best in Chrome or Edge browser"
    },
    windows: {
      title: "🪟 Windows (Edge or Chrome)",
      icon: <Monitor className="h-5 w-5" />,
      steps: [
        "Open the app in Edge or Chrome browser",
        "Look for the app install icon (⊞) in the address bar",
        "Click the install icon or go to Menu > Install app",
        "Click 'Install' to add to your desktop"
      ],
      note: "Note: You can also pin to taskbar after installation"
    },
    mac: {
      title: "🍎 macOS (Safari)",
      icon: <Monitor className="h-5 w-5" />,
      steps: [
        "Open the app in Safari browser",
        "Go to File menu > Add to Dock",
        "Enter a name for the app",
        "Click 'Add' to install to Dock"
      ],
      note: "Note: Works best in Safari for seamless integration"
    },
    linux: {
      title: "🐧 Linux (Chrome / Chromium)",
      icon: <Monitor className="h-5 w-5" />,
      steps: [
        "Open the app in Chrome or Chromium browser",
        "Click the ⋮ menu in the top-right",
        "Select 'Install Amazon Review Spotter'",
        "Confirm installation to add to applications"
      ],
      note: "Note: Launch like any native app from your applications menu"
    }
  };

  const currentInstructions = installInstructions[currentDevice as keyof typeof installInstructions];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Install Amazon Review Spotter v1.0
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Select your device type
            </label>
            <Select value={deviceType} onValueChange={(value) => setDeviceType(value as DeviceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  Auto-detected: {detectedDevice === 'auto' ? 'Unknown' : installInstructions[detectedDevice as keyof typeof installInstructions]?.title}
                </SelectItem>
                <SelectItem value="ios">🍎 iPhone / iPad</SelectItem>
                <SelectItem value="android">🤖 Android</SelectItem>
                <SelectItem value="windows">🪟 Windows</SelectItem>
                <SelectItem value="mac">🍎 macOS</SelectItem>
                <SelectItem value="linux">🐧 Linux</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Installation Instructions */}
          {currentInstructions && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {currentInstructions.icon}
                  {currentInstructions.title.replace(/^[^\s]+ /, '')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {currentInstructions.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Badge variant="outline" className="text-xs px-2 py-1 rounded-full">
                        {index + 1}
                      </Badge>
                      <p className="text-sm text-muted-foreground flex-1">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
                
                {currentInstructions.note && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {currentInstructions.note}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* App Benefits */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Works offline after installation</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Automatic updates (v1.0+)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Native app experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Faster performance</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Skip for now
            </Button>
            <Button 
              onClick={() => {
                // Try to trigger install prompt if available
                if ('serviceWorker' in navigator) {
                  onOpenChange(false);
                }
              }}
              className="flex-1"
            >
              Got it!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
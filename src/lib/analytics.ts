// Simple analytics for debugging production issues
// Events are logged to console and stored in localStorage for inspection

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: string;
  path: string;
};

const STORAGE_KEY = 'review-spotter-analytics';
const MAX_EVENTS = 100;

export const analytics = {
  track: (name: string, properties?: Record<string, unknown>) => {
    const event: AnalyticsEvent = {
      name,
      properties,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    };

    // Log to console for debugging
    console.log('[Analytics]', name, properties || '');

    // Store in localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : [];
      events.push(event);
      
      // Keep only last MAX_EVENTS
      const trimmed = events.slice(-MAX_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[Analytics] Failed to store event:', e);
    }
  },

  pageView: (pageName: string) => {
    analytics.track('page_view', { page: pageName });
  },

  analysisStarted: (asin: string) => {
    analytics.track('analysis_started', { asin });
  },

  analysisCompleted: (asin: string, score?: number) => {
    analytics.track('analysis_completed', { asin, score });
  },

  analysisError: (asin: string, error: string) => {
    analytics.track('analysis_error', { asin, error });
  },

  getEvents: (): AnalyticsEvent[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  clearEvents: () => {
    localStorage.removeItem(STORAGE_KEY);
  },
};

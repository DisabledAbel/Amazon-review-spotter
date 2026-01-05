import { useState, useCallback } from 'react';

export interface ScrapeProgress {
  currentPage: number;
  totalReviews: number;
  message: string;
  status: 'idle' | 'scraping' | 'analyzing' | 'complete' | 'error' | 'blocked';
}

export const useScrapeProgress = () => {
  const [progress, setProgress] = useState<ScrapeProgress>({
    currentPage: 0,
    totalReviews: 0,
    message: '',
    status: 'idle'
  });

  const resetProgress = useCallback(() => {
    setProgress({
      currentPage: 0,
      totalReviews: 0,
      message: '',
      status: 'idle'
    });
  }, []);

  const scrapeWithProgress = useCallback(async (
    productUrl: string,
    supabaseUrl: string,
    supabaseKey: string
  ): Promise<any> => {
    resetProgress();
    setProgress(prev => ({ ...prev, status: 'scraping', message: 'Starting...' }));

    const response = await fetch(`${supabaseUrl}/functions/v1/scrape-reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({ productUrl, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            switch (data.type) {
              case 'start':
                setProgress(prev => ({ 
                  ...prev, 
                  status: 'scraping', 
                  message: data.message 
                }));
                break;
              case 'progress':
                setProgress(prev => ({ 
                  ...prev, 
                  currentPage: data.currentPage,
                  totalReviews: data.totalReviews,
                  message: data.message,
                  status: 'scraping'
                }));
                break;
              case 'page_complete':
                setProgress(prev => ({ 
                  ...prev, 
                  currentPage: data.currentPage,
                  totalReviews: data.totalReviews,
                  message: data.message,
                  status: 'scraping'
                }));
                break;
              case 'analyzing':
                setProgress(prev => ({ 
                  ...prev, 
                  message: data.message,
                  status: 'analyzing'
                }));
                break;
              case 'blocked':
                setProgress(prev => ({ 
                  ...prev, 
                  message: data.message,
                  status: 'blocked'
                }));
                break;
              case 'error':
                setProgress(prev => ({ 
                  ...prev, 
                  message: data.message,
                  status: 'error'
                }));
                throw new Error(data.message);
              case 'complete':
                setProgress(prev => ({ 
                  ...prev, 
                  message: 'Complete!',
                  status: 'complete'
                }));
                result = data;
                break;
            }
          } catch (e) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    if (!result) {
      throw new Error('No result received');
    }

    return result;
  }, [resetProgress]);

  return { progress, scrapeWithProgress, resetProgress };
};

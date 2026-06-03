/**
 * operagrid Analytics Integration for OperaGrid
 *
 * Lightweight, privacy-first analytics similar to Plausible/Umami
 * Uses a simple script tag approach - no SDK required
 *
 * Usage:
 * <script defer data-api-key="anon_xxx" src="https://api.operagrid.com/js/analytics.js"></script>
 */

import { useEffect } from 'react';

// Get configuration from environment
const operagrid_API_KEY = import.meta.env.VITE_operagrid_ANON_KEY || '';
const operagrid_API_URL = import.meta.env.VITE_operagrid_API_URL || 'https://api.operagrid.com';

// Check if analytics is enabled
const isAnalyticsEnabled = (): boolean => {
  return Boolean(operagrid_API_KEY && operagrid_API_KEY.startsWith('anon_'));
};

interface operagridAnalyticsProps {
  debug?: boolean;
}

/**
 * operagrid Analytics Component
 *
 * Drop-in component that loads operagrid Analytics script
 * Place in App.tsx to enable tracking
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { operagridAnalytics } from './components/analytics/operagridAnalytics';
 *
 * function App() {
 *   return (
 *     <>
 *       <operagridAnalytics debug={process.env.NODE_ENV === 'development'} />
 *       <Routes>...</Routes>
 *     </>
 *   );
 * }
 * ```
 */
export const OperaGridAnalytics: React.FC<operagridAnalyticsProps> = ({ debug = false }) => {
  useEffect(() => {
    // Skip if API key is not configured
    if (!isAnalyticsEnabled()) {
      if (debug) {
        console.log('[operagrid Analytics] Not configured - set VITE_operagrid_ANON_KEY');
      }
      return;
    }

    // Check if script is already loaded (persists across StrictMode remounts)
    const existingScript = document.getElementById('operagrid-analytics-script');
    if (existingScript) {
      if (debug) {
        console.log('[operagrid Analytics] Script already loaded');
      }
      return;
    }

    // Create and inject the script tag
    const script = document.createElement('script');
    script.id = 'operagrid-analytics-script';
    script.defer = true;
    script.src = `${operagrid_API_URL}/js/analytics.js`;
    script.setAttribute('data-api-key', operagrid_API_KEY);
    script.setAttribute('data-api-url', operagrid_API_URL);
    if (debug) {
      script.setAttribute('data-debug', 'true');
    }

    if (debug) {
      console.log('[operagrid Analytics] Initializing with API URL:', operagrid_API_URL);
    }

    script.onload = () => {
      if (debug) {
        console.log('[operagrid Analytics] Script loaded successfully');
      }
    };

    script.onerror = (e) => {
      console.error('[operagrid Analytics] Failed to load script', e);
    };

    document.head.appendChild(script);

    // No cleanup - let the script persist for the app lifetime
    // This prevents issues with React StrictMode double-mounting
  }, [debug]);

  // This component doesn't render anything
  return null;
};

// Global operagrid interface (set by analytics.js script)
declare global {
  interface Window {
    operagrid?: {
      track: (eventName: string, properties?: Record<string, any>) => void;
      pageview: () => void;
    };
  }
}

/**
 * Track a custom event
 *
 * @example
 * ```tsx
 * trackoperagridEvent('signup_started', { plan: 'pro' });
 * ```
 */
export const trackoperagridEvent = (
  eventName: string,
  properties?: Record<string, any>
): void => {
  if (window.operagrid) {
    window.operagrid.track(eventName, properties);
  }
};

/**
 * Track page view manually (usually auto-tracked)
 */
export const trackoperagridPageView = (): void => {
  if (window.operagrid) {
    window.operagrid.pageview();
  }
};

/**
 * Hook to access operagrid Analytics
 * Returns the global operagrid object if available
 */
export const useoperagridAnalytics = () => {
  return window.operagrid || null;
};

export default OperaGridAnalytics;

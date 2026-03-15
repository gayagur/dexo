// Google Analytics 4 integration
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Load the gtag script dynamically
export function initGA() {
  if (!GA_MEASUREMENT_ID) return;

  // Don't initialize twice
  if (document.querySelector(`script[src*="googletagmanager"]`)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We'll track manually for SPA
  });

  (window as any).gtag = gtag;
}

// Track a page view (call on route change)
export function trackPageView(path: string) {
  if (!GA_MEASUREMENT_ID || !(window as any).gtag) return;
  (window as any).gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
  });
}

// Track custom events
export function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (!GA_MEASUREMENT_ID || !(window as any).gtag) return;
  (window as any).gtag('event', eventName, params);
}

// Pre-defined event helpers for DEXO-specific events
export const analytics = {
  projectCreated: (projectId: string, category: string) =>
    trackEvent('project_created', { project_id: projectId, category }),

  projectSent: (projectId: string) =>
    trackEvent('project_sent', { project_id: projectId }),

  offerReceived: (projectId: string, businessId: string) =>
    trackEvent('offer_received', { project_id: projectId, business_id: businessId }),

  userSignedUp: (method: string, role: string) =>
    trackEvent('sign_up', { method, role }),

  creatorApproved: (businessId: string) =>
    trackEvent('creator_approved', { business_id: businessId }),

  roleSwitch: (from: string, to: string) =>
    trackEvent('role_switch', { from_role: from, to_role: to }),
};

// Type augmentation for window
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

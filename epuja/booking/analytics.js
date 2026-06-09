/**
 * Sri Mandir Analytics Engine
 * Provides automated scroll impressions and user interaction tracking.
 * Routes events to:
 * 1. Mixpanel (window.mixpanel)
 * 2. Google Analytics 4 / Google Tag Manager (window.gtag)
 * 3. Meta / Facebook Pixel (window.fbq)
 * 4. Host Native Shell (iOS WebKit / Android WebInterface / JSBridge)
 * 5. Local Console Debug Log (if running locally or using ?debug=true)
 */
(function () {
  // Determine if debug mode is active
  const urlParams = new URLSearchParams(window.location.search);
  const isDebug = urlParams.has('debug') ||
                  window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1';

  // Get active query params to pass as default properties (e.g. tracking attribution, campaign)
  const defaultCampaignParams = {
    name_param: urlParams.get('name') || '',
    rashi_param: urlParams.get('rashi') || '',
    utm_source: urlParams.get('utm_source') || '',
    utm_medium: urlParams.get('utm_medium') || '',
    utm_campaign: urlParams.get('utm_campaign') || '',
    utm_content: urlParams.get('utm_content') || '',
    language: window.location.pathname.includes('_hindi') || window.location.pathname.includes('hindi') ? 'hi' : 'en',
    page_type: window.location.pathname.includes('chadhava') ? 'chadhava' : 'landing'
  };

  const SriMandirAnalytics = {
    /**
     * Dispatch an event to all active tracking channels
     * @param {string} eventName Name of the analytics event
     * @param {Object} params Key-value event properties
     */
    trackEvent(eventName, params = {}) {
      const eventData = {
        ...defaultCampaignParams,
        ...params,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || ''
      };

      // 1. Console Logging (Local/Debug Mode)
      if (isDebug) {
        console.log(
          `%c[SriMandirAnalytics DevLog] Event: ${eventName}`,
          "color: #D4AF37; font-weight: bold; font-size: 11px; background: #2B1D15; padding: 3px 6px; border-radius: 4px;",
          eventData
        );
      }

      // 2. Mixpanel Integration
      if (typeof window.mixpanel !== 'undefined' && typeof window.mixpanel.track === 'function') {
        try {
          window.mixpanel.track(eventName, eventData);
        } catch (e) {
          console.warn("Mixpanel tracking failed:", e);
        }
      }

      // 3. Google Analytics (GA4) / GTag Integration
      if (typeof window.gtag === 'function') {
        try {
          window.gtag('event', eventName, eventData);
        } catch (e) {
          console.warn("GA4/Gtag tracking failed:", e);
        }
      }

      // 4. Meta / Facebook Pixel Integration
      if (typeof window.fbq === 'function') {
        try {
          window.fbq('trackCustom', eventName, eventData);
        } catch (e) {
          console.warn("Meta Pixel tracking failed:", e);
        }
      }

      // 5. Native App WebView Bridge Integration
      // Checks for iOS WebKit MessageHandlers and Android WebInterfaces
      try {
        // iOS Bridge Handler
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.analytics) {
          window.webkit.messageHandlers.analytics.postMessage(eventData);
        }
        // Android Bridge Interfaces
        else if (window.Android && typeof window.Android.logEvent === 'function') {
          window.Android.logEvent(eventName, JSON.stringify(eventData));
        } else if (window.AndroidInterface && typeof window.AndroidInterface.logEvent === 'function') {
          window.AndroidInterface.logEvent(eventName, JSON.stringify(eventData));
        }
        // General JSBridge Interfaces
        else if (window.JSBridge && typeof window.JSBridge.logEvent === 'function') {
          window.JSBridge.logEvent(eventName, JSON.stringify(eventData));
        }
      } catch (err) {
        console.error("Native Bridge Analytics Error:", err);
      }
    },

    /**
     * Initializes a viewport IntersectionObserver to track section views (impressions)
     */
    initScrollTracking() {
      const sections = document.querySelectorAll('[data-track-section]');
      if (sections.length === 0) return;

      const observerOptions = {
        root: null, // Viewport boundary
        threshold: 0.3 // Fire when 30% of the section enters/is within the viewport
      };

      // Keep track of sections that have already been tracked in this session to prevent double-firing
      const viewedSections = new Set();

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionName = entry.target.getAttribute('data-track-section');
            if (sectionName && !viewedSections.has(sectionName)) {
              viewedSections.add(sectionName);
              this.trackEvent('section_viewed', { section_name: sectionName });
            }
          }
        });
      }, observerOptions);

      sections.forEach(sec => observer.observe(sec));
    }
  };

  // Bind utility to global window context
  window.SriMandirAnalytics = SriMandirAnalytics;
})();

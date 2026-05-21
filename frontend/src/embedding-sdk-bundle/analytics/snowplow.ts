import {
  newTracker,
  trackSelfDescribingEvent,
} from "@snowplow/browser-tracker";

const SDK_TRACKER_NAME = "sdk";

/**
 * PoC (EMB-1764): point the Snowplow browser-tracker at the Metabase instance
 * instead of the collector, so SDK telemetry routes through the instance proxy
 * (`/api/analytics/snowplow-proxy`) and dodges the customer page's `connect-src`
 * CSP. `connect-src` matches scheme+host+port and ignores the path, so the
 * instance host the SDK already calls for data passes with no customer config.
 *
 * Throwaway PoC quality — the production tracker is EMB-1760 (opt-out gate via
 * the instance's anonymous-tracking setting, iframe-matching event shape).
 */
export const initSdkTelemetryPoc = (metabaseInstanceUrl: string): void => {
  newTracker(SDK_TRACKER_NAME, metabaseInstanceUrl, {
    appId: "metabase",
    platform: "web",
    eventMethod: "post",
    // The whole trick: send to the instance proxy path, not the collector's tp2.
    postPath: "/api/analytics-proxy",
    // The proxy is anonymous (public) and cross-origin. Don't send the session
    // cookie: credentialed CORS would require Access-Control-Allow-Credentials,
    // which Metabase's SDK CORS doesn't set. (browser-tracker >= 3.24 exposes
    // this; it was hardcoded true before.)
    withCredentials: false,
    stateStorageStrategy: "none",
    anonymousTracking: { withServerAnonymisation: true },
  });

  trackSelfDescribingEvent(
    {
      event: {
        schema: "iglu:com.metabase/embedded_analytics_js/jsonschema/3-0-0",
        data: {
          event: "setup",
          // `source` is additive (3-0-0 allows additionalProperties); see EMB-1759.
          global: { auth_method: "session", locale_used: false, source: "sdk" },
          components: [],
        },
      },
    },
    [SDK_TRACKER_NAME],
  );
};

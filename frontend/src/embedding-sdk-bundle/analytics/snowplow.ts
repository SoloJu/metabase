import {
  flushBuffer,
  newTracker,
  trackSelfDescribingEvent,
} from "@snowplow/browser-tracker";

declare global {
  interface Window {
    // Investigation switch for the PoC-2 keepalive-on-unload mechanic. Default
    // path is "immediate" (PoC-3 per-mount-fire). Setting this to "batched"
    // before MetabaseProvider mounts flips the SDK to buffer events + flush on
    // visibilitychange/pagehide via fetch keepalive. Removed once production
    // sub-strategy (doc Q7) is locked.
    __pocTelemetryMode?: "immediate" | "batched";
  }
}

const getPocTelemetryMode = (): "immediate" | "batched" =>
  typeof window !== "undefined" && window.__pocTelemetryMode === "batched"
    ? "batched"
    : "immediate";

const SDK_TRACKER_NAME = "sdk";

const SCHEMA = "iglu:com.metabase/embedded_analytics_js/jsonschema/3-0-0";

/**
 * PoC (EMB-1764, round 3): Option B from the SDK analytics tech plan — per-mount
 * component events + a separate `global` beacon at provider init. Both route
 * through `/api/analytics-proxy` to dodge the customer page's `connect-src` CSP.
 *
 * Risk decisions captured in
 * `.claude/kelvin/2026-05-21-emb-1764-.../06-poc-3-plan.md`. Schema reuse, wire
 * shape, and cardinality questions are flagged as [DATA-TEAM] in that plan; PoC
 * picks working defaults and surfaces shape issues via Snowplow Micro's
 * `/micro/bad` bucket.
 *
 * Production tracker (with the real registry, first-mount-wins dedup, opt-out
 * gate, and dimension extraction) is EMB-1786.
 */

// Per tab, per load. Module-scoped lazy so it survives StrictMode double-mount
// and any nested MetabaseProvider without regeneration. Never persisted.
let sessionId: string | undefined;
const getSessionId = (): string => (sessionId ??= crypto.randomUUID());

// Industry-standard guard: Snowplow tracker calls are fire-and-forget, so
// React 18 StrictMode double-mount would duplicate. Module-scoped flag is the
// pattern PostHog / Segment / Snowplow docs all recommend for once-per-session
// init beacons.
let hasFiredGlobal = false;

let trackerInitialized = false;
const ensureTracker = (metabaseInstanceUrl: string): void => {
  if (trackerInitialized) {
    return;
  }
  trackerInitialized = true;
  const mode = getPocTelemetryMode();
  newTracker(SDK_TRACKER_NAME, metabaseInstanceUrl, {
    appId: "metabase",
    platform: "web",
    eventMethod: "post",
    postPath: "/api/analytics-proxy",
    // The proxy is anonymous (public) and cross-origin. v4 defaults to
    // 'include'; force 'omit' so no session cookie is sent.
    credentials: "omit",
    // Immediate: 1 event = 1 POST. Batched: buffer up to 16, fire+forget at
    // visibilitychange:hidden via fetch keepalive (PoC-2 path under
    // investigation).
    bufferSize: mode === "batched" ? 16 : 1,
    keepalive: mode === "batched",
    stateStorageStrategy: "none",
    anonymousTracking: { withServerAnonymisation: true },
  });

  if (mode === "batched") {
    const flush = (): void => {
      flushBuffer([SDK_TRACKER_NAME]);
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    });
    window.addEventListener("pagehide", flush);
  }
};

export const fireGlobalBeacon = (metabaseInstanceUrl: string): void => {
  ensureTracker(metabaseInstanceUrl);
  if (hasFiredGlobal) {
    return;
  }
  hasFiredGlobal = true;
  trackSelfDescribingEvent(
    {
      event: {
        schema: SCHEMA,
        data: {
          event: "setup",
          session_id: getSessionId(),
          global: {
            auth_method: "session",
            locale_used: false,
            source: "sdk",
          },
          components: [],
        },
      },
    },
    [SDK_TRACKER_NAME],
  );
};

export type SdkComponentBucket =
  | "dashboard"
  | "question"
  | "exploration"
  | "browser"
  | "metabot";

export const fireComponentEvent = (
  component: SdkComponentBucket,
  key: string,
): void => {
  // Assumes fireGlobalBeacon has already initialized the tracker. Components
  // mount inside ComponentProvider, which fires the global beacon at init.
  if (!trackerInitialized) {
    return;
  }
  // Fit the iframe's `embedded_analytics_js 3-0-0` schema:
  //   - `event` is enum-locked to "setup"
  //   - `components[i].name` required, `properties` is an array of dimension
  //     names (iframe ships e.g. ["withTitle","withDownloads"]); we drop `key`
  //     in the wire payload — id-keyed identity is the [DATA-TEAM] question.
  // The cardinality conflict (N rows/session on a schema iframe ships as 1
  // row/session) is the [DATA-TEAM] flag in Risk 3.
  void key;
  trackSelfDescribingEvent(
    {
      event: {
        schema: SCHEMA,
        data: {
          event: "setup",
          session_id: getSessionId(),
          global: {},
          components: [{ name: component, properties: [] }],
        },
      },
    },
    [SDK_TRACKER_NAME],
  );
};

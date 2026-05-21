(ns metabase.analytics.proxy-api
  "PoC (EMB-1764): public, anonymous Snowplow proxy. The Embedding SDK runs in the customer's page, where the
  customer's `connect-src` CSP blocks a direct browser POST to the Snowplow collector. The SDK instead POSTs the
  tracker's `tp2` payload here (same host as its data calls, already CSP-allowlisted) and we forward it to the
  collector server-side, where no browser CSP applies.

  This lives in its own namespace mounted WITHOUT `+auth` (see `metabase.api-routes.routes`) so the public posture
  is obvious in the route map — the browser-tracker can't carry a Metabase session cross-origin, and the collector
  is itself public, so this is anonymous by construction. Throwaway PoC quality — production endpoint is EMB-1758."
  (:require
   [clj-http.client :as http]
   [metabase.analytics.settings :as analytics.settings]
   [metabase.api.macros :as api.macros]
   [metabase.util.json :as json]
   [metabase.util.log :as log]))

#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/"
  "Forward a Snowplow `tp2` payload to the configured collector server-side, so SDK telemetry dodges the customer
  page's `connect-src` CSP. Mounted at `POST /api/analytics-proxy`; public and anonymous."
  [_route-params
   _query-params
   body]
  (let [collector-url (str (analytics.settings/snowplow-url) "/com.snowplowanalytics.snowplow/tp2")]
    (try
      (let [response (http/post collector-url
                                {:body             (json/encode body)
                                 :content-type     :json
                                 :throw-exceptions false})]
        (log/infof "analytics-proxy -> %s : %s" collector-url (:status response))
        {:status (:status response)
         :body   (:body response)})
      (catch Exception e
        ;; PoC: surface the cause instead of an opaque 500. Most likely the collector is unreachable.
        (log/errorf e "analytics-proxy failed forwarding to %s" collector-url)
        {:status 502
         :body   {:error (ex-message e)}}))))

(ns metabase.analytics.api
  (:require
   [clj-http.client :as http]
   [metabase.analytics.prometheus :as prometheus]
   [metabase.analytics.settings :as analytics.settings]
   [metabase.analytics.stats :as stats]
   [metabase.api.macros :as api.macros]
   [metabase.permissions.core :as perms]
   [metabase.util.json :as json]
   [metabase.util.log :as log]))

;; I don't think this endpoint is actually used anywhere for anything.
;;
;; TODO (Cam 2025-11-25) please add a response schema to this API endpoint, it makes it easier for our customers to
;; use our API + we will need it when we make auto-TypeScript-signature generation happen
;;
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :get "/anonymous-stats"
  "Anonymous usage stats. Endpoint for testing, and eventually exposing this to instance admins to let them see
  what is being phoned home."
  []
  (perms/check-has-application-permission :monitoring)
  (stats/legacy-anonymous-usage-stats))

(def ^:private InternalAnalyticsEvent
  [:map
   [:op     [:enum :inc :dec :set :observe :clear]]
   [:metric :keyword]
   [:labels {:optional true} [:maybe [:map-of :keyword :string]]]
   [:amount {:optional true} [:maybe number?]]])

(api.macros/defendpoint :post "/internal" :- :nil
  "Receive a batch of internal analytics events from the frontend and record them as Prometheus metrics."
  [_route-params
   _query-params
   {:keys [events]} :- [:map [:events [:sequential InternalAnalyticsEvent]]]]
  (doseq [{:keys [op metric labels amount]} events]
    (try
      (case op
        :inc     (prometheus/inc! metric labels (or amount 1))
        :dec     (prometheus/dec! metric labels (or amount 1))
        :set     (prometheus/set! metric labels amount)
        :observe (prometheus/observe! metric labels (or amount 1))
        :clear   (prometheus/clear! metric))
      (catch Exception e
        (log/warnf e "Failed to record internal analytics event %s %s" op metric)))))

;; PoC (EMB-1764): blind passthrough Snowplow proxy. The Embedding SDK runs in the customer's page, where the
;; customer's `connect-src` CSP blocks a direct browser POST to the Snowplow collector. The SDK instead POSTs the
;; tracker's `tp2` payload here (same host as its data calls, already CSP-allowlisted) and we forward it to the
;; collector server-side, where no browser CSP applies. Throwaway PoC quality — the production endpoint is EMB-1758
;; (true raw byte passthrough, response-status relay, auth/abuse decisions).
#_{:clj-kondo/ignore [:metabase/validate-defendpoint-has-response-schema]}
(api.macros/defendpoint :post "/snowplow-proxy"
  "Forward a Snowplow `tp2` payload to the configured collector server-side, so SDK telemetry dodges the customer
  page's `connect-src` CSP."
  [_route-params
   _query-params
   body]
  (let [collector-url (str (analytics.settings/snowplow-url) "/com.snowplowanalytics.snowplow/tp2")]
    (try
      (let [response (http/post collector-url
                                {:body             (json/encode body)
                                 :content-type     :json
                                 :throw-exceptions false})]
        (log/infof "snowplow-proxy -> %s : %s" collector-url (:status response))
        {:status (:status response)
         :body   (:body response)})
      (catch Exception e
        ;; PoC: surface the cause instead of an opaque 500. Most likely the collector is unreachable.
        (log/errorf e "snowplow-proxy failed forwarding to %s" collector-url)
        {:status 502
         :body   {:error (ex-message e)}}))))

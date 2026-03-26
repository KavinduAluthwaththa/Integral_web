-- Persist a stable visitor identity across browser sessions for analytics.
ALTER TABLE public.traffic_sources
  ADD COLUMN IF NOT EXISTS visitor_id text;

ALTER TABLE public.session_analytics
  ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE INDEX IF NOT EXISTS idx_traffic_sources_visitor_id
  ON public.traffic_sources(visitor_id);

CREATE INDEX IF NOT EXISTS idx_session_analytics_visitor_id
  ON public.session_analytics(visitor_id);

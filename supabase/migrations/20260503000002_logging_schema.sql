-- ============================================================
-- ABYRA STORE — Logging Infrastructure
-- ============================================================

-- 1. ENHANCE EXISTING LOG TABLES
-- user_activity_logs
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE public.user_activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- auth_logs
ALTER TABLE public.auth_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- error_logs
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. NEW LOG TABLES
-- admin_logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_logs
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT,
  method TEXT,
  status INTEGER,
  response_time INTEGER,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS POLICIES (INSERT ONLY FOR LOGS)
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_insert_all" ON public.user_activity_logs;
CREATE POLICY "logs_insert_all" ON public.user_activity_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "auth_logs_insert_all" ON public.auth_logs;
CREATE POLICY "auth_logs_insert_all" ON public.auth_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "error_logs_insert_all" ON public.error_logs;
CREATE POLICY "error_logs_insert_all" ON public.error_logs FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "admin_logs_admin_all" ON public.admin_logs;
CREATE POLICY "admin_logs_admin_all" ON public.admin_logs FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "api_logs_insert_all" ON public.api_logs;
CREATE POLICY "api_logs_insert_all" ON public.api_logs FOR INSERT WITH CHECK (TRUE);

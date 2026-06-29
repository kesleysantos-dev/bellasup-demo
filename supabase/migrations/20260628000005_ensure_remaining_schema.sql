-- ── system_settings table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_suporte text DEFAULT '5585981049964',
  valor_plano numeric DEFAULT 49.90,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage settings" ON public.system_settings;
CREATE POLICY "Super admin can manage settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view settings" ON public.system_settings;
CREATE POLICY "Public can view settings"
  ON public.system_settings FOR SELECT TO anon, authenticated
  USING (true);

INSERT INTO public.system_settings (whatsapp_suporte, valor_plano)
  SELECT '5585981049964', 49.90
  WHERE NOT EXISTS (SELECT 1 FROM public.system_settings LIMIT 1);

-- ── horarios_funcionamento: blocos column ────────────────────────────────────
ALTER TABLE public.horarios_funcionamento
  ADD COLUMN IF NOT EXISTS blocos jsonb DEFAULT NULL;

-- ── agendamentos: remaining missing columns ──────────────────────────────────
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS valor_cobrado numeric DEFAULT NULL;

-- ── servicos: RLS policy for authenticated users ─────────────────────────────
DROP POLICY IF EXISTS "Public can view active services" ON public.servicos;
CREATE POLICY "Public can view active services"
  ON public.servicos FOR SELECT TO anon, authenticated
  USING (ativo = true);

-- ── realtime publication ─────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agendamentos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agendamentos;
  END IF;
END$$;

-- ── validate_agendamento_time trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_agendamento_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  brasilia_now timestamp;
BEGIN
  brasilia_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  IF (NEW.data < brasilia_now::date) OR
     (NEW.data = brasilia_now::date AND NEW.hora <= (brasilia_now::time + INTERVAL '5 minutes')) THEN
    RAISE EXCEPTION 'Não é possível agendar em horários que já passaram.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_agendamento_before_insert ON public.agendamentos;
CREATE TRIGGER validate_agendamento_before_insert
  BEFORE INSERT ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.validate_agendamento_time();

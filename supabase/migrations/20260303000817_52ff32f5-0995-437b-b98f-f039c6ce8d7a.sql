
-- 1. Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS frase_boas_vindas text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plano_ativo boolean DEFAULT false;

-- 2. Create system_settings table for SuperAdmin dynamic config
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_suporte text DEFAULT '5585981049964',
  valor_plano numeric DEFAULT 49.90,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Public can view settings"
  ON public.system_settings FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.system_settings (whatsapp_suporte, valor_plano) VALUES ('5585981049964', 49.90);

-- 3. Fix RLS: Drop RESTRICTIVE public policies and recreate as PERMISSIVE

-- profiles
DROP POLICY IF EXISTS "Public can view profiles by slug" ON public.profiles;
CREATE POLICY "Public can view profiles by slug"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (true);

-- servicos
DROP POLICY IF EXISTS "Public can view active services" ON public.servicos;
CREATE POLICY "Public can view active services"
  ON public.servicos FOR SELECT TO anon, authenticated
  USING (ativo = true);

-- agendamentos
DROP POLICY IF EXISTS "Public can view appointments for availability" ON public.agendamentos;
CREATE POLICY "Public can view appointments for availability"
  ON public.agendamentos FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can insert appointments" ON public.agendamentos;
CREATE POLICY "Public can insert appointments"
  ON public.agendamentos FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- horarios
DROP POLICY IF EXISTS "Public can view hours" ON public.horarios_funcionamento;
CREATE POLICY "Public can view hours"
  ON public.horarios_funcionamento FOR SELECT TO anon, authenticated
  USING (true);

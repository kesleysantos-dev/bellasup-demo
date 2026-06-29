-- ── profiles: add all missing columns ──────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS frase_boas_vindas text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plano_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_reserva_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_reserva_percentual integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS chave_pix text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_chave_pix text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tempo_expiracao_min integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- ── profiles: ensure public RLS policy exists ───────────────────────────────
DROP POLICY IF EXISTS "Public can view profiles by slug" ON public.profiles;
CREATE POLICY "Public can view profiles by slug"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (true);

-- ── agendamentos: add all missing columns ───────────────────────────────────
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS variacao text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_reserva numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS expira_em timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_historico numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_historica integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS servico_nome_historico text DEFAULT NULL;

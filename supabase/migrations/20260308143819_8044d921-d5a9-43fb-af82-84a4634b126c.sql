
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS taxa_reserva_ativo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS taxa_reserva_percentual integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS chave_pix text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_chave_pix text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tempo_expiracao_min integer DEFAULT 30;

ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS valor_reserva numeric DEFAULT null,
  ADD COLUMN IF NOT EXISTS expira_em timestamp with time zone DEFAULT null;

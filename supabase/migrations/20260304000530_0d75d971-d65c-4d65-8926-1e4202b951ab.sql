
-- Add variation columns to servicos
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS preco_mao numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_mao integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_pe numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_pe integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_ambos numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_ambos integer DEFAULT NULL;

-- Add variacao column to agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS variacao text DEFAULT NULL;

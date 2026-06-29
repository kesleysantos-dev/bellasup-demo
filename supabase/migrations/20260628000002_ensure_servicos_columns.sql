-- Ensure all servicos columns exist that may be missing from remote schema
ALTER TABLE public.servicos
  ADD COLUMN IF NOT EXISTS imagem_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'unhas',
  ADD COLUMN IF NOT EXISTS preco_mao numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_mao integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_pe numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_pe integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS preco_ambos numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS duracao_ambos integer DEFAULT NULL;

-- Ensure variacao column exists in agendamentos
ALTER TABLE public.agendamentos
  ADD COLUMN IF NOT EXISTS variacao text DEFAULT NULL;

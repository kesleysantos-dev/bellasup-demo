
-- Profiles for manicures (multi-tenant)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  bio TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view profiles by slug" ON public.profiles FOR SELECT TO anon USING (true);

-- Services
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manicure_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  duracao INTEGER NOT NULL DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manicure can manage own services" ON public.servicos FOR ALL TO authenticated USING (
  manicure_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public can view active services" ON public.servicos FOR SELECT TO anon USING (ativo = true);

-- Working hours
CREATE TABLE public.horarios_funcionamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manicure_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  ativo BOOLEAN NOT NULL DEFAULT false,
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fim TIME NOT NULL DEFAULT '18:00',
  UNIQUE(manicure_id, dia_semana)
);

ALTER TABLE public.horarios_funcionamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manicure can manage own hours" ON public.horarios_funcionamento FOR ALL TO authenticated USING (
  manicure_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public can view hours" ON public.horarios_funcionamento FOR SELECT TO anon USING (true);

-- Appointments
CREATE TYPE public.status_agendamento AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado');

CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manicure_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT DEFAULT '',
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status public.status_agendamento NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manicure can manage own appointments" ON public.agendamentos FOR ALL TO authenticated USING (
  manicure_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Public can insert appointments" ON public.agendamentos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public can view appointments for availability" ON public.agendamentos FOR SELECT TO anon USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Manicure'),
    COALESCE(
      NEW.raw_user_meta_data->>'slug',
      REPLACE(LOWER(COALESCE(NEW.raw_user_meta_data->>'nome', 'manicure-' || LEFT(NEW.id::text, 8))), ' ', '-')
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create default working hours on profile creation
CREATE OR REPLACE FUNCTION public.create_default_hours()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.horarios_funcionamento (manicure_id, dia_semana, ativo, hora_inicio, hora_fim)
  VALUES
    (NEW.id, 0, false, '09:00', '18:00'),
    (NEW.id, 1, true, '09:00', '18:00'),
    (NEW.id, 2, true, '09:00', '18:00'),
    (NEW.id, 3, true, '09:00', '18:00'),
    (NEW.id, 4, true, '09:00', '18:00'),
    (NEW.id, 5, true, '09:00', '18:00'),
    (NEW.id, 6, false, '09:00', '18:00');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_default_hours();

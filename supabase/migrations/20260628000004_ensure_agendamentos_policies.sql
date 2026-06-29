-- Ensure agendamentos RLS policies exist

-- Authenticated users (manicures) can manage their own appointments
DROP POLICY IF EXISTS "Manicure can manage own appointments" ON public.agendamentos;
CREATE POLICY "Manicure can manage own appointments"
  ON public.agendamentos FOR ALL TO authenticated
  USING (manicure_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Public (anon) can insert appointments (booking page)
DROP POLICY IF EXISTS "Public can insert appointments" ON public.agendamentos;
CREATE POLICY "Public can insert appointments"
  ON public.agendamentos FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Public (anon) can view appointments for availability checking
DROP POLICY IF EXISTS "Public can view appointments for availability" ON public.agendamentos;
CREATE POLICY "Public can view appointments for availability"
  ON public.agendamentos FOR SELECT TO anon, authenticated
  USING (true);

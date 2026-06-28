
-- Add cascade delete: when a profile is deleted, remove related data
ALTER TABLE public.servicos DROP CONSTRAINT IF EXISTS servicos_manicure_id_fkey;
ALTER TABLE public.servicos ADD CONSTRAINT servicos_manicure_id_fkey 
  FOREIGN KEY (manicure_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.horarios_funcionamento DROP CONSTRAINT IF EXISTS horarios_funcionamento_manicure_id_fkey;
ALTER TABLE public.horarios_funcionamento ADD CONSTRAINT horarios_funcionamento_manicure_id_fkey 
  FOREIGN KEY (manicure_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.agendamentos DROP CONSTRAINT IF EXISTS agendamentos_manicure_id_fkey;
ALTER TABLE public.agendamentos ADD CONSTRAINT agendamentos_manicure_id_fkey 
  FOREIGN KEY (manicure_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Allow super_admin to delete profiles (for user removal)
CREATE POLICY "Super admin can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

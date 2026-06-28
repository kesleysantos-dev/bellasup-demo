
-- Allow super_admin to update any profile (for activate/deactivate)
CREATE POLICY "Super admin can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow super_admin to view all profiles
CREATE POLICY "Super admin can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSuperAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking role
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle()
      .then(({ data }) => {
        setIsSuperAdmin(!!data);
        setLoading(false);
      });
  }, [user, authLoading]);

  return { isSuperAdmin, loading };
}

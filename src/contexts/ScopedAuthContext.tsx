import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseScoped } from '@/integrations/supabase/scopedClient';
import type { User, Session } from '@supabase/supabase-js';

interface ScopedAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: any | null;
  profileId: string | null;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ScopedAuthContext = createContext<ScopedAuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  profileId: null,
  isSuperAdmin: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useScopedAuth = () => useContext(ScopedAuthContext);

export const ScopedAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchProfileData = async (userId: string) => {
    try {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabaseScoped
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        (supabaseScoped as any)
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'super_admin')
          .maybeSingle(),
      ]);

      if (profileData) {
        setProfile(profileData);
        setProfileId(profileData.id);
      } else {
        setProfile(null);
        setProfileId(null);
      }

      setIsSuperAdmin(!!roleData);
    } catch (err) {
      console.error('[ScopedAuth] Error fetching profile:', err);
      setProfile(null);
      setProfileId(null);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabaseScoped
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setProfile(data);
    } catch (err) {
      console.error('[ScopedAuth] Error refreshing profile:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabaseScoped.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setProfileId(null);
        setIsSuperAdmin(false);
        setLoading(false);
      } else {
        // Keep loading=true while fetchProfileData resolves isSuperAdmin.
        // Without this, the guard sees user=set + isSuperAdmin=false and
        // redirects to /acesso-negado before the role query completes.
        setLoading(true);
      }
    });

    supabaseScoped.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
      // If session exists, loading stays true until fetchProfileData finishes
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchProfileData(user.id);
    }
  }, [user]);

  const signOut = async () => {
    await supabaseScoped.auth.signOut();
  };

  return (
    <ScopedAuthContext.Provider
      value={{ user, session, loading, profile, profileId, isSuperAdmin, signOut, refreshProfile }}
    >
      {children}
    </ScopedAuthContext.Provider>
  );
};

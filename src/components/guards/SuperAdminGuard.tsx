import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScopedAuth } from '@/contexts/ScopedAuthContext';
import { Sparkles } from 'lucide-react';

const SuperAdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isSuperAdmin } = useScopedAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/super-admin/login', { replace: true });
      return;
    }
    if (!isSuperAdmin) {
      navigate('/acesso-negado', { replace: true });
    }
  }, [loading, user, isSuperAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Sparkles className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user || !isSuperAdmin) return null;

  return <>{children}</>;
};

export default SuperAdminGuard;

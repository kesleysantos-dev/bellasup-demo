import { useAdminContext } from '@/hooks/useAdminContext';
import AgendamentosManager from '@/components/dashboard/AgendamentosManager';

const AgendamentosPage = () => {
  const { profileId } = useAdminContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Agendamentos</h1>
      <AgendamentosManager profileId={profileId} onUpdate={() => {}} />
    </div>
  );
};

export default AgendamentosPage;

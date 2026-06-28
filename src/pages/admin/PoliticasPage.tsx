import { useAdminContext } from '@/hooks/useAdminContext';
import BookingPoliciesSettings from '@/components/dashboard/BookingPoliciesSettings';

const PoliticasPage = () => {
  const { profileId } = useAdminContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Políticas de Agendamento</h1>
      <BookingPoliciesSettings profileId={profileId} />
    </div>
  );
};

export default PoliticasPage;

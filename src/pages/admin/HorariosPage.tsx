import { useAdminContext } from '@/hooks/useAdminContext';
import HorariosManager from '@/components/dashboard/HorariosManager';

const HorariosPage = () => {
  const { profileId } = useAdminContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Horários</h1>
      <HorariosManager profileId={profileId} />
    </div>
  );
};

export default HorariosPage;

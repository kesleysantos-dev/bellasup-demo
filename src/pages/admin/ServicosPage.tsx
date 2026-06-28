import { useAdminContext } from '@/hooks/useAdminContext';
import ServicosManager from '@/components/dashboard/ServicosManager';

const ServicosPage = () => {
  const { profileId } = useAdminContext();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold">Serviços</h1>
      <ServicosManager profileId={profileId} />
    </div>
  );
};

export default ServicosPage;

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'bellasup_install_dismissed';

const InstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const location = useLocation();

  // Only show on /auth or /admin routes
  const isAllowedRoute = location.pathname === '/auth' || location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  if (!show || !isAllowedRoute) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[300] p-3 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-lg mx-auto rounded-2xl border border-primary/20 bg-card shadow-lg p-4 flex items-center gap-3">
        <div className="p-2.5 rounded-xl gradient-rose shrink-0">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-foreground">Instalar BellasUp</p>
          <p className="text-xs text-muted-foreground">Adicione à tela de início para acesso rápido 💅</p>
        </div>
        <Button size="sm" onClick={handleInstall} className="gradient-rose text-primary-foreground shrink-0 text-xs px-4">
          Instalar
        </Button>
        <button onClick={handleDismiss} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;

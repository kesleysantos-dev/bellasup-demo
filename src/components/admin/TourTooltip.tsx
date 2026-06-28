import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TourTooltipProps {
  show: boolean;
  title: string;
  content: string;
  onNext: () => void;
  onSkip: () => void;
  children: ReactNode;
}

export const TourTooltip = ({ show, title, content, onNext, onSkip, children }: TourTooltipProps) => {
  if (!show) return <>{children}</>;

  return (
    <div className="relative z-[100] w-full">
      <div className="relative z-[101] ring-4 ring-primary ring-offset-4 rounded-2xl transition-all duration-500">
        {children}
      </div>

      <div className="fixed inset-0 bg-black/40 z-[100] pointer-events-none" />

      <div className="absolute z-[9999] top-full left-1/2 -translate-x-1/2 mt-6 w-[300px] bg-popover border-2 border-primary/30 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in slide-in-from-top-4 duration-300">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
            <h4 className="font-bold text-sm text-primary uppercase tracking-wider">{title}</h4>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed">
            {content}
          </p>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <button
              onClick={onSkip}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors font-medium"
            >
              Encerrar tour
            </button>
            <Button
              size="sm"
              onClick={onNext}
              className="h-9 px-5 text-xs gradient-rose text-white font-bold shadow-md hover:scale-105 transition-transform"
            >
              Próximo passo
            </Button>
          </div>
        </div>

        <div className="absolute w-4 h-4 bg-popover border-l-2 border-t-2 border-primary/30 rotate-45 -top-2.5 left-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
};
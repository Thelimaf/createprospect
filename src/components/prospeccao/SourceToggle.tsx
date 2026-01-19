import { MapPin, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SourceType = 'google_maps' | 'web';

interface SourceToggleProps {
  value: SourceType;
  onChange: (value: SourceType) => void;
}

export function SourceToggle({ value, onChange }: SourceToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg w-fit">
      <button
        type="button"
        onClick={() => onChange('google_maps')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === 'google_maps'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <MapPin className="h-4 w-4" />
        Google Maps
      </button>
      <button
        type="button"
        onClick={() => onChange('web')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === 'web'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        <Globe className="h-4 w-4" />
        Web Geral
      </button>
    </div>
  );
}

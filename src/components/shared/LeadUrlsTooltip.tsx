import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Info, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { copyToClipboard, buildWhatsAppUrl, ensureHttps } from '@/lib/external-links';

interface UrlInfo {
  label: string;
  url: string;
}

interface LeadUrlsTooltipProps {
  phone?: string | null;
  googleMapsUrl?: string | null;
  website?: string | null;
  whatsappMessage?: string;
  children?: ReactNode;
}

export function LeadUrlsTooltip({
  phone,
  googleMapsUrl,
  website,
  whatsappMessage = '',
  children,
}: LeadUrlsTooltipProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const urls: UrlInfo[] = [];

  if (phone) {
    urls.push({
      label: 'WhatsApp',
      url: buildWhatsAppUrl(phone, whatsappMessage),
    });
  }

  if (googleMapsUrl) {
    urls.push({
      label: 'Google Maps',
      url: googleMapsUrl,
    });
  }

  if (website) {
    urls.push({
      label: 'Site',
      url: ensureHttps(website),
    });
  }

  if (urls.length === 0) {
    return <>{children}</>;
  }

  const handleCopy = async (url: string) => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedUrl(url);
      toast.success('URL copiada!', { duration: 1000 });
      setTimeout(() => setCopiedUrl(null), 2000);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent 
        side="left" 
        className="max-w-[320px] p-3 bg-popover border-border"
        sideOffset={5}
      >
        <p className="text-xs font-medium text-foreground mb-2">URLs do Lead (clique para copiar)</p>
        <div className="space-y-2">
          {urls.map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[70px]">
                {item.label}:
              </span>
              <button
                onClick={() => handleCopy(item.url)}
                className="flex-1 text-left group"
              >
                <p className="text-[10px] text-primary break-all font-mono hover:underline cursor-pointer">
                  {item.url}
                </p>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(item.url)}
                className="h-5 w-5 p-0 flex-shrink-0"
              >
                {copiedUrl === item.url ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

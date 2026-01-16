import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Copy, Check, QrCode, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  logExternalLinkAttempt,
  copyToClipboard,
  getQrCodeUrl,
} from '@/lib/external-links';

interface ExternalLinkButtonProps {
  url: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  className?: string;
  toastLabel?: string;
  onBeforeOpen?: () => void | Promise<void>;
  enableQr?: boolean;
  qrTitle?: string;
  context?: string;
  leadId?: string;
}

export function ExternalLinkButton({
  url,
  label,
  icon,
  variant = 'outline',
  className = '',
  toastLabel,
  onBeforeOpen,
  enableQr = false,
  qrTitle = 'QR Code',
  context = 'external_link',
  leadId,
}: ExternalLinkButtonProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleClick = async () => {
    // Log the attempt
    logExternalLinkAttempt({
      context,
      method: 'direct_anchor',
      url,
      leadId,
    });

    // Show toast
    if (toastLabel) {
      toast.info(toastLabel, { duration: 1000 });
    }

    // Call onBeforeOpen if provided (e.g., update lead status)
    if (onBeforeOpen) {
      await onBeforeOpen();
    }

    // Show fallback options after click
    setShowFallback(true);
  };

  const handleCopyLink = async () => {
    logExternalLinkAttempt({
      context,
      method: 'copy_clipboard',
      url,
      leadId,
    });

    const success = await copyToClipboard(url);
    
    if (success) {
      setCopied(true);
      toast.success('Link copiado! Cole no navegador.', { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Falha ao copiar. Copie manualmente abaixo.');
    }
  };

  const handleOpenQr = () => {
    logExternalLinkAttempt({
      context,
      method: 'qr_dialog',
      url,
      leadId,
    });
    setQrOpen(true);
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {/* Main Link Button */}
      <Button
        size="sm"
        variant={variant}
        asChild
        onClick={handleClick}
        className={className}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {icon}
          {label}
        </a>
      </Button>

      {/* Fallback Section */}
      {showFallback && (
        <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-1">
            {/* Copy Link Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyLink}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span className="ml-1">Copiar Link</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Se o link não abriu, copie e cole no navegador</p>
              </TooltipContent>
            </Tooltip>

            {/* QR Code Button (only for WhatsApp) */}
            {enableQr && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleOpenQr}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <QrCode className="h-3 w-3" />
                    <span className="ml-1">QR Code</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Escaneie com o celular</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Toggle URL visibility */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFallback(!showFallback)}
              className="h-7 px-1 text-xs text-muted-foreground"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>

          {/* Full URL for manual copy */}
          <div className="max-w-[200px] p-1.5 rounded bg-muted/30 border border-border">
            <p className="text-[10px] text-muted-foreground break-all select-all font-mono">
              {url}
            </p>
          </div>
        </div>
      )}

      {/* QR Code Dialog */}
      {enableQr && (
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="max-w-sm bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                {qrTitle}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Escaneie o QR Code com seu celular para abrir
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-lg">
                <img
                  src={getQrCodeUrl(url)}
                  alt="QR Code"
                  className="w-[250px] h-[250px]"
                />
              </div>
              <p className="text-xs text-muted-foreground break-all text-center max-w-full px-4">
                {url}
              </p>
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full"
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

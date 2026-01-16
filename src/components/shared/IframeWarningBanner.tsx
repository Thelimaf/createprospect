import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, Copy, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  isRunningInIframe,
  logExternalLinkAttempt,
  copyToClipboard,
  testPopupBlocker,
} from '@/lib/external-links';

export function IframeWarningBanner() {
  const [isInIframe, setIsInIframe] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsInIframe(isRunningInIframe());
  }, []);

  if (!isInIframe || dismissed) {
    return null;
  }

  const handleOpenApp = async () => {
    const currentUrl = window.location.href;
    
    logExternalLinkAttempt({
      context: 'iframe_banner',
      method: 'open_app_new_tab',
      url: currentUrl,
    });

    const blocked = await testPopupBlocker(currentUrl);
    
    if (blocked) {
      toast.error('Popup bloqueado! Use o botão "Copiar URL" abaixo.');
    } else {
      toast.success('Abrindo aplicação em nova aba...', { duration: 1000 });
    }
  };

  const handleCopyUrl = async () => {
    const currentUrl = window.location.href;
    
    logExternalLinkAttempt({
      context: 'iframe_banner',
      method: 'copy_clipboard',
      url: currentUrl,
    });

    const success = await copyToClipboard(currentUrl);
    
    if (success) {
      toast.success('URL copiada! Cole em uma nova aba do navegador.');
    } else {
      toast.error('Falha ao copiar.');
    }
  };

  return (
    <Alert className="mb-4 bg-yellow-500/10 border-yellow-500/30">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-foreground">
          <strong>Aviso:</strong> Links externos podem não funcionar no preview. Abra em nova aba para testar.
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenApp}
            className="h-7 text-xs border-yellow-500/30 text-foreground hover:bg-yellow-500/10"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Abrir Aplicação
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyUrl}
            className="h-7 text-xs text-muted-foreground"
          >
            <Copy className="mr-1 h-3 w-3" />
            Copiar URL
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="h-7 w-7 p-0 text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

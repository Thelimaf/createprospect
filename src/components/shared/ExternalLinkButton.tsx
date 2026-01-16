import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logExternalLinkAttempt } from '@/lib/external-links';

interface ExternalLinkButtonProps {
  url: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  className?: string;
  toastLabel?: string;
  onBeforeOpen?: () => void | Promise<void>;
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
  context = 'external_link',
  leadId,
}: ExternalLinkButtonProps) {

  const handleClick = async () => {
    logExternalLinkAttempt({
      context,
      method: 'direct_anchor',
      url,
      leadId,
    });

    if (toastLabel) {
      toast.info(toastLabel, { duration: 1000 });
    }

    if (onBeforeOpen) {
      await onBeforeOpen();
    }
  };

  return (
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
  );
}

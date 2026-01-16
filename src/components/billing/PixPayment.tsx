import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, RefreshCw, Clock, CheckCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

interface PixPaymentProps {
  chargeId: string;
  paymentUrl: string;
  expiresAt: string;
  amount: number;
}

export function PixPayment({ chargeId, paymentUrl, expiresAt, amount }: PixPaymentProps) {
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'EXPIRED'>('PENDING');
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const navigate = useNavigate();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate time left
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const expires = new Date(expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expirado');
        setStatus('EXPIRED');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // Check payment status
  const checkPayment = async () => {
    if (status === 'PAID' || status === 'EXPIRED') return;

    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('check-pix-payment', {
        body: { charge_id: chargeId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.status === 'PAID') {
        setStatus('PAID');
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        // Celebrate!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        toast.success('Pagamento confirmado! Bem-vindo ao Starter 🚀');
        // Redirect after animation
        setTimeout(() => {
          navigate('/dashboard?payment=success');
        }, 2000);
      } else if (data.status === 'EXPIRED') {
        setStatus('EXPIRED');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      }
    } catch (err) {
      console.error('Error checking payment:', err);
    } finally {
      setChecking(false);
    }
  };

  // Auto-poll every 5 seconds
  useEffect(() => {
    if (status === 'PENDING') {
      pollingRef.current = setInterval(checkPayment, 5000);
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [status, chargeId]);

  // Copy payment URL to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  // Open payment URL in new tab
  const handleOpenPayment = () => {
    window.open(paymentUrl, '_blank', 'noopener,noreferrer');
  };

  if (status === 'PAID') {
    return (
      <Card className="border-green-500/50 bg-green-500/10">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-green-400 mb-2">
            Pagamento Confirmado!
          </h3>
          <p className="text-muted-foreground">
            Bem-vindo ao plano Starter. Redirecionando...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'EXPIRED') {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center">
              <Clock className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-destructive mb-2">
            PIX Expirado
          </h3>
          <p className="text-muted-foreground mb-4">
            O código PIX expirou. Gere um novo para continuar.
          </p>
          <Button onClick={() => window.location.reload()}>
            Gerar Novo PIX
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        {/* Amount */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            R$ {amount.toFixed(2).replace('.', ',')}
          </div>
          <div className="text-sm text-muted-foreground">
            Plano Starter - Mensal
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Expira em:</span>
          <span className="font-mono font-bold">{timeLeft}</span>
        </div>

        {/* Pay Button */}
        <Button 
          onClick={handleOpenPayment}
          className="w-full"
          size="lg"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Pagar com PIX
        </Button>

        {/* Copy link */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Ou copie o link de pagamento:
          </label>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg p-3 text-xs font-mono break-all max-h-20 overflow-y-auto">
              {paymentUrl}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Check button */}
        <Button 
          onClick={checkPayment} 
          variant="outline" 
          className="w-full"
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Já Paguei
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          O pagamento é verificado automaticamente a cada 5 segundos.
        </p>
      </CardContent>
    </Card>
  );
}

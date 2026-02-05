import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Crown, Calendar, CreditCard, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useUserPlan } from '@/hooks/useUserPlan';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amount_brl: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export default function Billing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isFree, subscription, isLoading: planLoading } = useUserPlan();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchPayments = async () => {
      const { data } = await supabase
        .from('pix_payments')
        .select('id, amount_brl, status, created_at, paid_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setPayments(data || []);
      setLoadingPayments(false);
    };

    fetchPayments();
  }, [user, navigate]);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      // Update subscription status to cancelled
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast.success('Assinatura cancelada. Você terá acesso até o fim do período.');
      window.location.reload();
    } catch (err) {
      console.error('Error cancelling:', err);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-500/20 text-green-400">Pago</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pendente</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-destructive/20 text-destructive">Expirado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renewalDate = subscription?.current_period_end
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Plano e Cobrança</h1>
          <p className="text-muted-foreground">Gerencie sua assinatura e histórico de pagamentos</p>
        </div>

        {/* Current Plan Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isPro ? (
                <>
                  <Crown className="h-5 w-5 text-primary" />
                  Plano Starter
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 text-muted-foreground" />
                  Plano Free
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isPro ? 'Acesso vitalício à prospecção profissional' : 'Plano básico com 3 buscas vitalícias'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {planLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : isPro ? (
              <>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de acesso</p>
                    <p className="font-medium text-primary">Vitalício (R$ 27,90 pagamento único)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm">
                    Acesso permanente ativo. Suas 100 buscas resetam todo mês automaticamente.
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seu plano Free é vitalício, mas limitado a 3 buscas no total.
                </p>
                <Button asChild>
                  <Link to="/pricing">
                    <Crown className="h-4 w-4 mr-2" />
                    Comprar Acesso Vitalício
                    <ArrowUpRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
            <CardDescription>Seus últimos pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum pagamento realizado ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {payment.amount_brl.toFixed(2).replace('.', ',')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-blue-400">
                          <span className="font-bold text-xs">PIX</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

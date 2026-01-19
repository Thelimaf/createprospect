import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { toast } from 'sonner';
import { 
  Users, Crown, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Shield,
  DollarSign, Target, BarChart3, Zap, CreditCard, CheckCircle2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MASTER_EMAIL = 'anderson.ferlimajunior@gmail.com';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  plan: string;
  plan_name: string;
  plan_status: string;
  upgrade_source: string | null;
  searches_used_lifetime: number;
  searches_used_monthly: number;
  subscription_id: string | null;
  plan_id: string | null;
  leads_count: number;
  last_activity: string | null;
}

interface Stats {
  totalUsers: number;
  starterUsers: number;
  starterPaidUsers: number;
  starterCourtesyUsers: number;
  freeUsers: number;
  conversionRate: number;
  paidConversionRate: number;
  totalLeads: number;
  leadsToday: number;
  totalSearches: number;
  totalCampaigns: number;
  mrr: number;
  totalRevenue: number;
  pendingPayments: number;
  avgTicket: number;
}

interface Charts {
  leadsByDay: { date: string; count: number }[];
  usersByDay: { date: string; count: number }[];
}

const chartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(142, 76%, 36%)",
  },
  users: {
    label: "Usuários",
    color: "hsl(262, 83%, 58%)",
  },
};

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const isMaster = user?.email === MASTER_EMAIL;

  useEffect(() => {
    if (!authLoading && !isMaster) {
      navigate('/dashboard');
      return;
    }
    if (isMaster) {
      fetchData();
    }
  }, [user, authLoading, isMaster, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error fetching data:', data);
        toast.error(data.error || 'Erro ao carregar dados');
        return;
      }

      setUsers(data.users || []);
      setStats(data.stats || null);
      setCharts(data.charts || null);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (userId: string, action: 'upgrade' | 'downgrade') => {
    try {
      setActionLoading(userId);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'POST',
        body: { action, userId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error changing plan:', error);
        toast.error('Erro ao alterar plano');
        return;
      }

      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao alterar plano');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao alterar plano');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      setLoadingPayments(true);
      const { data, error } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        return;
      }
      setPendingPayments(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleSimulatePayment = async (chargeId: string) => {
    try {
      setSimulatorLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão expirada');
        return;
      }

      // Call edge function to simulate payment (needs to be done server-side for API key)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulate-pix-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ charge_id: chargeId }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Erro ao simular pagamento');
        return;
      }

      toast.success('Pagamento simulado com sucesso!');
      fetchPendingPayments();
      fetchData();
    } catch (err) {
      console.error('Error simulating payment:', err);
      toast.error('Erro ao simular pagamento');
    } finally {
      setSimulatorLoading(false);
    }
  };

  const openSimulator = () => {
    setSimulatorOpen(true);
    fetchPendingPayments();
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Gradient pie chart data - separate paid vs courtesy
  const planDistribution = stats ? [
    { name: 'Free', value: stats.freeUsers },
    { name: 'Starter (Pagos)', value: stats.starterPaidUsers },
    { name: 'Starter (Cortesia)', value: stats.starterCourtesyUsers },
  ] : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100);
  };

  if (authLoading || (!isMaster && loading)) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isMaster) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
              <p className="text-sm text-muted-foreground">Métricas e gestão do SaaS</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openSimulator} className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
              <Zap className="h-4 w-4 mr-1" />
              Simulador PIX
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
            </Button>
          </div>
        </div>

        {/* Payment Simulator Dialog */}
        <Dialog open={simulatorOpen} onOpenChange={setSimulatorOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Simulador de Pagamento PIX
              </DialogTitle>
              <DialogDescription>
                Simule pagamentos PIX pendentes para testes (ambiente de desenvolvimento).
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              {loadingPayments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum pagamento pendente</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-3">
                    {pendingPayments.map((payment) => (
                      <Card key={payment.id} className="bg-muted/30 border-border/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{payment.customer_name}</p>
                              <p className="text-sm text-muted-foreground truncate">{payment.customer_email}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                                  PENDENTE
                                </Badge>
                                <span className="text-sm font-medium text-emerald-500">
                                  R$ {payment.amount_brl.toFixed(2)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                                {payment.abacate_charge_id}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSimulatePayment(payment.abacate_charge_id)}
                              disabled={simulatorLoading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {simulatorLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
              
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Modo de desenvolvimento - Os pagamentos simulados são apenas para testes
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Top KPI Cards - Compact Row */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Target className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalLeads?.toLocaleString('pt-BR') || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-500">{formatCurrency(stats?.totalRevenue || 0)}</p>
                      <p className="text-xs text-muted-foreground">Receita Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                      <p className="text-xs text-muted-foreground">Usuários</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <BarChart3 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalSearches?.toLocaleString('pt-BR') || 0}</p>
                      <p className="text-xs text-muted-foreground">Buscas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content - Table + Pie Chart Side by Side */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Users Table */}
              <Card className="lg:col-span-2 bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Usuários ({filteredUsers.length})</CardTitle>
                    <div className="relative w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-8 text-sm bg-background/50"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[320px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Plano</TableHead>
                          <TableHead className="text-xs text-center">Leads</TableHead>
                          <TableHead className="text-xs text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((adminUser) => (
                          <TableRow key={adminUser.id} className="hover:bg-muted/20">
                            <TableCell className="py-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {adminUser.email}
                                  {adminUser.email === MASTER_EMAIL && (
                                    <Badge variant="outline" className="ml-2 text-[10px] border-primary/50 text-primary">Admin</Badge>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(adminUser.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant={adminUser.plan === 'starter' ? 'default' : 'secondary'}
                                  className={adminUser.plan === 'starter' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs w-fit' : 'bg-muted text-xs w-fit'}
                                >
                                  {adminUser.plan === 'starter' && <Crown className="h-3 w-3 mr-1" />}
                                  {adminUser.plan_name}
                                </Badge>
                                {adminUser.plan === 'starter' && (
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      adminUser.upgrade_source === 'payment'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/30 text-[10px] w-fit'
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] w-fit'
                                    }
                                  >
                                    {adminUser.upgrade_source === 'payment' ? 'Pago' : 'Cortesia'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-center font-medium text-sm">{adminUser.leads_count}</TableCell>
                            <TableCell className="py-2 text-right">
                              {adminUser.plan === 'free' ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => handlePlanChange(adminUser.id, 'upgrade')}
                                  disabled={actionLoading === adminUser.id}
                                >
                                  {actionLoading === adminUser.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ArrowUpCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => handlePlanChange(adminUser.id, 'downgrade')}
                                  disabled={actionLoading === adminUser.id}
                                >
                                  {actionLoading === adminUser.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Pie Chart with Gradient */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição de Planos</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center pt-0">
                  <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <PieChart>
                      <defs>
                        <linearGradient id="gradientFree" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="50%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="gradientStarterPaid" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#22c55e" />
                          <stop offset="50%" stopColor="#16a34a" />
                          <stop offset="100%" stopColor="#15803d" />
                        </linearGradient>
                        <linearGradient id="gradientStarterCourtesy" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#d97706" />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="45%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                        nameKey="name"
                        stroke="none"
                      >
                        <Cell fill="url(#gradientFree)" />
                        <Cell fill="url(#gradientStarterPaid)" />
                        <Cell fill="url(#gradientStarterCourtesy)" />
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => {
                          let count = 0;
                          if (value === 'Free') count = stats?.freeUsers || 0;
                          else if (value === 'Starter (Pagos)') count = stats?.starterPaidUsers || 0;
                          else if (value === 'Starter (Cortesia)') count = stats?.starterCourtesyUsers || 0;
                          return <span className="text-sm text-muted-foreground">{value} ({count})</span>;
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  
                  {/* Stats below pie */}
                  <div className="grid grid-cols-2 gap-4 w-full mt-2 pt-4 border-t border-border/50">
                    <div className="text-center">
                      <p className="text-xl font-bold text-green-500">{stats?.paidConversionRate || 0}%</p>
                      <p className="text-xs text-muted-foreground">Conversão (Pagos)</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-emerald-500">{formatCurrency(stats?.mrr || 0)}</p>
                      <p className="text-xs text-muted-foreground">MRR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leads Chart - Full Width */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Leads (últimos 30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <AreaChart data={charts?.leadsByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <ChartTooltip 
                      content={<ChartTooltipContent labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')} />}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(142, 76%, 36%)"
                      strokeWidth={2}
                      fill="url(#leadsGradient)"
                      name="Leads"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

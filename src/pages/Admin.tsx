import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { MetricCard } from '@/components/admin/MetricCard';
import { toast } from 'sonner';
import { 
  Users, Crown, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Shield,
  DollarSign, TrendingUp, Clock, CreditCard, Target, BarChart3, Megaphone,
  UserPlus, Percent
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const MASTER_EMAIL = 'anderson.ferlimajunior@gmail.com';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  plan: string;
  plan_name: string;
  plan_status: string;
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
  freeUsers: number;
  conversionRate: number;
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
  free: {
    label: "Free",
    color: "hsl(220, 14%, 46%)",
  },
  starter: {
    label: "Starter",
    color: "hsl(48, 96%, 53%)",
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

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const planDistribution = stats ? [
    { name: 'Free', value: stats.freeUsers, fill: 'hsl(220, 14%, 46%)' },
    { name: 'Starter', value: stats.starterUsers, fill: 'hsl(48, 96%, 53%)' },
  ] : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // assuming cents
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
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Financial KPIs */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="MRR"
                value={formatCurrency(stats?.mrr || 0)}
                icon={DollarSign}
                iconColor="text-emerald-500"
                valueColor="text-emerald-500"
                description="Receita mensal recorrente"
              />
              <MetricCard
                title="Receita Total"
                value={formatCurrency(stats?.totalRevenue || 0)}
                icon={TrendingUp}
                iconColor="text-blue-500"
                description="Faturamento lifetime"
              />
              <MetricCard
                title="Pag. Pendentes"
                value={stats?.pendingPayments || 0}
                icon={Clock}
                iconColor="text-amber-500"
                valueColor={stats?.pendingPayments ? "text-amber-500" : undefined}
                description="PIX aguardando"
              />
              <MetricCard
                title="Ticket Médio"
                value={formatCurrency(stats?.avgTicket || 0)}
                icon={CreditCard}
                iconColor="text-purple-500"
                description="Valor médio por pagamento"
              />
            </div>

            {/* User KPIs */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Usuários"
                value={stats?.totalUsers || 0}
                icon={Users}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="Usuários Starter"
                value={stats?.starterUsers || 0}
                icon={Crown}
                iconColor="text-yellow-500"
                valueColor="text-yellow-500"
              />
              <MetricCard
                title="Usuários Free"
                value={stats?.freeUsers || 0}
                icon={UserPlus}
                iconColor="text-slate-500"
              />
              <MetricCard
                title="Taxa Conversão"
                value={`${stats?.conversionRate || 0}%`}
                icon={Percent}
                iconColor="text-emerald-500"
                valueColor={stats?.conversionRate && stats.conversionRate > 0 ? "text-emerald-500" : undefined}
                description="Free → Starter"
              />
            </div>

            {/* Activity KPIs */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Leads"
                value={stats?.totalLeads?.toLocaleString('pt-BR') || 0}
                icon={Target}
                iconColor="text-emerald-500"
              />
              <MetricCard
                title="Leads Hoje"
                value={stats?.leadsToday || 0}
                icon={TrendingUp}
                iconColor="text-emerald-500"
                valueColor="text-emerald-500"
              />
              <MetricCard
                title="Total Buscas"
                value={stats?.totalSearches?.toLocaleString('pt-BR') || 0}
                icon={BarChart3}
                iconColor="text-blue-500"
              />
              <MetricCard
                title="Campanhas"
                value={stats?.totalCampaigns || 0}
                icon={Megaphone}
                iconColor="text-purple-500"
              />
            </div>

            {/* Charts */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Leads Chart */}
              <Card className="lg:col-span-2 bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Leads (últimos 30 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <AreaChart data={charts?.leadsByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
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

              {/* Plan Distribution */}
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Distribuição de Planos</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
                <div className="flex justify-center gap-6 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span className="text-sm text-muted-foreground">Free ({stats?.freeUsers})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm text-muted-foreground">Starter ({stats?.starterUsers})</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* New Users Chart */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Novos Usuários (últimos 14 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                  <BarChart data={charts?.usersByDay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Bar
                      dataKey="count"
                      fill="hsl(262, 83%, 58%)"
                      radius={[4, 4, 0, 0]}
                      name="Usuários"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usuários</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por email ou nome..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background/50"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead className="text-center">Leads</TableHead>
                        <TableHead className="text-center">Buscas</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((adminUser) => (
                        <TableRow key={adminUser.id} className="hover:bg-muted/20">
                          <TableCell className="font-medium">
                            {adminUser.email}
                            {adminUser.email === MASTER_EMAIL && (
                              <Badge variant="outline" className="ml-2 text-xs border-primary/50 text-primary">Admin</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{adminUser.full_name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={adminUser.plan === 'starter' ? 'default' : 'secondary'}
                              className={adminUser.plan === 'starter' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-muted'}
                            >
                              {adminUser.plan === 'starter' && <Crown className="h-3 w-3 mr-1" />}
                              {adminUser.plan_name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">{adminUser.leads_count}</TableCell>
                          <TableCell className="text-center">{adminUser.searches_used_lifetime}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {adminUser.last_activity 
                              ? formatDistanceToNow(new Date(adminUser.last_activity), { addSuffix: true, locale: ptBR })
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDistanceToNow(new Date(adminUser.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            {adminUser.plan === 'free' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => handlePlanChange(adminUser.id, 'upgrade')}
                                disabled={actionLoading === adminUser.id}
                              >
                                {actionLoading === adminUser.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ArrowUpCircle className="h-4 w-4 mr-1" />
                                    Dar PRO
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => handlePlanChange(adminUser.id, 'downgrade')}
                                disabled={actionLoading === adminUser.id}
                              >
                                {actionLoading === adminUser.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ArrowDownCircle className="h-4 w-4 mr-1" />
                                    Remover PRO
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

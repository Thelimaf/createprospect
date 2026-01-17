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
import { toast } from 'sonner';
import { Users, Crown, Search, Loader2, ArrowUpCircle, ArrowDownCircle, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
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
      fetchUsers();
    }
  }, [user, authLoading, isMaster, navigate]);

  const fetchUsers = async () => {
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
        console.error('Error fetching users:', data);
        toast.error(data.error || 'Erro ao carregar usuários');
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erro ao carregar usuários');
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
        fetchUsers(); // Refresh list
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

  const stats = {
    total: users.length,
    free: users.filter(u => u.plan === 'free').length,
    starter: users.filter(u => u.plan === 'starter').length,
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
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-muted-foreground">Gerencie usuários e planos</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Free</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.free}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Starter</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.starter}</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Usuários</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Email</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Buscas (Lifetime)</TableHead>
                      <TableHead>Buscas (Mês)</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((adminUser) => (
                      <TableRow key={adminUser.id}>
                        <TableCell className="font-medium">
                          {adminUser.email}
                          {adminUser.email === MASTER_EMAIL && (
                            <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell>{adminUser.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={adminUser.plan === 'starter' ? 'default' : 'secondary'}
                            className={adminUser.plan === 'starter' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                          >
                            {adminUser.plan === 'starter' && <Crown className="h-3 w-3 mr-1" />}
                            {adminUser.plan_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{adminUser.searches_used_lifetime}</TableCell>
                        <TableCell>{adminUser.searches_used_monthly}</TableCell>
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
                              className="text-green-500 border-green-500/30 hover:bg-green-500/10"
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
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

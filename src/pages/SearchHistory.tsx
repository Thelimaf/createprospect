import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Search, Eye, Calendar, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GoogleMapsSearch {
  id: string;
  query: string;
  total_results: number;
  new_leads: number;
  duplicates: number;
  updated_leads: number;
  created_at: string;
  campaign_id: string | null;
}

export default function SearchHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState<GoogleMapsSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSearches();
  }, [user]);

  const fetchSearches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("google_maps_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching searches:", error);
    } else {
      setSearches(data || []);
    }
    setIsLoading(false);
  };

  const handleViewLeads = (searchId: string) => {
    navigate(`/google-maps-leads?search_id=${searchId}`);
  };

  const getStatusBadge = (search: GoogleMapsSearch) => {
    if (search.total_results === 0) {
      return <Badge variant="outline" className="bg-muted text-muted-foreground">Sem resultados</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completo</Badge>;
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <History className="h-8 w-8 text-primary" />
              Histórico de Buscas
            </h1>
            <p className="text-muted-foreground mt-1">
              Visualize todas as suas buscas anteriores no Google Maps
            </p>
          </div>
          <Button onClick={() => navigate("/google-maps-leads")}>
            <Search className="mr-2 h-4 w-4" />
            Nova Busca
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Buscas</p>
                  <p className="text-2xl font-bold text-foreground">{searches.length}</p>
                </div>
                <Search className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Leads Novos</p>
                  <p className="text-2xl font-bold text-green-400">
                    {searches.reduce((acc, s) => acc + (s.new_leads || 0), 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Duplicados</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {searches.reduce((acc, s) => acc + (s.duplicates || 0), 0)}
                  </p>
                </div>
                <History className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {searches.reduce((acc, s) => acc + (s.updated_leads || 0), 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Searches Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Buscas Recentes</CardTitle>
            <CardDescription className="text-muted-foreground">
              Clique em uma busca para ver os leads encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {searches.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma busca realizada ainda. Faça sua primeira busca!
                </p>
                <Button className="mt-4" onClick={() => navigate("/google-maps-leads")}>
                  Fazer Primeira Busca
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Busca</TableHead>
                    <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                    <TableHead className="text-muted-foreground text-center">Total</TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <span className="text-green-400">Novos</span>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <span className="text-blue-400">Duplicados</span>
                    </TableHead>
                    <TableHead className="text-muted-foreground text-center">
                      <span className="text-yellow-400">Atualizados</span>
                    </TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searches.map((search) => (
                    <TableRow
                      key={search.id}
                      className="border-border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewLeads(search.id)}
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-primary" />
                          <span className="truncate max-w-[200px]">{search.query}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(search.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center text-foreground font-medium">
                        {search.total_results}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {search.new_leads}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                          {search.duplicates}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          {search.updated_leads}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(search)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewLeads(search.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Leads
                        </Button>
                      </TableCell>
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

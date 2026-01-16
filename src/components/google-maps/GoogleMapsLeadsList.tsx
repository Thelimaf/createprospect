import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, 
  Mail, 
  MapPin, 
  Globe, 
  Star, 
  Download,
  Phone,
  Users,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Lead {
  id: string;
  business_name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  google_maps_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  status: string;
  last_contact_date: string | null;
}

const statusConfig = {
  new: { label: "Novo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contacted: { label: "Contactado", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  interested: { label: "Interessado", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  not_interested: { label: "Não interessado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  waiting: { label: "Aguardando", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const defaultWhatsAppTemplate = "Olá! Vim através do Google e gostaria de apresentar nossa solução para *{business_name}*. Podemos conversar?";

export function GoogleMapsLeadsList() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappTemplate, setWhatsappTemplate] = useState(defaultWhatsAppTemplate);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    if (!user) return;
    
    fetchLeads();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("google_maps_leads_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "google_maps_leads",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchLeads = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("google_maps_leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      setLeads(data || []);
    }
    setIsLoading(false);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesCity = !cityFilter || lead.city?.toLowerCase().includes(cityFilter.toLowerCase());
      return matchesStatus && matchesCity;
    });
  }, [leads, statusFilter, cityFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status === "new").length;
    const contacted = leads.filter((l) => l.status === "contacted").length;
    const withWhatsApp = leads.filter((l) => l.phone).length;
    return { total, newLeads, contacted, withWhatsApp };
  }, [leads]);

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(leads.map((l) => l.city).filter(Boolean))];
    return uniqueCities.sort();
  }, [leads]);

  const updateLeadStatus = async (leadId: string, status: string) => {
    const { error } = await supabase
      .from("google_maps_leads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", leadId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success("Status atualizado");
    }
  };

  const handleWhatsAppClick = async (lead: Lead) => {
    if (!lead.phone) return;

    // Update status to contacted
    await supabase
      .from("google_maps_leads")
      .update({ 
        status: "contacted", 
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", lead.id);

    // Generate personalized message
    const message = whatsappTemplate
      .replace(/{business_name}/g, lead.business_name)
      .replace(/{category}/g, lead.category || "")
      .replace(/{city}/g, lead.city || "");

    const phone = lead.phone.startsWith("55") ? lead.phone : `55${lead.phone}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const exportToCsv = () => {
    const headers = ["Nome", "Telefone", "Email", "Endereço", "Status", "Link WhatsApp"];
    const rows = filteredLeads.map((lead) => {
      const phone = lead.phone?.startsWith("55") ? lead.phone : `55${lead.phone}`;
      const whatsappUrl = lead.phone ? `https://wa.me/${phone}` : "";
      return [
        lead.business_name,
        lead.phone || "",
        lead.email || "",
        lead.address || "",
        statusConfig[lead.status as keyof typeof statusConfig]?.label || lead.status,
        whatsappUrl,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads_google_maps_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("CSV exportado com sucesso!");
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < Math.round(rating) ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos</p>
                <p className="text-2xl font-bold text-blue-400">{stats.newLeads}</p>
              </div>
              <UserCheck className="h-8 w-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contactados</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.contacted}</p>
              </div>
              <Phone className="h-8 w-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com WhatsApp</p>
                <p className="text-2xl font-bold text-green-400">{stats.withWhatsApp}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WhatsApp Template */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground">
            Template WhatsApp
            <span className="text-xs text-muted-foreground ml-2">
              Variáveis: {"{business_name}"}, {"{category}"}, {"{city}"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={whatsappTemplate}
            onChange={(e) => setWhatsappTemplate(e.target.value)}
            className="bg-input border-border text-foreground min-h-[80px]"
            placeholder="Digite sua mensagem..."
          />
        </CardContent>
      </Card>

      {/* Filters and Export */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-input border-border text-foreground">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[180px] bg-input border-border text-foreground">
            <SelectValue placeholder="Filtrar por cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas as cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city || ""}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={exportToCsv} className="ml-auto">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Leads List */}
      {filteredLeads.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {leads.length === 0 
                ? "Nenhum lead encontrado. Faça uma busca para começar!"
                : "Nenhum lead corresponde aos filtros selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{lead.business_name}</h3>
                    {lead.category && (
                      <p className="text-sm text-muted-foreground">{lead.category}</p>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={statusConfig[lead.status as keyof typeof statusConfig]?.color || ""}
                  >
                    {statusConfig[lead.status as keyof typeof statusConfig]?.label || lead.status}
                  </Badge>
                </div>

                {renderStars(lead.rating)}

                {lead.reviews_count && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {lead.reviews_count} avaliações
                  </p>
                )}

                {lead.address && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{lead.address}</span>
                  </p>
                )}

                {lead.phone && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {lead.phone && (
                    <Button
                      size="sm"
                      onClick={() => handleWhatsAppClick(lead)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <MessageCircle className="mr-1 h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                  
                  {lead.email && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`mailto:${lead.email}`, "_blank")}
                    >
                      <Mail className="mr-1 h-4 w-4" />
                      Email
                    </Button>
                  )}

                  {lead.google_maps_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(lead.google_maps_url!, "_blank")}
                    >
                      <MapPin className="mr-1 h-4 w-4" />
                      Maps
                    </Button>
                  )}

                  {lead.website && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(lead.website!, "_blank")}
                    >
                      <Globe className="mr-1 h-4 w-4" />
                      Site
                    </Button>
                  )}
                </div>

                {/* Status Change Buttons */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateLeadStatus(lead.id, "interested")}
                    className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                  >
                    <UserCheck className="mr-1 h-3 w-3" />
                    Interessado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateLeadStatus(lead.id, "not_interested")}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <UserX className="mr-1 h-3 w-3" />
                    Não interessado
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateLeadStatus(lead.id, "waiting")}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                  >
                    <Clock className="mr-1 h-3 w-3" />
                    Aguardando
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Clock,
  Plus,
  Briefcase
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ExternalLinkButton } from "@/components/shared/ExternalLinkButton";
import { IframeWarningBanner } from "@/components/shared/IframeWarningBanner";
import { LeadUrlsTooltip } from "@/components/shared/LeadUrlsTooltip";
import { 
  normalizePhoneBR, 
  buildWhatsAppUrl, 
  ensureHttps, 
  normalizeMapsUrl,
  logExternalLinkAttempt 
} from "@/lib/external-links";

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
  campaign_id: string | null;
}

interface Campaign {
  id: string;
  name: string;
}

interface GoogleMapsLeadsListProps {
  campaignId?: string;
  campaignName?: string;
}

const statusConfig = {
  new: { label: "Novo", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contacted: { label: "Contactado", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  interested: { label: "Interessado", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  not_interested: { label: "Não interessado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  waiting: { label: "Aguardando", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
};

const defaultWhatsAppTemplate = "Olá! Vim através do Google e gostaria de apresentar nossa solução para *{business_name}*. Podemos conversar?";

export function GoogleMapsLeadsList({ campaignId, campaignName }: GoogleMapsLeadsListProps) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [whatsappTemplate, setWhatsappTemplate] = useState(defaultWhatsAppTemplate);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState("");
  
  // Add to campaign dialog state
  const [addToCampaignOpen, setAddToCampaignOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>([]);
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    
    fetchLeads();
    if (!campaignId) {
      fetchUserCampaigns();
    }

    // Subscribe to realtime updates with campaign filter
    const channel = supabase
      .channel(`google_maps_leads_${campaignId || 'all'}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "google_maps_leads",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // If we're filtering by campaign, only refetch if the change is relevant
          if (campaignId) {
            const newRecord = payload.new as Lead | undefined;
            const oldRecord = payload.old as { campaign_id?: string } | undefined;
            if (newRecord?.campaign_id === campaignId || oldRecord?.campaign_id === campaignId) {
              fetchLeads();
            }
          } else {
            fetchLeads();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, campaignId]);

  const fetchLeads = async () => {
    if (!user) return;
    
    let query = supabase
      .from("google_maps_leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // If campaignId is provided, filter by campaign
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } else {
      setLeads(data || []);
      // Fetch campaign names for leads with campaign_id (only for standalone page)
      if (!campaignId && data) {
        const campaignIds = [...new Set(data.map(l => l.campaign_id).filter(Boolean))];
        if (campaignIds.length > 0) {
          const { data: campaigns } = await supabase
            .from("campaigns")
            .select("id, name")
            .in("id", campaignIds);
          if (campaigns) {
            const names: Record<string, string> = {};
            campaigns.forEach(c => { names[c.id] = c.name; });
            setCampaignNames(names);
          }
        }
      }
    }
    setIsLoading(false);
  };

  const fetchUserCampaigns = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("campaigns")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    setUserCampaigns(data || []);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      const matchesCity = cityFilter === "all" || !cityFilter || lead.city?.toLowerCase().includes(cityFilter.toLowerCase());
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

  // Update status when clicking WhatsApp link
  const handleWhatsAppContact = async (lead: Lead) => {
    logExternalLinkAttempt({
      context: 'whatsapp_contact',
      method: 'direct_anchor',
      url: buildWhatsAppUrl(lead.phone!, getWhatsAppMessage(lead)),
      leadId: lead.id,
    });
    
    await supabase
      .from("google_maps_leads")
      .update({ 
        status: "contacted", 
        last_contact_date: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", lead.id);
  };

  // Generate WhatsApp message from template
  const getWhatsAppMessage = (lead: Lead): string => {
    return whatsappTemplate
      .replace(/{business_name}/g, lead.business_name)
      .replace(/{category}/g, lead.category || "")
      .replace(/{city}/g, lead.city || "");
  };

  const exportToCsv = () => {
    const headers = ["Nome", "Telefone", "Email", "Endereço", "Status", "Link WhatsApp"];
    const rows = filteredLeads.map((lead) => {
      const normalizedPhone = lead.phone ? normalizePhoneBR(lead.phone) : "";
      // Use wa.me for CSV export - universal format
      const whatsappUrl = lead.phone ? `https://wa.me/${normalizedPhone}` : "";
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
    
    // Custom filename based on campaign
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = campaignName 
      ? `leads-${campaignName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.csv`
      : `leads_google_maps_${timestamp}.csv`;
    
    link.download = filename;
    link.click();
    toast.success("CSV exportado com sucesso!");
  };

  const openAddToCampaignDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setSelectedCampaignId("");
    setAddToCampaignOpen(true);
  };

  const handleAddToCampaign = async () => {
    if (!selectedLead || !selectedCampaignId) return;

    const { error } = await supabase
      .from("google_maps_leads")
      .update({ 
        campaign_id: selectedCampaignId,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedLead.id);

    if (error) {
      toast.error("Erro ao adicionar lead à campanha");
    } else {
      const campaign = userCampaigns.find(c => c.id === selectedCampaignId);
      toast.success(`Lead adicionado à campanha "${campaign?.name}"`);
      setAddToCampaignOpen(false);
      setSelectedLead(null);
      setSelectedCampaignId("");
    }
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
      {/* Iframe Warning Banner */}
      <IframeWarningBanner />

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

        <Select value={cityFilter || "all"} onValueChange={(val) => setCityFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-[180px] bg-input border-border text-foreground">
            <SelectValue placeholder="Filtrar por cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city || "unknown"}>{city}</SelectItem>
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
            <Card key={lead.id} className="bg-card border-border hover:border-primary/50 transition-colors relative">
              {/* Campaign Badge & Info Tooltip */}
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <LeadUrlsTooltip
                  phone={lead.phone}
                  googleMapsUrl={lead.google_maps_url}
                  website={lead.website}
                  whatsappMessage={getWhatsAppMessage(lead)}
                />
                {lead.campaign_id ? (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-primary/10 text-primary border-primary/30 max-w-[100px] truncate"
                    title={campaignNames[lead.campaign_id] || campaignName || "Campanha"}
                  >
                    <Briefcase className="h-3 w-3 mr-1" />
                    {campaignNames[lead.campaign_id] || campaignName || "Campanha"}
                  </Badge>
                ) : (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-muted text-muted-foreground border-border"
                  >
                    Avulso
                  </Badge>
                )}
              </div>

              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3 pr-28">
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

                {/* Action Buttons with ExternalLinkButton */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {lead.phone && (
                    <ExternalLinkButton
                      url={buildWhatsAppUrl(lead.phone, getWhatsAppMessage(lead))}
                      label="WhatsApp"
                      icon={<MessageCircle className="mr-1 h-4 w-4" />}
                      toastLabel="Abrindo WhatsApp..."
                      onBeforeOpen={() => handleWhatsAppContact(lead)}
                      context="lead_whatsapp"
                      leadId={lead.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    />
                  )}
                  
                  {lead.email && (
                    <ExternalLinkButton
                      url={`mailto:${lead.email}`}
                      label="Email"
                      icon={<Mail className="mr-1 h-4 w-4" />}
                      toastLabel="Abrindo Email..."
                      context="lead_email"
                      leadId={lead.id}
                    />
                  )}

                  {lead.google_maps_url && (
                    <ExternalLinkButton
                      url={normalizeMapsUrl(lead.google_maps_url)}
                      label="Maps"
                      icon={<MapPin className="mr-1 h-4 w-4" />}
                      toastLabel="Abrindo Google Maps..."
                      context="lead_maps"
                      leadId={lead.id}
                    />
                  )}

                  {lead.website && (
                    <ExternalLinkButton
                      url={ensureHttps(lead.website)}
                      label="Site"
                      icon={<Globe className="mr-1 h-4 w-4" />}
                      toastLabel="Abrindo Site..."
                      context="lead_website"
                      leadId={lead.id}
                    />
                  )}

                  {/* Add to Campaign button - only show on standalone page for leads without campaign */}
                  {!campaignId && !lead.campaign_id && userCampaigns.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddToCampaignDialog(lead)}
                      className="text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Campanha
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

      {/* Add to Campaign Dialog */}
      <Dialog open={addToCampaignOpen} onOpenChange={setAddToCampaignOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Lead à Campanha</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione uma campanha para vincular "{selectedLead?.business_name}"
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="bg-input border-border text-foreground">
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              {userCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToCampaignOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddToCampaign} disabled={!selectedCampaignId}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

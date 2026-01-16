import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Check, 
  X, 
  Phone, 
  MapPin, 
  Merge,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import levenshtein from "fast-levenshtein";

interface Lead {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  possible_duplicate_of: string | null;
  duplicate_score: number | null;
  created_at: string;
}

interface DuplicateGroup {
  id: string;
  leads: Lead[];
  similarity: number;
}

// Calculate similarity between two addresses
function calculateAddressSimilarity(addr1: string | null, addr2: string | null): number {
  if (!addr1 || !addr2) return 0;
  
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const n1 = normalize(addr1);
  const n2 = normalize(addr2);
  
  if (n1 === n2) return 1;
  
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshtein.get(n1, n2);
  return (longer.length - distance) / longer.length;
}

// Find potential duplicates
function findDuplicates(leads: Lead[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < leads.length; i++) {
    if (processed.has(leads[i].id)) continue;

    const group: Lead[] = [leads[i]];
    
    for (let j = i + 1; j < leads.length; j++) {
      if (processed.has(leads[j].id)) continue;

      const lead1 = leads[i];
      const lead2 = leads[j];

      // Calculate name similarity
      const nameDistance = levenshtein.get(
        lead1.business_name.toLowerCase(),
        lead2.business_name.toLowerCase()
      );

      // Check phone match
      const phoneMatch = lead1.phone && lead2.phone && lead1.phone === lead2.phone;

      // Check address similarity
      const addressSimilarity = calculateAddressSimilarity(lead1.address, lead2.address);

      // If name edit distance < 3 AND (phone equals OR address > 80% similar)
      if (nameDistance < 3 && (phoneMatch || addressSimilarity > 0.8)) {
        group.push(lead2);
        processed.add(leads[j].id);
      }
    }

    if (group.length > 1) {
      processed.add(leads[i].id);
      const similarity = 1 - (levenshtein.get(
        group[0].business_name.toLowerCase(),
        group[1].business_name.toLowerCase()
      ) / Math.max(group[0].business_name.length, group[1].business_name.length));
      
      groups.push({
        id: leads[i].id,
        leads: group,
        similarity: Math.round(similarity * 100),
      });
    }
  }

  return groups;
}

export default function Duplicates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchLeads();
  }, [user]);

  const fetchLeads = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("google_maps_leads")
      .select("id, business_name, phone, address, city, category, rating, reviews_count, possible_duplicate_of, duplicate_score, created_at")
      .eq("user_id", user.id)
      .order("business_name", { ascending: true });

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      setLeads(data || []);
    }
    setIsLoading(false);
  };

  const duplicateGroups = useMemo(() => findDuplicates(leads), [leads]);

  const handleMerge = async (group: DuplicateGroup) => {
    setMerging(group.id);
    
    try {
      // Keep the oldest lead (first created), delete the rest
      const sortedLeads = [...group.leads].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const keepLead = sortedLeads[0];
      const deleteIds = sortedLeads.slice(1).map(l => l.id);

      // Delete duplicate leads
      const { error } = await supabase
        .from("google_maps_leads")
        .delete()
        .in("id", deleteIds);

      if (error) throw error;

      toast.success(`${deleteIds.length} duplicatas removidas`);
      fetchLeads();
    } catch (error) {
      console.error("Error merging:", error);
      toast.error("Erro ao mesclar leads");
    } finally {
      setMerging(null);
    }
  };

  const handleMarkDifferent = async (group: DuplicateGroup) => {
    setMerging(group.id);
    
    try {
      // Mark all leads in this group as NOT duplicates by setting a flag
      // We'll use duplicate_score = 0 to indicate "verified as different"
      const { error } = await supabase
        .from("google_maps_leads")
        .update({ duplicate_score: 0 })
        .in("id", group.leads.map(l => l.id));

      if (error) throw error;

      toast.success("Leads marcados como diferentes");
      fetchLeads();
    } catch (error) {
      console.error("Error marking different:", error);
      toast.error("Erro ao marcar como diferentes");
    } finally {
      setMerging(null);
    }
  };

  // Filter out groups where duplicate_score is 0 (verified as different)
  const activeGroups = duplicateGroups.filter(group => 
    !group.leads.every(l => l.duplicate_score === 0)
  );

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/google-maps-leads")}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              Possíveis Duplicados
            </h1>
            <p className="text-muted-foreground mt-1">
              {activeGroups.length} grupos de possíveis duplicados encontrados
            </p>
          </div>
        </div>

        {activeGroups.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Check className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-foreground text-lg font-medium">
                Nenhum duplicado encontrado!
              </p>
              <p className="text-muted-foreground mt-2">
                Sua base de leads está limpa.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeGroups.map((group) => (
              <Card 
                key={group.id} 
                className="bg-card border-orange-500/30 hover:border-orange-500/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        Possível Duplicado
                      </Badge>
                      <span className="text-sm font-normal text-muted-foreground">
                        {group.similarity}% similaridade
                      </span>
                    </CardTitle>
                    <Badge variant="outline" className="text-muted-foreground">
                      {group.leads.length} leads
                    </Badge>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    Estes leads parecem ser a mesma empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {group.leads.map((lead, index) => (
                      <div 
                        key={lead.id} 
                        className={`p-4 rounded-lg border ${
                          index === 0 
                            ? "border-green-500/30 bg-green-500/5" 
                            : "border-border bg-muted/30"
                        }`}
                      >
                        {index === 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mb-2">
                            Mais antigo (será mantido)
                          </Badge>
                        )}
                        <h4 className="font-semibold text-foreground">{lead.business_name}</h4>
                        {lead.category && (
                          <p className="text-sm text-muted-foreground">{lead.category}</p>
                        )}
                        {lead.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </p>
                        )}
                        {lead.address && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{lead.address}</span>
                          </p>
                        )}
                        {lead.rating && (
                          <p className="text-sm text-yellow-400 mt-1">
                            ⭐ {lead.rating.toFixed(1)} ({lead.reviews_count} avaliações)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <Button
                      onClick={() => handleMerge(group)}
                      disabled={merging === group.id}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Merge className="h-4 w-4 mr-2" />
                      Mesclar (manter mais antigo)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleMarkDifferent(group)}
                      disabled={merging === group.id}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Marcar como Diferentes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

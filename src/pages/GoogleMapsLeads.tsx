import { AppShell } from "@/components/layout/AppShell";
import { GoogleMapsScraper } from "@/components/google-maps/GoogleMapsScraper";
import { GoogleMapsLeadsList } from "@/components/google-maps/GoogleMapsLeadsList";

export default function GoogleMapsLeads() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads do Google Maps</h1>
          <p className="text-muted-foreground mt-1">
            Encontre e gerencie leads de empresas locais
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <GoogleMapsScraper />
          </div>
          <div className="lg:col-span-2">
            <GoogleMapsLeadsList />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

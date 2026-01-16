import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutList, LayoutDashboard } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { GoogleMapsLeadsList } from '@/components/google-maps/GoogleMapsLeadsList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ViewMode = 'kanban' | 'list';

export default function LeadsKanban() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('leadsViewMode');
    return (saved as ViewMode) || 'kanban';
  });

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('leadsViewMode', viewMode);
  }, [viewMode]);

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Leads</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus leads com visualização Kanban ou Lista
            </p>
          </div>

          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {viewMode === 'kanban' ? (
            <KanbanBoard />
          ) : (
            <div className="h-full overflow-auto">
              <GoogleMapsLeadsList />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

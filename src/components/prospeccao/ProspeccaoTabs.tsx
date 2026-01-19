import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Building2, FolderOpen } from 'lucide-react';
import { ProspectarTab } from './ProspectarTab';
import { CnpjLookup } from './CnpjLookup';
import { MinhaBaseTab } from './MinhaBaseTab';

interface ProspeccaoTabsProps {
  baseCount: number;
}

export function ProspeccaoTabs({ baseCount }: ProspeccaoTabsProps) {
  return (
    <Tabs defaultValue="prospectar" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-lg">
        <TabsTrigger value="prospectar" className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Prospectar
        </TabsTrigger>
        <TabsTrigger value="cnpj" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Consulta CNPJ
        </TabsTrigger>
        <TabsTrigger value="base" className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Base ({baseCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="prospectar" className="mt-6">
        <ProspectarTab />
      </TabsContent>

      <TabsContent value="cnpj" className="mt-6">
        <CnpjLookup />
      </TabsContent>

      <TabsContent value="base" className="mt-6">
        <MinhaBaseTab />
      </TabsContent>
    </Tabs>
  );
}

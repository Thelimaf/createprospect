import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLinkButton } from "@/components/shared/ExternalLinkButton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, 
  MapPin, 
  Globe, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings as SettingsIcon,
  Copy,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { 
  logExternalLinkAttempt, 
  testPopupBlocker, 
  isRunningInIframe 
} from "@/lib/external-links";
import { useDuplicateBehavior, DuplicateBehavior } from "@/hooks/useDuplicateBehavior";

export default function Settings() {
  const { behavior, updateBehavior, isLoading: behaviorLoading } = useDuplicateBehavior();
  const [testResults, setTestResults] = useState<{
    windowOpen?: boolean;
    iframe: boolean;
  }>({
    iframe: isRunningInIframe(),
  });

  const handleBehaviorChange = async (value: DuplicateBehavior) => {
    const success = await updateBehavior(value);
    if (success) {
      toast.success("Configuração salva");
    } else {
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleWindowOpenTest = async () => {
    const testUrl = 'https://wa.me/5543999999999';
    
    logExternalLinkAttempt({
      context: 'settings_test',
      method: 'window_open_test',
      url: testUrl,
    });

    const blocked = await testPopupBlocker(testUrl);
    
    setTestResults(prev => ({ ...prev, windowOpen: blocked }));
    
    if (blocked) {
      toast.error('Popup BLOQUEADO pelo navegador');
    } else {
      toast.success('Popup LIBERADO - window.open funcionou');
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configurações e testes da aplicação
          </p>
        </div>

        {/* LAYER 9: Duplicate Behavior Settings */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Comportamento de Duplicatas
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Configure como o sistema deve lidar com leads duplicados durante as buscas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={behavior} 
              onValueChange={(v) => handleBehaviorChange(v as DuplicateBehavior)}
              disabled={behaviorLoading}
              className="space-y-4"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="ignore" id="ignore" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="ignore" className="text-foreground font-medium cursor-pointer">
                    Sempre ignorar duplicatas (padrão)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Leads que já existem na base serão ignorados, mantendo os dados originais
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="update" id="update" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="update" className="text-foreground font-medium cursor-pointer flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-yellow-400" />
                    Sempre atualizar dados de duplicatas
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Dados melhores (rating, reviews, telefone) serão mesclados automaticamente
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="ask" id="ask" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="ask" className="text-foreground font-medium cursor-pointer flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-400" />
                    Sempre perguntar o que fazer
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Um diálogo será exibido perguntando como lidar com cada busca
                  </p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* External Links Test Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Teste de Links Externos
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Use estes botões para verificar se links externos estão funcionando no seu navegador/ambiente.
              Se os links não abrirem, copie a URL manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Environment Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">Ambiente Detectado:</h4>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  {testResults.iframe ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm text-foreground">
                    {testResults.iframe ? 'Rodando em iframe (preview)' : 'Rodando diretamente'}
                  </span>
                </div>
                {testResults.windowOpen !== undefined && (
                  <div className="flex items-center gap-2">
                    {testResults.windowOpen ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-sm text-foreground">
                      {testResults.windowOpen ? 'Popups bloqueados' : 'Popups liberados'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* WhatsApp Test */}
              <div className="p-4 rounded-lg border border-border bg-card">
                <h4 className="text-sm font-medium text-foreground mb-2">WhatsApp (wa.me)</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Testa link wa.me com número de exemplo
                </p>
                <ExternalLinkButton
                  url="https://wa.me/5543999999999?text=Teste"
                  label="Testar WhatsApp"
                  icon={<MessageCircle className="mr-1 h-4 w-4" />}
                  toastLabel="Abrindo WhatsApp..."
                  context="settings_whatsapp_test"
                  className="bg-green-600 hover:bg-green-700 text-white"
                />
              </div>

              {/* Google Maps Test */}
              <div className="p-4 rounded-lg border border-border bg-card">
                <h4 className="text-sm font-medium text-foreground mb-2">Google Maps</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Testa link do Google Maps
                </p>
                <ExternalLinkButton
                  url="https://www.google.com/maps?q=São+Paulo,+Brazil"
                  label="Testar Maps"
                  icon={<MapPin className="mr-1 h-4 w-4" />}
                  toastLabel="Abrindo Google Maps..."
                  context="settings_maps_test"
                />
              </div>

              {/* Website Test */}
              <div className="p-4 rounded-lg border border-border bg-card">
                <h4 className="text-sm font-medium text-foreground mb-2">Website Externo</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Testa link para site externo
                </p>
                <ExternalLinkButton
                  url="https://example.com"
                  label="Testar Site"
                  icon={<Globe className="mr-1 h-4 w-4" />}
                  toastLabel="Abrindo Site..."
                  context="settings_site_test"
                />
              </div>
            </div>

            {/* Window.open Test */}
            <div className="p-4 rounded-lg border border-dashed border-border">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Teste de Popup Blocker (window.open)
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Este teste usa window.open diretamente para detectar se o navegador está bloqueando popups.
                Isso ajuda a diagnosticar problemas com links externos.
              </p>
              <Button
                onClick={handleWindowOpenTest}
                variant="outline"
                className="border-border"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Testar via window.open
              </Button>
            </div>

            {/* Instructions */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="text-sm font-medium text-foreground mb-2">📋 Como usar:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. Clique em um dos botões de teste acima</li>
                <li>2. Se o link abrir normalmente, tudo está funcionando</li>
                <li>3. Se não abrir, copie a URL e cole em uma nova aba</li>
                <li>4. Se estiver em preview/iframe, abra a aplicação em nova aba para melhor experiência</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

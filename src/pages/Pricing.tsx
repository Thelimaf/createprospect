import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Check, 
  X, 
  Crown, 
  Search, 
  Download, 
  MessageSquare, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  Users,
  FileText,
  Infinity,
  Phone,
  Mail,
  Globe,
  Kanban,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Pricing() {
  const { user } = useAuth();

  const freeFeatures = [
    { text: '3 buscas vitalícias (≈60 leads)', icon: Search, included: true },
    { text: '1 campanha', icon: FileText, included: true },
    { text: 'Ver telefone e endereço', icon: Phone, included: true },
    { text: '3 primeiros leads desbloqueados', icon: Check, included: true },
  ];

  const freeBlockedFeatures = [
    { text: 'Dados completos em todos leads', icon: Users },
    { text: 'Export CSV', icon: Download },
    { text: 'WhatsApp 1-click ilimitado', icon: MessageSquare },
    { text: 'Templates IA para mensagens', icon: Sparkles },
    { text: 'CRM Kanban completo', icon: Kanban },
  ];

  const starterFeatures = [
    { text: '100 buscas/mês (≈2.000 leads)', icon: Search, highlight: true },
    { text: 'Campanhas ilimitadas', icon: Infinity, highlight: true },
    { text: 'Leads 100% reais do Google Maps', icon: Check },
    { text: 'Ver telefone, WhatsApp, e-mail, site', icon: Phone },
    { text: 'Export CSV completo', icon: Download },
    { text: 'WhatsApp 1-click para todos leads', icon: MessageSquare },
    { text: 'Templates de mensagem com IA', icon: Sparkles },
    { text: 'CRM Kanban completo', icon: Kanban },
    { text: 'Escolha cidade + nicho exato', icon: Users },
    { text: 'Sem marca d\'água', icon: Check },
    { text: 'Suporte prioritário', icon: Zap },
  ];

  const faqs = [
    {
      question: 'O que são buscas?',
      answer: 'Cada busca traz aproximadamente 20 empresas do seu nicho. Com 100 buscas você pode encontrar até 2 mil clientes por mês.',
    },
    {
      question: 'O plano Free expira?',
      answer: 'Não. Suas 3 buscas são vitalícias, mas quando acabarem você precisa fazer upgrade para continuar prospectando.',
    },
    {
      question: 'Posso cancelar quando quiser?',
      answer: 'Sim. Sem fidelidade, sem multa. Cancele a qualquer momento e você mantém acesso até o final do período pago.',
    },
    {
      question: 'Quais os benefícios do Starter?',
      answer: 'Com o Starter você tem 100 buscas/mês (≈2.000 leads), campanhas ilimitadas, export CSV, WhatsApp 1-click para todos leads, templates de mensagem com IA, CRM Kanban completo, e suporte prioritário.',
    },
    {
      question: 'Quais formas de pagamento?',
      answer: 'PIX com confirmação instantânea. Pagamento 100% seguro via Abacate Pay.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">ProspectAI</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild variant="outline">
                <Link to="/dashboard">Voltar ao Painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">Começar Grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Zap className="w-3 h-3 mr-1" />
            Preços Acessíveis
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Escolha seu plano
          </h1>
          <p className="text-xl text-muted-foreground">
            Comece grátis ou desbloqueie todo o potencial de prospecção
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* FREE Plan */}
          <Card className="relative bg-card border-border">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl text-muted-foreground">FREE</CardTitle>
              <CardDescription>Teste grátis para sempre</CardDescription>
              <div className="py-4">
                <span className="text-5xl font-bold">R$ 0</span>
                <span className="text-muted-foreground">/sempre</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Included features */}
              <div className="space-y-3">
                {freeFeatures.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span className="text-sm">{feature.text}</span>
                  </div>
                ))}
              </div>

              {/* Blocked features */}
              <div className="space-y-3 pt-4 border-t border-border">
                {freeBlockedFeatures.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3 opacity-50">
                    <div className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center">
                      <X className="h-3 w-3 text-destructive" />
                    </div>
                    <span className="text-sm line-through">{feature.text}</span>
                  </div>
                ))}
              </div>

              <Button asChild variant="outline" className="w-full" size="lg">
                <Link to={user ? "/dashboard" : "/auth?plan=free"}>
                  {user ? "Plano Atual" : "Começar Grátis"}
                </Link>
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Powered by ProspectAI
              </p>
            </CardContent>
          </Card>

          {/* STARTER Plan */}
          <Card className="relative bg-card border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 animate-pulse">
                <Crown className="h-3 w-3 mr-1" />
                MAIS POPULAR
              </Badge>
            </div>

            {/* Value badge */}
            <div className="absolute -top-3 right-4">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                Menos de R$1/dia
              </Badge>
            </div>

            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl text-primary font-bold">STARTER</CardTitle>
              <CardDescription>Prospecção profissional completa</CardDescription>
              <div className="py-4">
                <span className="text-5xl font-bold text-primary">R$ 27,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features */}
              <div className="space-y-3">
                {starterFeatures.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-3 w-3 text-green-500" />
                    </div>
                    <span className={`text-sm ${feature.highlight ? 'font-medium text-primary' : ''}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Payment methods */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/30">
                  <span className="font-bold">PIX</span>
                </div>
                <span className="text-xs text-muted-foreground">Pagamento 100% seguro</span>
              </div>

              <Button asChild className="w-full" size="lg">
                <Link to="/checkout">
                  Assinar Agora
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Perguntas Frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}

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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Pricing() {
  const { user } = useAuth();

  const freeFeatures = [
    { text: 'Até 3 buscas vitalícias', icon: Search, included: true, tooltip: 'Aproximadamente 60 clientes no total' },
    { text: 'Até 3 nichos diferentes', icon: Users, included: true },
    { text: '1 campanha', icon: FileText, included: true },
    { text: 'Ver telefone e endereço', icon: Check, included: true },
    { text: 'Copiar dados manualmente', icon: Check, included: true },
  ];

  const freeBlockedFeatures = [
    { text: 'Export CSV', icon: Download },
    { text: 'WhatsApp 1-click', icon: MessageSquare },
    { text: 'CRM Pipeline', icon: BarChart3 },
    { text: 'Templates de mensagem', icon: FileText },
    { text: 'Analytics', icon: BarChart3 },
  ];

  const starterFeatures = [
    { text: '100 buscas por mês', icon: Infinity, highlight: true },
    { text: '~2.000 clientes/mês', icon: Users, highlight: true },
    { text: 'Campanhas ilimitadas', icon: FileText },
    { text: 'Export direto pra CSV', icon: Download },
    { text: 'WhatsApp com 1 clique', icon: MessageSquare },
    { text: 'Templates prontos de mensagem', icon: FileText },
    { text: 'Analytics de conversão', icon: BarChart3 },
    { text: 'Remove marca d\'água', icon: Check },
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
          <h1 className="text-4xl font-bold mb-4">
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
                <span className="text-4xl font-bold">R$ 0</span>
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

            <CardHeader className="text-center pb-2 pt-8">
              <CardTitle className="text-2xl text-primary font-bold">STARTER</CardTitle>
              <CardDescription>Prospecção profissional ilimitada</CardDescription>
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
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                  <span className="font-bold">PIX</span>
                </div>
                <span className="text-xs text-muted-foreground">Pagamento instantâneo</span>
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

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Search, 
  Users, 
  ArrowRight,
  Target,
  MessageSquare 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NeuralNetworkHero from '@/components/ui/neural-network-hero';

const features = [
  {
    icon: Search,
    title: 'Busca com IA',
    description: 'Encontre prospects usando consultas em linguagem natural com IA avançada.',
  },
  {
    icon: Target,
    title: 'Segmentação Precisa',
    description: 'Defina critérios para filtrar e encontrar exatamente os prospects que você precisa.',
  },
  {
    icon: Users,
    title: 'Perfis Completos',
    description: 'Obtenha dados enriquecidos incluindo cargos, empresas e informações de contato.',
  },
  {
    icon: MessageSquare,
    title: 'Alcance com IA',
    description: 'Gere emails e mensagens personalizadas com assistência de IA.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navegação */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">ProspectAI</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/dashboard">
                  Ir para o Painel
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/auth">Entrar</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/auth">
                    Começar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Seção Hero com Neural Network */}
      <NeuralNetworkHero
        title="Descubra prospects"
        titleHighlight="com precisão de IA"
        description="Crie campanhas direcionadas, encontre leads de alta qualidade e gere alcance personalizado—tudo com busca inteligente por IA."
        badgeText="Powered by Studio Mamute"
        badgeLabel="Novo"
        ctaButtons={[
          { text: "Começar Teste Grátis", href: "/auth", primary: true },
          { text: "Ver Preços", href: "/pricing" }
        ]}
        microDetails={["Busca com IA", "Google Maps", "WhatsApp 1-click"]}
      />

      {/* Seção de Funcionalidades */}
      <section className="py-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Tudo que você precisa para descoberta de prospects
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Ferramentas poderosas para encontrar, qualificar e alcançar seus clientes ideais.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group relative rounded-xl border border-border bg-gradient-card p-6 transition-all hover:border-primary/50 hover:shadow-glow"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seção CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-12 text-center">
            <div className="absolute inset-0 bg-gradient-hero opacity-5" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Pronto para encontrar seu próximo cliente?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Junte-se a milhares de equipes de vendas usando ProspectAI para acelerar seu pipeline.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              >
                <Link to="/auth">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProspectAI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

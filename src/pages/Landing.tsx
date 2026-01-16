import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Search, 
  Users, 
  Mail, 
  ArrowRight, 
  Zap,
  Target,
  MessageSquare 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  {
    icon: Search,
    title: 'AI-Powered Search',
    description: 'Find prospects using natural language queries powered by advanced AI.',
  },
  {
    icon: Target,
    title: 'Precision Targeting',
    description: 'Define criteria to filter and find exactly the prospects you need.',
  },
  {
    icon: Users,
    title: 'Rich Profiles',
    description: 'Get enriched data including positions, companies, and contact info.',
  },
  {
    icon: MessageSquare,
    title: 'AI Outreach',
    description: 'Generate personalized emails and messages with AI assistance.',
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/auth">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-hero opacity-20 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4 text-accent" />
              <span>Powered by Exa AI</span>
            </div>
            
            <h1 className="animate-fade-up text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
              Discover prospects
              <span className="block gradient-text">with AI precision</span>
            </h1>
            
            <p className="mt-6 animate-fade-up text-lg text-muted-foreground" style={{ animationDelay: '0.1s' }}>
              Build targeted campaigns, find high-quality leads, and generate 
              personalized outreach—all powered by intelligent AI search.
            </p>
            
            <div className="mt-10 flex animate-fade-up justify-center gap-4" style={{ animationDelay: '0.2s' }}>
              <Button 
                asChild 
                size="lg" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              >
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-border text-foreground hover:bg-secondary">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Hero Image / Preview */}
          <div className="mt-20 animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-xl border border-border bg-gradient-card shadow-strong">
                <div className="flex h-10 items-center gap-2 border-b border-border px-4">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
                  <div className="h-3 w-3 rounded-full bg-green-500/50" />
                </div>
                <div className="p-8">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="h-8 w-48 rounded-lg bg-secondary" />
                      <div className="h-4 w-full rounded bg-secondary/50" />
                      <div className="h-4 w-3/4 rounded bg-secondary/50" />
                    </div>
                    <div className="w-64 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg border border-border bg-card p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/20" />
                            <div className="flex-1 space-y-2">
                              <div className="h-3 w-24 rounded bg-secondary" />
                              <div className="h-2 w-16 rounded bg-secondary/50" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-hero opacity-20 blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-t border-border">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything you need for prospect discovery
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful tools to find, qualify, and reach your ideal customers.
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

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-12 text-center">
            <div className="absolute inset-0 bg-gradient-hero opacity-5" />
            <div className="relative">
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Ready to find your next customer?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of sales teams using ProspectAI to accelerate their pipeline.
              </p>
              <Button 
                asChild 
                size="lg" 
                className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow"
              >
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ProspectAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

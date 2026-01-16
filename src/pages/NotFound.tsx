import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="space-y-6">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">Página Não Encontrada</h2>
        <p className="max-w-md text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline" 
            asChild
            className="border-border text-foreground hover:bg-secondary"
          >
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Painel
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

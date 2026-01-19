import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type VerificationState = 'loading' | 'input_password' | 'success' | 'error';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>('loading');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Link de verificação inválido.');
      return;
    }
    
    // Show password input form
    setState('input_password');
  }, [token]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token, password },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setEmail(data.email);
      setState('success');
      toast.success('Email verificado! Fazendo login...');

      // Auto-login after successful verification
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: password,
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        toast.info('Conta criada! Faça login para continuar.');
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      setState('error');
      setErrorMessage(error.message || 'Erro ao verificar email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link 
          to="/auth" 
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">ProspectAI</span>
          </div>

          {state === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Verificando seu email...</p>
            </div>
          )}

          {state === 'input_password' && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Confirme sua senha
                </h1>
                <p className="text-muted-foreground">
                  Digite sua senha para finalizar a verificação do email
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-input border-border"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Email'
                  )}
                </Button>
              </form>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Email Verificado!
              </h1>
              <p className="text-muted-foreground mb-4">
                Sua conta foi criada com sucesso. Redirecionando...
              </p>
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Erro na Verificação
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="w-full"
                >
                  Tentar Novamente
                </Button>
                <p className="text-sm text-muted-foreground">
                  Precisa de ajuda?{' '}
                  <a href="mailto:suporte@prospectai.com" className="text-primary hover:underline">
                    Contate o suporte
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
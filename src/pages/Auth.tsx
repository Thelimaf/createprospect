import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sparkles, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const authSchema = z.object({
  email: z.string().email('Por favor, insira um email válido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPendingVerification, setIsPendingVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      toast.error('Erro ao fazer login com Google');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira seu email');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) throw error;

      toast.success('Se o email existir, você receberá um link de recuperação.');
      setIsForgotPassword(false);
      setEmail('');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error('Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({ email, password });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Email ou senha inválidos');
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }
        toast.success('Bem-vindo de volta!');
      } else {
        // Send verification email instead of direct signup
        const { data, error } = await supabase.functions.invoke('send-email-verification', {
          body: { email, password, fullName },
        });

        if (error) {
          console.error('Error sending verification:', error);
          toast.error('Erro ao enviar email de verificação. Tente novamente.');
          setLoading(false);
          return;
        }

        if (data?.error) {
          toast.error(data.error);
          setLoading(false);
          return;
        }

        // Show pending verification UI
        setIsPendingVerification(true);
        setResendCooldown(60);
        setLoading(false);
        toast.success('Email de verificação enviado!');
      }
    } catch (error) {
      toast.error('Ocorreu um erro inesperado');
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email-verification', {
        body: { email, password, fullName },
      });

      if (error) throw error;

      setResendCooldown(60);
      toast.success('Email reenviado!');
    } catch (error) {
      toast.error('Erro ao reenviar email');
    } finally {
      setLoading(false);
    }
  };

  const handleUseAnotherEmail = () => {
    setIsPendingVerification(false);
    setEmail('');
    setPassword('');
  };

  return (
    <div className="flex min-h-screen">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Lado esquerdo - Formulário */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link 
            to="/" 
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para início
          </Link>

          <div className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">ProspectAI</span>
          </div>

{isPendingVerification ? (
            // Pending Verification Mode
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              
              <h1 className="text-3xl font-bold text-foreground mb-3">
                Verifique seu email
              </h1>
              
              <p className="text-muted-foreground mb-2">
                Enviamos um link de verificação para:
              </p>
              <p className="font-medium text-foreground mb-6">
                {email}
              </p>
              
              <p className="text-sm text-muted-foreground mb-8">
                Clique no link do email para ativar sua conta. O link expira em 1 hora.
              </p>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleResendVerification}
                  disabled={loading || resendCooldown > 0}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 
                    ? `Reenviar em ${resendCooldown}s` 
                    : 'Reenviar email'}
                </Button>
                
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                  onClick={handleUseAnotherEmail}
                >
                  Usar outro email
                </button>
              </div>
            </div>
          ) : isForgotPassword ? (
            // Forgot Password Mode
            <>
              <h1 className="text-3xl font-bold text-foreground">
                Recuperar Senha
              </h1>
              <p className="mt-2 text-muted-foreground">
                Digite seu email para receber o link de recuperação
              </p>

              <form onSubmit={handleForgotPassword} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmail('');
                  }}
                >
                  ← Voltar ao login
                </button>
              </p>
            </>
          ) : (
            // Login/Signup Mode
            <>
              <h1 className="text-3xl font-bold text-foreground">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isLogin 
                  ? 'Entre para continuar ao seu painel' 
                  : 'Comece a descobrir prospects com IA'}
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-8 w-full gap-3 bg-white text-gray-700 border-border hover:bg-gray-50"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                Continuar com Google
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-foreground">Nome Completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="João Silva"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="voce@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-foreground">Senha</Label>
                    {isLogin && (
                      <button
                        type="button"
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setIsForgotPassword(true)}
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : isLogin ? (
                    'Entrar'
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {isLogin ? "Não tem uma conta? " : 'Já tem uma conta? '}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {isLogin ? 'Cadastre-se' : 'Entrar'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Lado direito - Gradiente */}
      <div className="relative hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <h2 className="text-4xl font-bold text-white">
              Encontre seus clientes ideais mais rápido
            </h2>
            <p className="mt-4 text-lg text-white/80">
              Descoberta de prospects com IA que ajuda você a criar campanhas 
              direcionadas e gerar alcance personalizado em escala.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

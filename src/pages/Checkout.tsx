import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowLeft, Shield, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PixPayment } from '@/components/billing/PixPayment';
import { Link } from 'react-router-dom';

// CPF mask and validation
const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const validateCPF = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixData, setPixData] = useState<{
    charge_id: string;
    payment_url: string;
    expires_at: string;
    amount: number;
  } | null>(null);

  // Pre-fill email from user
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.user_metadata?.full_name) {
      setName(user.user_metadata.full_name);
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/checkout');
    }
  }, [user, navigate]);

  const handleGeneratePix = async () => {
    // Validate fields
    if (!name.trim()) {
      toast.error('Digite seu nome completo');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Digite um email válido');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Digite um telefone válido');
      return;
    }
    if (!validateCPF(cpf)) {
      toast.error('CPF inválido');
      return;
    }

    setIsGenerating(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Você precisa estar logado');
        navigate('/auth?redirect=/checkout');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          customer_name: name,
          customer_email: email,
          customer_phone: phone.replace(/\D/g, ''),
          customer_cpf: cpf.replace(/\D/g, ''),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setPixData(data);
    } catch (err: any) {
      console.error('Error generating PIX:', err);
      toast.error(err.message || 'Erro ao gerar PIX. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">ProspectAI</span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link to="/pricing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Assinar Plano Starter</h1>
            <p className="text-muted-foreground">R$ 27,90/mês • Pagamento via PIX</p>
          </div>

          {pixData ? (
            <PixPayment
              chargeId={pixData.charge_id}
              paymentUrl={pixData.payment_url}
              expiresAt={pixData.expires_at}
              amount={pixData.amount}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seus dados</CardTitle>
                <CardDescription>
                  Preencha seus dados para gerar o PIX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                  />
                </div>

                <Button 
                  onClick={handleGeneratePix} 
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando PIX...
                    </>
                  ) : (
                    'Gerar PIX'
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
                  <Shield className="h-4 w-4" />
                  <span>Pagamento 100% seguro via Abacate Pay</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

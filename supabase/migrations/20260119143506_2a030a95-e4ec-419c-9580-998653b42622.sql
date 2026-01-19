-- Criar função auxiliar para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email') = 'anderson.ferlimajunior@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Política para admin ver todos os pagamentos PIX
CREATE POLICY "Admin can view all payments" 
ON public.pix_payments 
FOR SELECT 
USING (is_admin());
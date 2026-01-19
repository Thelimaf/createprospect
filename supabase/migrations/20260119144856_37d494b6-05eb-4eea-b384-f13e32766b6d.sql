-- 1. Policy para admin ver todos os leads
CREATE POLICY "Admin can view all leads" 
ON google_maps_leads FOR SELECT 
USING (is_admin() OR auth.uid() = user_id);

-- 2. Policy para admin ver todas as campanhas
CREATE POLICY "Admin can view all campaigns" 
ON campaigns FOR SELECT 
USING (is_admin() OR auth.uid() = user_id);

-- 3. Policy para admin ver todas as buscas
CREATE POLICY "Admin can view all searches" 
ON google_maps_searches FOR SELECT 
USING (is_admin() OR auth.uid() = user_id);

-- 4. RLS para password_reset_tokens - negar acesso público (só service role pode acessar)
CREATE POLICY "No public access to password reset tokens"
ON password_reset_tokens FOR ALL
USING (false);

-- 5. Policies adicionais de admin para outras tabelas importantes

-- Admin pode ver todos os pagamentos PIX
CREATE POLICY "Admin can view all pix payments"
ON pix_payments FOR SELECT
USING (is_admin() OR auth.uid() = user_id);

-- Admin pode ver todas as assinaturas
CREATE POLICY "Admin can view all subscriptions"
ON user_subscriptions FOR SELECT
USING (is_admin() OR auth.uid() = user_id);

-- Admin pode ver todos os profiles
CREATE POLICY "Admin can view all profiles"
ON profiles FOR SELECT
USING (is_admin() OR auth.uid() = id);

-- Admin pode ver todo o uso
CREATE POLICY "Admin can view all usage"
ON user_usage FOR SELECT
USING (is_admin() OR auth.uid() = user_id);
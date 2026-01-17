-- Remover o trigger duplicado que causa o conflito de chave duplicada
DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;

-- Remover a função não utilizada
DROP FUNCTION IF EXISTS public.handle_new_user_billing();
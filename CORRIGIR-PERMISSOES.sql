-- Script para CORRIGIR permissões do Supabase
-- Execute este script se estiver tendo problemas de login (HTTP 400)

-- 1. DESABILITAR RLS em TODAS as tabelas
ALTER TABLE profissionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais_login DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_financeiros DISABLE ROW LEVEL SECURITY;

-- 2. DELETAR todas as políticas existentes
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON ' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable insert access for all users" ON ' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable update access for all users" ON ' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable delete access for all users" ON ' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- 3. GARANTIR que a tabela profissionais tem a coluna id_agenda (opcional)
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS id_agenda TEXT;

-- 4. VERIFICAR se os dados estão corretos
SELECT 'Profissionais cadastrados:' as info;
SELECT id, nome, email, telefone, ativo FROM profissionais;

SELECT 'Logins cadastrados:' as info;
SELECT id, profissional_id, email, senha, ativo FROM profissionais_login;

-- 5. Se quiser, pode criar uma política permissiva (mas não é necessário com RLS desabilitado)
-- Descomente as linhas abaixo APENAS se quiser reativar RLS depois

-- ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON profissionais FOR ALL USING (true) WITH CHECK (true);

-- ALTER TABLE profissionais_login ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON profissionais_login FOR ALL USING (true) WITH CHECK (true);

-- ✅ PRONTO!
-- Agora tente fazer login novamente

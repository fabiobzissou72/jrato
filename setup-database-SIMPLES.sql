-- Setup SIMPLIFICADO do banco de dados para JRato Barber Shop Portugal
-- Execute este script no SQL Editor do Supabase

-- IMPORTANTE: Primeiro, desabilitar RLS (Row Level Security) se estiver ativado
ALTER TABLE IF EXISTS profissionais DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profissionais_login DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS agendamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movimentos_financeiros DISABLE ROW LEVEL SECURITY;

-- Deletar políticas existentes (se houver)
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON profissionais;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON profissionais_login;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON servicos;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON agendamentos;
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON movimentos_financeiros;

-- Deletar tabelas existentes (para começar do zero)
DROP TABLE IF EXISTS movimentos_financeiros CASCADE;
DROP TABLE IF EXISTS agendamentos CASCADE;
DROP TABLE IF EXISTS profissionais_login CASCADE;
DROP TABLE IF EXISTS servicos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS profissionais CASCADE;

-- 1. Criar tabela de profissionais
CREATE TABLE profissionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  especialidades TEXT[],
  ativo BOOLEAN DEFAULT true,
  data_cadastro TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de login dos profissionais
CREATE TABLE profissionais_login (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID REFERENCES profissionais(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de serviços
CREATE TABLE servicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  categoria TEXT,
  executor TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de clientes
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  data_nascimento DATE,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Criar tabela de agendamentos
CREATE TABLE agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id),
  profissional_id UUID REFERENCES profissionais(id),
  servico_id UUID REFERENCES servicos(id),
  data_agendamento DATE NOT NULL,
  horario TIME NOT NULL,
  valor NUMERIC(10,2),
  status TEXT DEFAULT 'agendado',
  observacoes TEXT,
  compareceu BOOLEAN DEFAULT false,
  data_criacao TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Criar tabela de movimentos financeiros
CREATE TABLE movimentos_financeiros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT,
  valor NUMERIC(10,2) NOT NULL,
  data_movimento DATE NOT NULL,
  agendamento_id UUID REFERENCES agendamentos(id),
  profissional_id UUID REFERENCES profissionais(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Inserir os 2 barbeiros (JRato e Nuno)
INSERT INTO profissionais (nome, email, telefone, especialidades, ativo) VALUES
('JRato', 'jrato@barbearia.pt', '+351 912 345 678', ARRAY['Barbeiro', 'Corte', 'Barba'], true),
('Nuno', 'nuno@barbearia.pt', '+351 913 456 789', ARRAY['Barbeiro', 'Corte', 'Barba'], true);

-- 8. Inserir logins para os barbeiros (senha padrão: 123456)
INSERT INTO profissionais_login (profissional_id, email, senha, ativo)
SELECT id, email, '123456', true FROM profissionais WHERE nome IN ('JRato', 'Nuno');

-- 9. Inserir os 2 serviços (Corte 12€, Barba 8€)
INSERT INTO servicos (nome, descricao, preco, duracao_minutos, categoria, executor, ativo) VALUES
('Corte', 'Corte de cabelo masculino', 12.00, 30, 'Cabelo', 'Barbeiro', true),
('Barba', 'Barba completa', 8.00, 20, 'Barba', 'Barbeiro', true);

-- 10. Criar índices para melhor performance
CREATE INDEX idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX idx_agendamentos_profissional ON agendamentos(profissional_id);
CREATE INDEX idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX idx_movimentos_data ON movimentos_financeiros(data_movimento);
CREATE INDEX idx_movimentos_profissional ON movimentos_financeiros(profissional_id);

-- ✅ PRONTO!
-- Tabelas criadas SEM políticas de segurança (RLS desabilitado)
-- Agora você pode fazer login com:
-- Email: jrato@barbearia.pt | Senha: 123456
-- Email: nuno@barbearia.pt | Senha: 123456

-- Setup completo do banco de dados para Barbearia Portugal
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de profissionais
CREATE TABLE IF NOT EXISTS profissionais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  especialidades TEXT[],
  ativo BOOLEAN DEFAULT true,
  data_cadastro TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de login dos profissionais
CREATE TABLE IF NOT EXISTS profissionais_login (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profissional_id UUID REFERENCES profissionais(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de serviços
CREATE TABLE IF NOT EXISTS servicos (
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
CREATE TABLE IF NOT EXISTS clientes (
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
CREATE TABLE IF NOT EXISTS agendamentos (
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
CREATE TABLE IF NOT EXISTS movimentos_financeiros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'entrada' ou 'saida'
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

-- 10. Habilitar RLS (Row Level Security) - OPCIONAL
ALTER TABLE profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissionais_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentos_financeiros ENABLE ROW LEVEL SECURITY;

-- 11. Criar políticas básicas (permitir tudo autenticado) - OPCIONAL
CREATE POLICY "Permitir tudo para usuários autenticados" ON profissionais FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON profissionais_login FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON servicos FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON clientes FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON agendamentos FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON movimentos_financeiros FOR ALL USING (true);

-- 12. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON agendamentos(data_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamentos_profissional ON agendamentos(profissional_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_movimentos_data ON movimentos_financeiros(data_movimento);
CREATE INDEX IF NOT EXISTS idx_movimentos_profissional ON movimentos_financeiros(profissional_id);

-- Pronto! Seu banco de dados está configurado com:
-- ✅ 2 barbeiros: JRato e Nuno
-- ✅ 2 serviços: Corte (12€) e Barba (8€)
-- ✅ Todas as tabelas necessárias
-- ✅ Logins configurados (senha padrão: 123456)

-- Adicionar tabelas que estão faltando no banco
-- Execute este script no SQL Editor do Supabase

-- 1. Criar tabela de configurações
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_barbearia TEXT DEFAULT 'JRato Barber Shop',
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  horario_abertura TEXT DEFAULT '09:00',
  horario_fechamento TEXT DEFAULT '19:00',
  dias_funcionamento TEXT[],
  horarios_por_dia JSONB,
  tempo_padrao_servico INTEGER DEFAULT 30,
  valor_minimo_agendamento NUMERIC(10,2) DEFAULT 0,
  notificacoes_whatsapp BOOLEAN DEFAULT true,
  notificacoes_email BOOLEAN DEFAULT false,
  aceita_agendamento_online BOOLEAN DEFAULT true,
  comissao_barbeiro_percentual NUMERIC(5,2) DEFAULT 50,
  webhook_url TEXT,
  prazo_cancelamento_horas INTEGER DEFAULT 2,
  notif_confirmacao BOOLEAN DEFAULT true,
  notif_lembrete_24h BOOLEAN DEFAULT true,
  notif_lembrete_2h BOOLEAN DEFAULT true,
  notif_followup_3d BOOLEAN DEFAULT false,
  notif_followup_21d BOOLEAN DEFAULT false,
  notif_cancelamento BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de planos (se não existir)
CREATE TABLE IF NOT EXISTS planos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_total NUMERIC(10,2) NOT NULL,
  valor_original NUMERIC(10,2),
  quantidade_servicos INTEGER NOT NULL,
  validade_dias INTEGER DEFAULT 30,
  servicos_incluidos TEXT[],
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Criar tabela de produtos (se não existir)
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  estoque INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 5,
  categoria TEXT,
  marca TEXT,
  codigo_barras TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de vendas (se não existir)
CREATE TABLE IF NOT EXISTS vendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id),
  profissional_id UUID REFERENCES profissionais(id),
  cliente_id UUID REFERENCES clientes(id),
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  data_venda TIMESTAMPTZ DEFAULT NOW(),
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inserir configuração padrão
INSERT INTO configuracoes (
  nome_barbearia,
  dias_funcionamento,
  horarios_por_dia
) VALUES (
  'JRato Barber Shop',
  ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  '{
    "Segunda": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Terça": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quarta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Quinta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sexta": {"abertura": "09:00", "fechamento": "19:00", "ativo": true},
    "Sábado": {"abertura": "09:00", "fechamento": "18:00", "ativo": true},
    "Domingo": {"abertura": "09:00", "fechamento": "18:00", "ativo": false}
  }'::jsonb
)
ON CONFLICT DO NOTHING;

-- ✅ PRONTO!
-- Tabelas criadas:
-- - configuracoes (salvar nome da barbearia, horários, etc.)
-- - planos (planos de assinatura)
-- - produtos (produtos para venda)
-- - vendas (registro de vendas de produtos)
--
-- Agora todas as páginas devem funcionar sem erros!

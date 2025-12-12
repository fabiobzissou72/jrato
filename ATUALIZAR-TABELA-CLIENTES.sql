-- Atualizar tabela de clientes com todas as colunas necessárias
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar colunas que estão faltando na tabela clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS profissao TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado_civil TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tem_filhos TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nomes_filhos TEXT[];
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS idades_filhos TEXT[];
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estilo_cabelo TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS preferencias_corte TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_bebida TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS alergias TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS frequencia_retorno TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS profissional_preferido TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS como_soube TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS gosta_conversar TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS menory_long TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tratamento TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultimo_servico TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS plano_id UUID REFERENCES planos(id);

-- ✅ PRONTO!
-- Execute este script no Supabase e depois teste adicionar clientes novamente.

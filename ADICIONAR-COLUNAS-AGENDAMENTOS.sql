-- Adicionar colunas que estão faltando na tabela agendamentos
-- Execute este script no SQL Editor do Supabase

-- Adicionar coluna hora_inicio (se não existir)
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS hora_inicio TIME;

-- Adicionar coluna nome_cliente (se não existir)
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome_cliente TEXT;

-- Adicionar coluna telefone (se não existir)
ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone TEXT;

-- ✅ PRONTO!
-- Agora a tabela agendamentos tem todas as colunas necessárias

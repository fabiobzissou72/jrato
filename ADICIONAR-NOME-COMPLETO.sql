-- Adicionar coluna nome_completo e copiar valores de nome
-- Execute este script no SQL Editor do Supabase

-- 1. Adicionar coluna nome_completo
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_completo TEXT;

-- 2. Copiar valores de nome para nome_completo
UPDATE clientes SET nome_completo = nome WHERE nome_completo IS NULL;

-- 3. Tornar nome_completo NOT NULL
ALTER TABLE clientes ALTER COLUMN nome_completo SET NOT NULL;

-- ✅ PRONTO!
-- Agora a tabela clientes tem tanto 'nome' quanto 'nome_completo'

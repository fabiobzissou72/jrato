-- Corrigir nome da coluna de hora na tabela agendamentos
-- Execute este script no SQL Editor do Supabase

-- Opção 1: Renomear a coluna 'horario' para 'hora_inicio' (se existir)
ALTER TABLE agendamentos RENAME COLUMN horario TO hora_inicio;

-- ✅ PRONTO!
-- A coluna agora se chama 'hora_inicio' em vez de 'horario'

# JRATO BARBER SHOP - API N8N Integration

Documentação completa da API para integração com N8N (WhatsApp Bot).

**Base URL:** `https://seu-dominio.vercel.app/api`

---

## 📋 Índice

1. [Listar Barbeiros](#1-listar-barbeiros)
2. [Buscar Horários Disponíveis](#2-buscar-horários-disponíveis)
3. [Buscar Barbeiro do Rodízio](#3-buscar-barbeiro-do-rodízio)
4. [Criar Agendamento](#4-criar-agendamento)
5. [Cancelar Agendamento](#5-cancelar-agendamento)
6. [Webhooks (Notificações)](#6-webhooks-notificações)

---

## 1. Listar Barbeiros

**Endpoint:** `GET /api/barbeiros/listar`

**Descrição:** Retorna a lista de todos os barbeiros ativos do sistema.

### Query Parameters:
- `ativo` (opcional): `true` ou `false` (padrão: `true`)

### Exemplo de Request (N8N):

```
Method: GET
URL: https://seu-dominio.vercel.app/api/barbeiros/listar
```

### Exemplo de Response:

```json
{
  "total": 2,
  "proximo_rodizio": {
    "id": "baec1335-3c51-408f-a4e1-ee61c282e20a",
    "nome": "JRato",
    "atendimentos_hoje": 2
  },
  "barbeiros": [
    {
      "id": "baec1335-3c51-408f-a4e1-ee61c282e20a",
      "nome": "JRato",
      "telefone": "+351912345678",
      "email": "jrato@barbershop.pt",
      "especialidade": "Cortes modernos",
      "ativo": true,
      "estatisticas": {
        "total_atendimentos": 150,
        "atendimentos_hoje": 2,
        "total_concluidos": 140
      }
    },
    {
      "id": "8a7f5d42-9c3e-4b1a-8f6d-2e3c4a5b6c7d",
      "nome": "Nuno",
      "telefone": "+351923456789",
      "email": "nuno@barbershop.pt",
      "especialidade": "Barba e design",
      "ativo": true,
      "estatisticas": {
        "total_atendimentos": 98,
        "atendimentos_hoje": 3,
        "total_concluidos": 92
      }
    }
  ],
  "mensagem_para_cliente": "Temos 2 barbeiro(s) disponível(is). Escolha seu preferido ou deixe em branco para rodízio automático."
}
```

### Uso no N8N:
1. Adicione um nó **HTTP Request**
2. Configure: Method = GET, URL = `/api/barbeiros/listar`
3. Use `{{ $json.barbeiros }}` para acessar a lista de barbeiros

---

## 2. Buscar Horários Disponíveis

**Endpoint:** `GET /api/agendamentos/horarios-disponiveis`

**Descrição:** Retorna todos os horários disponíveis para um dia específico.

### Query Parameters:
- `data` (obrigatório): Data no formato `YYYY-MM-DD` (ex: `2025-12-20`)
- `barbeiro` (opcional): Nome do barbeiro específico (ex: `JRato`)
- `servico_ids` (opcional): IDs dos serviços separados por vírgula (ex: `uuid1,uuid2`)

### Exemplo de Request (N8N):

```
Method: GET
URL: https://seu-dominio.vercel.app/api/agendamentos/horarios-disponiveis?data=2025-12-20&barbeiro=JRato
```

### Exemplo de Response:

```json
{
  "success": true,
  "message": "8 horários disponíveis encontrados",
  "data": {
    "data": "2025-12-20",
    "dia_semana": "Sexta",
    "horario_abertura": "09:00",
    "horario_fechamento": "19:00",
    "duracao_estimada": 30,
    "barbeiros_disponiveis": 1,
    "barbeiros": [
      {
        "id": "baec1335-3c51-408f-a4e1-ee61c282e20a",
        "nome": "JRato"
      }
    ],
    "horarios": [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30"
    ],
    "horarios_ocupados": [
      {
        "horario": "11:00",
        "motivo": "Todos os barbeiros ocupados"
      }
    ],
    "total_disponiveis": 8,
    "total_ocupados": 12
  }
}
```

### Uso no N8N:
1. Adicione um nó **HTTP Request**
2. Configure: Method = GET
3. URL = `/api/agendamentos/horarios-disponiveis?data={{ $json.data }}`
4. Use `{{ $json.data.horarios }}` para obter a lista de horários disponíveis

---

## 3. Buscar Barbeiro do Rodízio

**Endpoint:** `GET /api/agendamentos/buscar-barbeiro-rodizio`

**Descrição:** Retorna o próximo barbeiro disponível no sistema de rodízio (baseado em menos atendimentos do dia).

### Query Parameters:
- `data` (obrigatório): Data no formato `YYYY-MM-DD`
- `hora` (obrigatório): Hora no formato `HH:MM` (ex: `14:30`)
- `duracao` (opcional): Duração em minutos (padrão: `30`)

### Exemplo de Request (N8N):

```
Method: GET
URL: https://seu-dominio.vercel.app/api/agendamentos/buscar-barbeiro-rodizio?data=2025-12-20&hora=14:30&duracao=30
```

### Exemplo de Response (Sucesso):

```json
{
  "success": true,
  "data": {
    "barbeiro_id": "baec1335-3c51-408f-a4e1-ee61c282e20a",
    "barbeiro_nome": "JRato",
    "total_atendimentos_hoje": 2,
    "disponivel": true
  }
}
```

### Exemplo de Response (Nenhum disponível):

```json
{
  "success": false,
  "message": "Todos os barbeiros estão ocupados neste horário",
  "data": {
    "barbeiros_verificados": 2,
    "sugestao": "Tente outro horário"
  }
}
```

---

## 4. Criar Agendamento

**Endpoint:** `POST /api/agendamentos/criar`

**Descrição:** Cria um novo agendamento com sistema de rodízio automático.

### Request Body:

```json
{
  "cliente_nome": "João Silva",
  "telefone": "351912345678",
  "data": "2025-12-20",
  "hora": "14:30",
  "servico_ids": [
    "uuid-do-servico-corte",
    "uuid-do-servico-barba"
  ],
  "barbeiro_preferido": "JRato",
  "observacoes": "Cliente prefere barba curta",
  "cliente_id": "uuid-do-cliente-opcional"
}
```

### Campos:
- `cliente_nome` (obrigatório): Nome completo do cliente
- `telefone` (obrigatório): Telefone com DDD (apenas números)
- `data` (obrigatório): Data no formato `YYYY-MM-DD`
- `hora` (obrigatório): Hora no formato `HH:MM`
- `servico_ids` (obrigatório): Array de UUIDs dos serviços
- `barbeiro_preferido` (opcional): Nome ou UUID do barbeiro
- `observacoes` (opcional): Observações adicionais
- `cliente_id` (opcional): UUID do cliente existente

### Exemplo de Request (N8N):

```
Method: POST
URL: https://seu-dominio.vercel.app/api/agendamentos/criar
Content-Type: application/json

Body:
{
  "cliente_nome": "{{ $json.nome }}",
  "telefone": "{{ $json.telefone }}",
  "data": "{{ $json.data }}",
  "hora": "{{ $json.hora }}",
  "servico_ids": {{ $json.servico_ids }},
  "barbeiro_preferido": "{{ $json.barbeiro }}"
}
```

### Exemplo de Response (Sucesso):

```json
{
  "success": true,
  "message": "Agendamento criado com sucesso!",
  "data": {
    "agendamento_id": "f3e5d7c9-8b4a-4e2f-9c1d-6a7b8c9d0e1f",
    "barbeiro_atribuido": "JRato",
    "data": "2025-12-20",
    "horario": "14:30",
    "valor_total": 20,
    "duracao_total": 60,
    "servicos": [
      {
        "nome": "Corte de Cabelo",
        "preco": 12
      },
      {
        "nome": "Barba",
        "preco": 8
      }
    ],
    "status": "agendado"
  }
}
```

### Exemplo de Response (Conflito de Horário):

```json
{
  "success": false,
  "message": "Horário 14:30 já está ocupado para JRato",
  "errors": ["Conflito de horário"],
  "data": {
    "barbeiro": "JRato",
    "horario_solicitado": "14:30",
    "sugestoes": [
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30"
    ]
  }
}
```

### Rodízio Automático:
- Se `barbeiro_preferido` **NÃO** for informado, o sistema escolhe automaticamente o barbeiro com **menos atendimentos do dia**
- Se `barbeiro_preferido` **for informado**, o sistema tenta agendar com ele (se disponível)

---

## 5. Cancelar Agendamento

**Endpoint:** `DELETE /api/agendamentos/cancelar`

**Descrição:** Cancela um agendamento com validação de prazo (2h antes por padrão).

### Request Body:

```json
{
  "agendamento_id": "f3e5d7c9-8b4a-4e2f-9c1d-6a7b8c9d0e1f",
  "motivo": "Cliente solicitou cancelamento",
  "cancelado_por": "cliente",
  "forcar": false
}
```

### Campos:
- `agendamento_id` (obrigatório): UUID do agendamento
- `motivo` (opcional): Motivo do cancelamento
- `cancelado_por` (opcional): `cliente`, `barbeiro`, `admin`, `sistema` (padrão: `cliente`)
- `forcar` (opcional): `true` para ignorar prazo (apenas admin) (padrão: `false`)

### Regras:
- **Cliente**: Pode cancelar até 2h antes
- **Admin/Barbeiro**: Podem cancelar a qualquer momento
- **Sistema**: Registra o cancelamento no histórico

### Exemplo de Request (N8N):

```
Method: DELETE
URL: https://seu-dominio.vercel.app/api/agendamentos/cancelar
Content-Type: application/json

Body:
{
  "agendamento_id": "{{ $json.agendamento_id }}",
  "motivo": "Cliente cancelou via WhatsApp",
  "cancelado_por": "cliente"
}
```

### Exemplo de Response (Sucesso):

```json
{
  "success": true,
  "message": "Agendamento cancelado com sucesso!",
  "data": {
    "agendamento_id": "f3e5d7c9-8b4a-4e2f-9c1d-6a7b8c9d0e1f",
    "status": "cancelado",
    "cancelado_por": "cliente",
    "motivo": "Cliente solicitou cancelamento",
    "horas_antecedencia": "5.3",
    "cliente": "João Silva",
    "barbeiro": "JRato",
    "data": "2025-12-20",
    "hora": "14:30",
    "valor_liberado": 20
  }
}
```

### Exemplo de Response (Erro - Prazo):

```json
{
  "success": false,
  "message": "Cancelamento não permitido. É necessário cancelar com pelo menos 2h de antecedência",
  "errors": ["Faltam apenas 1.2h para o agendamento"],
  "data": {
    "prazo_minimo": 2,
    "horas_restantes": 1.2,
    "data_agendamento": "2025-12-20",
    "hora_agendamento": "14:30"
  }
}
```

---

## 6. Webhooks (Notificações)

O sistema pode enviar notificações automáticas para o N8N via webhook quando:
- ✅ **Agendamento criado** (`tipo: "confirmacao"`)
- ❌ **Agendamento cancelado** (`tipo: "cancelado"`)
- 🔔 **Lembrete 24h antes** (`tipo: "lembrete_24h"`)
- 🔔 **Lembrete 2h antes** (`tipo: "lembrete_2h"`)

### Configurar Webhook no Dashboard:

1. Acesse **Configurações** no dashboard
2. Adicione a URL do seu Webhook do N8N:
   ```
   https://seu-n8n.com/webhook/jrato-notificacoes
   ```
3. Ative as notificações desejadas

### Payload do Webhook (Confirmação):

```json
{
  "tipo": "confirmacao",
  "agendamento_id": "f3e5d7c9-8b4a-4e2f-9c1d-6a7b8c9d0e1f",
  "cliente": {
    "nome": "João Silva",
    "telefone": "351912345678"
  },
  "agendamento": {
    "data": "2025-12-20",
    "hora": "14:30",
    "barbeiro": "JRato",
    "servicos": ["Corte de Cabelo", "Barba"],
    "valor_total": 20,
    "duracao_total": 60
  }
}
```

### Payload do Webhook (Cancelamento):

```json
{
  "tipo": "cancelado",
  "agendamento_id": "f3e5d7c9-8b4a-4e2f-9c1d-6a7b8c9d0e1f",
  "cliente": {
    "nome": "João Silva",
    "telefone": "351912345678"
  },
  "agendamento": {
    "data": "2025-12-20",
    "hora": "14:30",
    "barbeiro": "JRato",
    "valor_total": 20
  },
  "cancelamento": {
    "cancelado_por": "cliente",
    "motivo": "Cliente solicitou cancelamento",
    "horas_antecedencia": "5.3"
  }
}
```

---

## 🔐 Autenticação

Todas as rotas da API são **públicas** e não requerem autenticação (ideal para integração com N8N).

**Segurança:**
- Valide sempre os dados recebidos
- Use HTTPS em produção
- Configure CORS se necessário
- Implemente rate limiting no N8N

---

## 🌍 Formato de Dados

### Datas:
- **Formato do banco:** `YYYY-MM-DD` (ex: `2025-12-20`)
- **Exibição:** `DD/MM/YYYY` (ex: `20/12/2025`)

### Horários:
- **Formato:** `HH:MM` (ex: `14:30`)
- **Intervalos:** 30 minutos

### Telefone:
- **Armazenamento:** Apenas números (ex: `351912345678`)
- **Exibição:** Com formatação (ex: `+351 91 234 5678`)

### Moeda:
- **Moeda:** EUR (Euro)
- **Formato:** `12,00 €` (locale: `pt-PT`)

---

## 📊 Códigos de Status HTTP

- `200 OK` - Sucesso
- `201 Created` - Recurso criado com sucesso
- `400 Bad Request` - Dados inválidos
- `404 Not Found` - Recurso não encontrado
- `409 Conflict` - Conflito (ex: horário ocupado)
- `500 Internal Server Error` - Erro interno

---

## 🛠️ Exemplo Completo de Fluxo N8N

### Fluxo: Cliente agenda via WhatsApp

1. **Webhook Trigger** (recebe mensagem do WhatsApp)
2. **HTTP Request** → `GET /api/barbeiros/listar`
   - Mostra lista de barbeiros
3. **HTTP Request** → `GET /api/agendamentos/horarios-disponiveis?data=2025-12-20`
   - Mostra horários disponíveis
4. **HTTP Request** → `POST /api/agendamentos/criar`
   - Cria o agendamento
5. **Send WhatsApp Message** → Confirmação enviada ao cliente

---

## 📝 Notas Importantes

1. **UUIDs dos Serviços**: Você precisa buscar os IDs dos serviços no banco Supabase:
   ```sql
   SELECT id, nome, preco, duracao_minutos FROM servicos;
   ```

2. **Barbeiro Preferido**: Pode ser o **nome** (ex: `"JRato"`) ou o **UUID** do barbeiro

3. **Rodízio Automático**: Se `barbeiro_preferido` não for informado, o sistema escolhe automaticamente

4. **Validação de Conflitos**: O sistema verifica automaticamente se o horário está disponível

5. **Webhooks**: Configure no dashboard para receber notificações automáticas

---

## 🚀 Deploy na Vercel

Após o push para GitHub:

```bash
git remote add origin https://github.com/fabiobzissou72/jrato.git
git push -u origin main
```

Conecte o repositório na Vercel e configure as variáveis de ambiente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sua API estará disponível em: `https://jrato.vercel.app/api`

---

## 📞 Suporte

Para dúvidas ou problemas, consulte os logs no dashboard do Supabase ou da Vercel.

**Desenvolvido para JRATO BARBER SHOP - Portugal 🇵🇹**

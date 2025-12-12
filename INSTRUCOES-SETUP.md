# 🔧 Instruções de Configuração - JRato Barber Shop Portugal

## ✅ O que foi feito:

### 1. **Configuração do Supabase**
- ✅ Arquivo `.env.local` criado com suas credenciais
- ✅ Script SQL criado (`setup-database.sql`)

### 2. **Modificações Visuais**
- ✅ Cores alteradas para **preto e vermelho**
- ✅ Logo do JRato Barber Shop integrado
- ✅ Tela de login personalizada
- ✅ Dashboard com tema preto/vermelho

### 3. **Configurações Regionais**
- ✅ Formatação de moeda alterada para **Euros (€)**
- ✅ Formato de data alterado para **Português de Portugal**

### 4. **Dados Iniciais**
- ✅ **2 Barbeiros**: JRato e Nuno
- ✅ **2 Serviços**:
  - Corte: 12€
  - Barba: 8€

---

## 📋 Próximos Passos:

### **1. Configurar o Banco de Dados no Supabase**

1. Acesse o Supabase: https://rakrydyxfamshdcseeic.supabase.co
2. Faça login na sua conta
3. Vá para **SQL Editor** (no menu lateral)
4. Clique em **+ New Query**
5. Copie **TODO o conteúdo** do arquivo `setup-database.sql`
6. Cole no editor SQL
7. Clique em **RUN** para executar

✅ Isso irá criar:
- Todas as tabelas necessárias
- Os 2 barbeiros (JRato e Nuno)
- Os 2 serviços (Corte 12€, Barba 8€)
- Logins com senha padrão: **123456**

---

### **2. Acessar o Sistema**

O servidor já está rodando em: **http://localhost:3000**

#### **Login dos Barbeiros:**
- **JRato**: jrato@barbearia.pt | Senha: 123456
- **Nuno**: nuno@barbearia.pt | Senha: 123456

---

## 🎨 Cores do Sistema:

- **Primária**: Vermelho (#DC2626 / #EF4444)
- **Background**: Preto / Zinc-900
- **Acentos**: Vermelho escuro

---

## 📱 Funcionalidades:

- ✅ Sistema de agendamentos
- ✅ Gestão de clientes
- ✅ Gestão de serviços
- ✅ Gestão de profissionais
- ✅ Relatórios financeiros (em Euros)
- ✅ Dashboard com métricas em tempo real
- ✅ Produtos e vendas
- ✅ Planos de assinatura

---

## 🚀 Como Rodar o Projeto:

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Rodar o servidor de desenvolvimento
npm run dev
```

O sistema estará disponível em: **http://localhost:3000**

---

## 🔐 Segurança:

⚠️ **IMPORTANTE**: Altere as senhas padrão após o primeiro acesso!
- Senha padrão dos barbeiros: **123456**

---

## 📞 Suporte:

Se tiver alguma dúvida ou problema, verifique:
1. Se o Supabase está configurado corretamente
2. Se as tabelas foram criadas (execute o `setup-database.sql`)
3. Se o arquivo `.env.local` existe na raiz do projeto

---

**Desenvolvido para JRato Barber Shop - Portugal 🇵🇹**

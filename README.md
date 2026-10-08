<h1 align="center">💈 Agendamento Online — Boss67 Barbearia</h1>

<p align="center">
Sistema de agendamento desenvolvido como projeto de portfólio e protótipo de produto real, com foco em <strong>experiência do usuário, desenvolvimento full stack, responsividade e gestão de agenda</strong>.
</p>

---

## 🚀 Preview

<p align="center">
<img src="https://raw.githubusercontent.com/Ruan2R/P13-AGENDAMENTO-BARBEARIA/main/assets/og-boss67.jpg" alt="Boss67 Barbearia — Agendamento Online" width="800"/>
</p>

---

## 🛠️ Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Node.js
- SQLite
- API REST
- Git / GitHub

---

## 📚 O que foi aplicado

- Estruturação semântica com HTML5
- CSS responsivo para desktop, tablet e mobile
- Flexbox e CSS Grid
- Manipulação da DOM
- Eventos com `addEventListener`
- Controle de estado da aplicação
- Renderização dinâmica de dados
- Consumo de API REST com `fetch`
- Criação de API com Node.js
- Persistência de dados com SQLite
- Validação de disponibilidade no backend
- Regras de duração, funcionamento e conflitos de agenda
- Autenticação administrativa com sessão via cookie `HttpOnly`
- SEO local e dados estruturados
- Open Graph e metadados para compartilhamento

---

## 🎯 Sobre o projeto

O projeto nasceu a partir da observação de um sistema de agendamento utilizado por uma barbearia real. A proposta é substituir uma experiência pouco intuitiva por uma interface simples, rápida e alinhada à identidade visual da Boss67.

Além da experiência do cliente, o sistema foi estruturado para evoluir para uma solução completa de gestão de agenda e, futuramente, para um produto aplicável a outros negócios de serviços.

---

## ✂️ Fluxo do cliente

1. Escolha do serviço
2. Escolha do profissional
3. Escolha da data
4. Escolha do horário
5. Nome + WhatsApp
6. Revisão
7. Confirmação

---

## ⚙️ Funcionalidades atuais

### Cliente

- Seleção de serviços e profissionais
- Agendamento de múltiplos procedimentos no mesmo pedido
- Escolha de profissional e horário para cada procedimento
- Opção de "Sem preferência"
- Consulta de disponibilidade por data
- Regras de duração e horário de funcionamento
- Bloqueios e conflitos tratados pelo backend
- Nome e WhatsApp sem necessidade de conta
- Confirmação e geração de evento `.ics`
- Ação para contato via WhatsApp

### Área administrativa

- Login e sessão protegida
- Agenda por data
- Filtros por profissional e status
- Indicadores do dia
- Cancelamento de agendamentos
- Bloqueios de horário
- Cadastro e edição de serviços
- Cadastro e edição de profissionais
- Ativação/desativação de serviços e profissionais
- Configuração do horário de funcionamento
- Visualização da agenda agrupada por atendimento
- Cancelamento de atendimento com múltiplos procedimentos

---

## 🔐 Autenticação

A área administrativa utiliza sessão baseada em cookie `HttpOnly`.

No desenvolvimento local, credenciais padrão são criadas automaticamente:

```text
E-mail: admin@boss67.local
Senha: boss67demo
```

Em produção, as credenciais precisam ser fornecidas por variáveis de ambiente:

```text
BOSS67_ADMIN_EMAIL=seu-email
BOSS67_ADMIN_PASSWORD=sua-senha-forte
```

Antes de publicar, ainda devem ser implementados controles adicionais de produção, como rate limiting, recuperação de acesso e gerenciamento de usuários.

---

## 🗂️ Estrutura

```text
P13-AGENDAMENTO-BARBEARIA/
├── index.html
├── login.html
├── admin.html
├── css/
├── js/
├── assets/
├── server/
├── data/
├── .env.example
├── package.json
├── start.bat
└── README.md
```

---

## ▶️ Como executar

Requisito: **Node.js 22.5+**

```bash
npm start
```

No Windows, também é possível usar `start.bat`.

Depois acesse:

```text
http://localhost:3000
```

Área administrativa:

```text
http://localhost:3000/login.html
```

---

## 🔌 API principal

### Pública

```text
GET  /api/health
GET  /api/services
GET  /api/professionals
GET  /api/availability
POST /api/bookings
POST /api/bookings/batch
```

### Administrativa

As rotas administrativas exigem sessão autenticada.

```text
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/me
GET  /api/admin/overview
GET  /api/admin/bookings
POST /api/admin/bookings/:id/cancel
POST /api/admin/booking-groups/:groupId/cancel
GET  /api/admin/blocks
POST /api/admin/blocks
POST /api/admin/blocks/:id/remove
GET  /api/admin/services
POST /api/admin/services
PUT  /api/admin/services/:id
POST /api/admin/services/:id/toggle
GET  /api/admin/professionals
POST /api/admin/professionals
PUT  /api/admin/professionals/:id
POST /api/admin/professionals/:id/toggle
GET  /api/admin/opening-hours
PUT  /api/admin/opening-hours/:weekday
```

---

## 🗄️ Banco de dados

O projeto utiliza SQLite durante o desenvolvimento local. O caminho pode ser configurado com `BOSS67_DB_PATH`. O banco é criado automaticamente na primeira inicialização. Agendamentos múltiplos compartilham um identificador de grupo (`booking_group_id`) para manter os procedimentos do mesmo pedido relacionados.

---

## 🔎 SEO

A página pública possui title, description, meta robots, Open Graph, Twitter Card, favicon, dados estruturados locais e conteúdo direcionado para buscas em Sidrolândia-MS. O fluxo de múltiplos procedimentos mantém a mesma página pública e não altera a base de SEO local.

Próximos passos:

- definir o domínio final;
- configurar URL canônica;
- gerar `robots.txt` e `sitemap.xml`;
- cadastrar o domínio no Google Search Console;
- validar os dados estruturados.

---

## 📌 Status

**V0.17.3 — Refinamento da confirmação via WhatsApp**

A V0.17 aprimora a área administrativa com uma visão da agenda agrupada por atendimento, reunindo procedimentos do mesmo pedido e permitindo ações rápidas sobre o atendimento completo.

O painel passa a apresentar horário, cliente, procedimentos, profissionais, total e status em um único bloco. Atendimentos com múltiplos procedimentos podem ser cancelados de forma atômica.

O fluxo de múltiplos procedimentos e a confirmação em lote continuam preservados.

A área administrativa agora conta com uma leitura mais próxima de uma agenda operacional diária, reduzindo a fragmentação de um mesmo atendimento em várias linhas.

## 👤 Autor

**Ruan Rodrigues**

Projeto desenvolvido para portfólio durante a transição profissional para desenvolvimento web, a partir de uma oportunidade real de aplicação comercial.

### WhatsApp

Após a confirmação, o cliente pode enviar uma mensagem já preenchida diretamente para o WhatsApp da Boss67, com a data, os procedimentos, os profissionais, os horários e o total do atendimento.

O número fica separado em `js/config.js` para facilitar a troca da unidade sem alterar a lógica da aplicação. O número configurado nesta versão foi obtido em uma listagem pública da Boss67 e deve ser confirmado com o estabelecimento antes do uso em produção.


### Confirmação via WhatsApp

A área administrativa permite abrir uma conversa com o cliente com uma mensagem padronizada informando que o agendamento foi confirmado pela Boss67, incluindo data, procedimentos, profissionais, horários e total. A confirmação do cliente continua sendo feita exclusivamente pelo site.

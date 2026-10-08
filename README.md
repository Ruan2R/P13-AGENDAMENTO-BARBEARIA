<h1 align="center">💈 Agendamento Online — Boss67 Barbearia</h1>

<p align="center">
Sistema de agendamento desenvolvido como projeto de portfólio e protótipo de produto real, com foco em <strong>experiência do usuário, desenvolvimento full stack, responsividade e gestão de agenda</strong>.
</p>

---

## 🚀 Preview

<p align="center">
<<<<<<< HEAD
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
=======

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

Durante este projeto foram praticados conceitos importantes de desenvolvimento front-end e back-end, como:

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
- Regras de duração e horário de funcionamento
- Controle de conflitos entre agendamentos
- Autenticação administrativa com sessão via cookie `HttpOnly`
- Organização de dados e regras de negócio
- SEO local e dados estruturados
- Open Graph e metadados para compartilhamento

---

## 🎯 Sobre o projeto

O projeto nasceu a partir da observação de um sistema de agendamento utilizado por uma barbearia real.

A proposta é substituir uma experiência de agendamento pouco intuitiva por uma interface mais simples, rápida e alinhada à identidade visual da Boss67.

Além da experiência do cliente, o projeto foi estruturado para evoluir para uma solução completa, com:

- agendamento online;
- controle de disponibilidade;
- painel administrativo;
- gerenciamento de serviços;
- gerenciamento de profissionais;
- configuração de horários;
- bloqueios de agenda;
- histórico e controle de agendamentos.

A arquitetura também foi pensada para permitir que, futuramente, a solução deixe de ser específica da Boss67 e evolua para um produto aplicável a outros negócios de serviços.

---

## ✂️ Fluxo do cliente

1. Escolha do serviço
2. Escolha do profissional
3. Escolha da data
4. Escolha do horário
5. Nome + WhatsApp
6. Revisão do agendamento
7. Confirmação

O fluxo foi pensado para reduzir etapas desnecessárias e evitar a obrigatoriedade de criação de conta para o cliente.

---

## ⚙️ Funcionalidades atuais

### Cliente

- Seleção de serviços
- Seleção de profissionais
- Opção de "Sem preferência"
- Consulta de datas disponíveis
- Consulta de horários disponíveis
- Cálculo baseado na duração do serviço
- Validação de disponibilidade
- Formulário de nome e WhatsApp
- Revisão antes da confirmação
- Confirmação do agendamento
- Link para WhatsApp
- Geração de evento `.ics` para calendário

### Área administrativa

- Login administrativo
- Sessão protegida
- Visualização da agenda
- Filtro por profissional e status
- Indicadores do dia
- Cancelamento de agendamentos
- Bloqueio de horários
- Remoção de bloqueios
- Cadastro e edição de serviços
- Ativação/desativação de serviços
- Cadastro e edição de profissionais
- Ativação/desativação de profissionais
>>>>>>> 28b946f56960309315aaf17a352e93c410987775
- Configuração do horário de funcionamento

---

## 🔐 Autenticação

A área administrativa utiliza sessão baseada em cookie `HttpOnly`.

<<<<<<< HEAD
No desenvolvimento local, credenciais padrão são criadas automaticamente:
=======
Para desenvolvimento local, o projeto possui credenciais padrão:
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

```text
E-mail: admin@boss67.local
Senha: boss67demo
```

<<<<<<< HEAD
Em produção, as credenciais precisam ser fornecidas por variáveis de ambiente:
=======
Essas credenciais são destinadas exclusivamente ao ambiente de desenvolvimento.

Antes de qualquer implantação real, defina:
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

```text
BOSS67_ADMIN_EMAIL=seu-email
BOSS67_ADMIN_PASSWORD=sua-senha-forte
```

<<<<<<< HEAD
Antes de publicar, ainda devem ser implementados controles adicionais de produção, como rate limiting, recuperação de acesso e gerenciamento de usuários.
=======
Ainda são necessárias evoluções de segurança para produção, como HTTPS, rate limiting, gerenciamento de usuários e recuperação de acesso.
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

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
<<<<<<< HEAD
=======
│   ├── logo-boss67.jpg
│   ├── og-boss67.jpg
│   ├── favicon.png
│   └── apple-touch-icon.png
>>>>>>> 28b946f56960309315aaf17a352e93c410987775
├── server/
├── data/
<<<<<<< HEAD
=======
│   └── boss67.sqlite
>>>>>>> 28b946f56960309315aaf17a352e93c410987775
├── .env.example
├── package.json
├── start.bat
└── README.md
```

---

## ▶️ Como executar

Requisito: **Node.js 22.5+**
<<<<<<< HEAD
=======

Dentro da pasta do projeto:
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

```bash
npm start
```

<<<<<<< HEAD
No Windows, também é possível usar `start.bat`.

=======
No Windows, também é possível utilizar:

```text
start.bat
```

>>>>>>> 28b946f56960309315aaf17a352e93c410987775
Depois acesse:

```text
http://localhost:3000
```

Área administrativa:

```text
http://localhost:3000/login.html
```

<<<<<<< HEAD
---

## 🔌 API principal
=======
Painel:

```text
http://localhost:3000/admin.html
```

---

## 🔌 API
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

### Pública

```text
GET  /api/health
GET  /api/services
GET  /api/professionals
GET  /api/availability
POST /api/bookings
```

### Administrativa
<<<<<<< HEAD

As rotas administrativas exigem sessão autenticada.
=======
>>>>>>> 28b946f56960309315aaf17a352e93c410987775

```text
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/me
GET  /api/admin/overview
GET  /api/admin/bookings
POST /api/admin/bookings/:id/cancel
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

<<<<<<< HEAD
O projeto utiliza SQLite durante o desenvolvimento local. O caminho pode ser configurado com `BOSS67_DB_PATH`. O banco é criado automaticamente na primeira inicialização.

---

## 🔎 SEO

A página pública possui title, description, meta robots, Open Graph, Twitter Card, favicon, dados estruturados locais e conteúdo direcionado para buscas em Sidrolândia-MS.

Próximos passos:

- definir o domínio final;
- configurar URL canônica;
- gerar `robots.txt` e `sitemap.xml`;
- cadastrar o domínio no Google Search Console;
- validar os dados estruturados.

---

## 📌 Status

**V0.12 — Regras de agenda + validações**

A V0.12 reforça as regras de disponibilidade, impede reservas em horários passados, valida datas reais, normaliza o WhatsApp, adiciona limites básicos no frontend e evita a inserção direta de dados da API em HTML sem escape.

A base também já está preparada para configuração por ambiente, cookies seguros em produção, caminho de banco configurável e cabeçalhos básicos de segurança.

O próximo marco é preparar o ambiente de produção, com banco remoto/persistente, deploy, domínio, HTTPS e notificações reais.

---

## 👤 Autor

**Ruan Rodrigues**

Projeto desenvolvido para portfólio durante a transição profissional para desenvolvimento web, a partir de uma oportunidade real de aplicação comercial.
=======
O projeto utiliza **SQLite** durante o desenvolvimento local.

O banco fica em:

```text
data/boss67.sqlite
```

O banco armazena informações relacionadas a:

- serviços;
- profissionais;
- horários de funcionamento;
- bloqueios;
- agendamentos;
- sessões administrativas.

---

## 🚀 Preparação para produção

### Variáveis de ambiente

Exemplo em `.env.example`:

```text
NODE_ENV=production
PORT=3000
BOSS67_ADMIN_EMAIL=seu-email
BOSS67_ADMIN_PASSWORD=sua-senha-forte
BOSS67_DB_PATH=/caminho/seguro/boss67.sqlite
```

Em produção, `BOSS67_ADMIN_EMAIL` e `BOSS67_ADMIN_PASSWORD` são obrigatórios. A sessão administrativa recebe `Secure` quando `NODE_ENV=production`.

O caminho do banco pode ser alterado com `BOSS67_DB_PATH`, permitindo separar dados persistentes da pasta do código.

### Checklist antes do deploy

- definir credenciais administrativas por ambiente;
- usar HTTPS;
- configurar armazenamento persistente para o banco ou migrar para banco remoto;
- definir backups;
- revisar logs e monitoramento;
- configurar domínio e URL canônica;
- validar integrações externas.

## 🔎 SEO

A página pública já possui uma base de SEO local, incluindo:

- `title` e `description` direcionados a buscas locais;
- meta robots;
- Open Graph;
- Twitter Card;
- favicon e Apple Touch Icon;
- dados estruturados `HealthAndBeautyBusiness`;
- informações públicas de localização e horário.

### Próximos passos de SEO

- definir o domínio final;
- adicionar URL canônica absoluta;
- gerar `robots.txt`;
- gerar `sitemap.xml`;
- cadastrar o domínio no Google Search Console;
- validar os dados estruturados;
- revisar títulos, descrições e conteúdo local.

---

## 📌 Status do projeto

**V0.11 — Preparação para produção**

O MVP local já possui fluxo completo de agendamento, backend, banco de dados, painel administrativo e autenticação.

A V0.11 prepara a aplicação para um ambiente real, sem alterar o fluxo validado do cliente. Entraram configurações por variáveis de ambiente, banco SQLite com caminho configurável, cookies seguros em produção, cabeçalhos de segurança e encerramento controlado do servidor.

O próximo estágio é publicar a API, migrar para banco remoto, configurar domínio/HTTPS e integrar notificações e serviços externos.

---

## 👤 Autor

**Ruan Rodrigues**

Projeto desenvolvido para portfólio durante a transição profissional para desenvolvimento web, a partir de uma oportunidade real de aplicação comercial.

>>>>>>> 28b946f56960309315aaf17a352e93c410987775

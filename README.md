# P13 — Boss67 Agendamento

Produto em desenvolvimento para transformar o agendamento da Boss67 Barbearia em uma experiência simples para o cliente e em uma rotina organizada para a equipe.

## V0.9 — Acesso administrativo + configuração

A V0.9 adiciona autenticação por sessão para a área administrativa e transforma o painel em uma central de configuração do negócio.

## V0.10 — Mobile + SEO

A V0.10 refina a experiência mobile e adiciona a base de SEO local da página pública.

### Ajustes da V0.10

- Layout mobile refinado para telas estreitas, com espaçamentos e controles mais confortáveis para toque.
- Informações públicas da Boss67 enriquecidas com localização e Instagram.
- Título e descrição direcionados a buscas locais em Sidrolândia.
- Open Graph e Twitter Card.
- Dados estruturados `HealthAndBeautyBusiness` com endereço, Instagram e horário de funcionamento.
- `login.html` e `admin.html` marcados como `noindex, nofollow, noarchive`.
- Favicon, Apple Touch Icon e imagem para compartilhamento social.
- Mensagem de conexão da API mais clara para o ambiente local.

### Fluxo do cliente

1. Serviço
2. Profissional
3. Data e horário
4. Nome + WhatsApp
5. Revisão
6. Confirmação

### O que existe agora

- Frontend vanilla (HTML, CSS e JavaScript).
- API REST local em Node.js.
- SQLite para serviços, profissionais, horários, bloqueios e agendamentos.
- Disponibilidade calculada pelo backend por serviço, profissional e data.
- Regra de duração do serviço e horário de funcionamento.
- Bloqueios por profissional.
- Validação no momento da reserva para impedir conflito de horários.
- `Sem preferência` escolhe um profissional realmente disponível.
- Reserva persistente no banco SQLite.
- Tela de confirmação com link de WhatsApp e geração de evento `.ics`.

## Área administrativa

Acesse em:

```text
http://localhost:3000/admin.html
```

Sem sessão ativa, o sistema encaminha para:

```text
http://localhost:3000/login.html
```

O painel permite:

- consultar a agenda por data;
- filtrar por profissional e status;
- visualizar clientes, serviços, horários e faturamento do dia;
- cancelar agendamentos;
- criar e remover bloqueios;
- cadastrar e editar serviços;
- ativar/desativar serviços;
- cadastrar e editar profissionais;
- ativar/desativar profissionais;
- configurar o horário de funcionamento de cada dia da semana;
- encerrar a sessão administrativa.

### Autenticação

A V0.9 usa sessão via cookie `HttpOnly` e tabela própria de sessões no SQLite.

Para facilitar o desenvolvimento local, o primeiro administrador é criado automaticamente com:

```text
E-mail: admin@boss67.local
Senha: boss67demo
```

Essas credenciais são **somente para desenvolvimento**. Antes de qualquer implantação real, defina variáveis de ambiente:

```text
BOSS67_ADMIN_EMAIL=seu-email
BOSS67_ADMIN_PASSWORD=sua-senha-forte
```

O servidor cria o usuário informado na primeira inicialização caso ele ainda não exista.

> Para um ambiente de produção, ainda precisamos evoluir proteção de sessão, HTTPS, gerenciamento de usuários, recuperação de acesso, rate limiting e demais controles de segurança.

## Estrutura

```text
P13-BOSS67-AGENDAMENTO/
├── index.html
├── login.html
├── admin.html
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── app.js
│   ├── login.js
│   └── admin.js
├── assets/
│   └── logo-boss67.jpg
├── server/
│   ├── api.js
│   ├── auth.js
│   ├── db.js
│   └── server.js
├── data/
│   └── boss67.sqlite   # desenvolvimento local
└── package.json
```

### Como executar

Requisito: Node.js 22.5+.

No terminal, dentro da pasta:

```bash
npm start
```

No Windows, o arquivo `start.bat` também pode ser usado.

Depois abra:

```text
http://localhost:3000
```

### API pública

```text
GET  /api/health
GET  /api/services
GET  /api/professionals
GET  /api/availability?date=AAAA-MM-DD&serviceId=corte&professionalId=felipe
POST /api/bookings
```

### API administrativa

Todas as rotas abaixo exigem sessão autenticada:

```text
GET  /api/admin/me
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/overview?date=AAAA-MM-DD
GET  /api/admin/bookings?date=AAAA-MM-DD
POST /api/admin/bookings/:id/cancel
GET  /api/admin/blocks?date=AAAA-MM-DD
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

### Banco

O banco local fica em `data/boss67.sqlite`. O arquivo pode ser removido para recriar o ambiente de desenvolvimento a partir do seed do projeto.

Os bloqueios de demonstração do seed continuam em uma data futura (`2099-01-01`) para facilitar testes das regras do backend sem interferir na agenda real de uso do protótipo.

## Próximo marco

A próxima evolução deve levar o MVP local para uma arquitetura preparada para uso real: banco remoto, publicação do backend, HTTPS, autenticação com credenciais configuráveis, observabilidade e integração com WhatsApp/notificações.


## SEO — próximos passos de publicação

A página pública já possui title, description, robots, Open Graph, dados estruturados locais e conteúdo de endereço/horário.

Antes do domínio final, ainda devemos:
- definir a URL canônica absoluta;
- gerar `robots.txt` e `sitemap.xml` com a URL real;
- cadastrar e validar a propriedade no Google Search Console;
- conferir o resultado no Rich Results Test;
- manter endereço e horário iguais aos dados públicos oficiais da Boss67.

Não usar avaliações agregadas no schema sem uma fonte válida de avaliações da própria página. O Google informa que conteúdo estruturado precisa representar conteúdo visível e verdadeiro da página.

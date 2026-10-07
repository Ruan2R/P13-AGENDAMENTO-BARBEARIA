# P13 — Boss67 Agendamento

Protótipo de um novo fluxo de agendamento online para a Boss67 Barbearia.

## V0.6

A terceira versão transforma a interface em uma experiência de agendamento navegável, mantendo o visual dark + yellow da marca.

### Fluxo atual

1. Serviço
2. Profissional
3. Data e horário
4. Nome + WhatsApp
5. Revisão e confirmação

### Tecnologias

- HTML5
- CSS3
- JavaScript (Vanilla)

### Observação

Os profissionais, horários e bloqueios usados na V0.6 são dados de protótipo. A próxima evolução é substituir esses dados por uma fonte real (backend/banco de dados).


### V0.6 — confirmação e disponibilidade dinâmica
- Corrigida a renderização da tela final (IDs duplicados removidos).
- A confirmação final agora mostra serviço, profissional, data, horário, nome e WhatsApp corretamente.
- A tela de confirmação ganhou ações de WhatsApp e calendário (.ics).
- Horários passam a respeitar o horário de funcionamento por dia.
- Disponibilidade varia por profissional e pela duração do serviço.
- Domingo não aparece como dia agendável.

> Os bloqueios de agenda continuam sendo dados ilustrativos para validação do fluxo.

## V0.6 — agenda simulada
- Reservas confirmadas são persistidas no `localStorage` do navegador.
- Horários reservados deixam de aparecer para o mesmo profissional.
- Durações diferentes bloqueiam horários com sobreposição.
- A opção `Sem preferência` procura um profissional realmente disponível.
- Alterações de agenda entre abas são refletidas via evento `storage`.


## V0.6
- Corrigida a renderização da etapa de revisão, que agora exibe serviço, profissional, data, horário, nome e WhatsApp corretamente.

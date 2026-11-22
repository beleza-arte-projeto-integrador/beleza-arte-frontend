# mock-api — modo demonstração (plano C)

API de demonstração que responde, no lugar do backend, as rotas que dependem da
tabela de agendamentos. Existe porque a classe `Appointments` do backend foi
reestruturada e o banco compartilhado (Supabase) ainda não foi atualizado para a
nova estrutura: hoje, no backend real, as buscas de agendamento e o relatório
gerencial respondem erro 500.

As telas e os arquivos `js/api/*` **não foram alterados**. Tudo continua passando
por `/api/*`; o `server.js` decide se a rota vai para o mock ou para o backend.

## Como usar

| Comando | O que acontece |
|---|---|
| `npm start` | Igual a antes: tudo vai para o backend. O mock não é carregado. |
| `npm run demo` | **Híbrido**: agendamentos, itens, pagamentos e relatório no mock; clientes, profissionais, serviços e recursos no backend real. Precisa do backend rodando. |
| `npm run demo:offline` | **Offline**: tudo no mock. Precisa só do Node.js. |

Nos dois modos aparece o aviso **"Modo demonstração"** no canto da tela.
Os dados do mock ficam em memória e voltam ao estado inicial quando o servidor é reiniciado.

## Rotas respondidas pelo mock

**Nos dois modos** (dependem de agendamentos):

- Agendamentos: `POST /createAppointments`, `PUT /updateAppointments`, `DELETE /deleteAppointments`,
  `GET /searchClientAppointments`, `/searchProfessionalAppointments`, `/searchServiceAppointments`,
  `/searchDateAppointments`, `/searchStatusAppointments`, `/searchNotesAppointments`,
  `/searchPriceAppointments`, `/searchTimeAppointments`, `/searchCreatedAppointments`
- Itens: `POST /appointmentsItems/createAppointmentsItems`, `PUT .../updateAppointmentsItems`,
  `DELETE .../deleteAppointmentsItems`, `GET .../searchStartDate`, `.../searchEndDate`, `.../searchPrice`
- Pagamentos: `GET /listPayments`, `/searchSummaryPayments`, `/searchRevenuePayments`,
  `/searchAppointmentPayments`, `/searchStatusPayments`, `PUT /payPayments`
- Relatório: `GET /searchManagementReport`

**Só no modo offline** (no híbrido vêm do backend):

- Clientes: `/searchNameClients`, `/searchPhoneClients`, `/searchEmailClients`, `/searchCreatedClients`,
  `/createClients`, `/updateClients`, `/deleteClients`, `/exportClientsData`, `/anonymizeClients`
- Profissionais: `/searchName`, `/searchEmail`, `/searchPhone`, `/searchSpecialty`, `/searchCreated`,
  `/createProfessionals`, `/updateProfessionals`, `/deleteProfessionals`
- Serviços: `/service/searchName`, `/service/searchDescription`, `/service/searchDuration`,
  `/service/searchPrice`, `/service/searchCategory`, `/service/searchCreated`,
  `/service/createServices`, `/service/updateServices`, `/service/deleteServices`
- Recursos: `/searchNameResources`, `/searchTypeResources`, `/searchActiveResources`,
  `/createResources`, `/updateResources`, `/deleteResources`

## Regras reproduzidas do backend

- Agendamento novo começa como `AGENDADO`; o cliente precisa existir e não pode ser trocado.
- Ciclo de status: `AGENDADO → CONFIRMADO | CANCELADO`; `CONFIRMADO → CONCLUIDO | CANCELADO | NAO_COMPARECEU`.
  Para `CANCELADO`, `cancelledBy` (`CLIENTE` ou `SALAO`) é obrigatório e `cancelledAt` é preenchido.
- Excluir agendamento apaga os itens junto, mas é recusado se houver pagamentos (como no banco).
- Pagamento não é criado pela tela: criar, alterar ou excluir um item recalcula o pagamento `PENDENTE`
  do agendamento (`generatePayments`); cancelar o agendamento cancela os pendentes; só `PENDENTE` pode ser pago.
- Relatório: mesmo cálculo do `ManagementReportsService` (itens que começam no período, horário de Brasília).
- Buscas sem resultado e erros de regra respondem 422 com `{ message }`, como o backend.

## Dados iniciais

`data/seed.js`, baseado em `beleza-arte-back/docker/postgres/init/02-dados-de-teste.sql`
(as mesmas pessoas, serviços, recursos e um agendamento de cada status, com datas relativas a hoje).
No modo híbrido o mock começa **sem** agendamentos, porque os IDs de clientes e serviços são os do banco real.

Logins de profissional no modo offline: `anna`, `juliana`, `camila`, `marina`, `beatriz`,
`carolina`, `sofia`, `carol`, `renata`, `paula` (`laura` está inativa).

## Estrutura

```
mock-api/
  index.js               escolhe a rota (método + caminho) e responde
  banner.js              aviso "Modo demonstração" colocado nas páginas
  data/seed.js           dados iniciais
  lib/http.js            leitura do corpo, respostas e erros
  lib/store.js           banco em memória
  lib/time.js            datas no horário de Brasília
  lib/catalog.js         nomes de clientes/serviços/profissionais (mock ou backend)
  routes/appointments.js
  routes/appointment-items.js
  routes/payments.js
  routes/reports.js
  routes/catalog.js      cadastros (só no modo offline)
```

## Como remover

Quando o banco for atualizado e o backend responder as rotas de agendamento, use `npm start`.
Para remover de vez: apague esta pasta, os scripts `demo` e `demo:offline` do `package.json`
e os trechos marcados com "Modo demonstração" no `server.js`.

# beleza-arte-projeto-integrador

Sistema web para um salão de beleza, desenvolvido como Projeto Integrador da faculdade de Análise e Desenvolvimento de Sistemas.

## Modo demonstração (alternativa temporária)

A tabela de agendamentos do backend foi reestruturada e a atualização do banco compartilhado ainda está pendente. Enquanto isso, as rotas de agendamento e o relatório gerencial do backend respondem erro. Para que as telas possam ser avaliadas, existe um **modo demonstração**, que responde essas rotas com dados simulados, seguindo o mesmo contrato e as mesmas regras do backend. Nenhuma tela foi alterada para isso.

| Comando | Quando usar |
|---|---|
| `npm run demo:offline` | Avaliar só o frontend. Precisa apenas do Node.js; todos os dados são simulados. |
| `npm run demo` | Com o backend rodando: clientes, profissionais, serviços e recursos vêm do backend; agendamentos, itens, pagamentos e relatório são simulados. |
| `npm start` | Funcionamento normal, tudo pelo backend (quando o banco estiver atualizado). |

Depois de iniciar, acesse `http://localhost:3000`. No modo demonstração aparece um aviso no canto da tela. Os dados simulados voltam ao estado inicial quando o servidor é reiniciado.

- Login administrativo: `admin@belezaearte.com.br` / `admin123`.
- Login de profissional (modo offline): usuário `anna`, `sofia`, `camila`, entre outros.

Detalhes, lista completa de rotas simuladas e como remover o modo: [mock-api/README.md](./mock-api/README.md).

## Integração geral com a API

O frontend se comunica com o backend usando a URL base:

```text
http://localhost:8081/v1/api/salao
```

Essa URL é configurável pela variável de ambiente `API_BASE_URL` usada pelo proxy local.

Como o navegador bloqueia requisições entre portas diferentes por CORS, o projeto possui um proxy local. Ele serve o frontend em `http://localhost:3000` e encaminha qualquer rota `/api/...` para a rota equivalente do backend.

Exemplos:

```text
/api/service/searchName
        ↓
/v1/api/salao/service/searchName

/api/searchSpecialty
        ↓
/v1/api/salao/searchSpecialty
```

A camada de comunicação fica em [js/api/](./js/api/). Cada módulo deve manter nessa pasta suas requisições, endpoints, payloads, headers e tratamento de respostas, evitando chamadas duplicadas nas telas.

O módulo de itens de agendamento está disponível em [js/api/appointments-items-api.js](./js/api/appointments-items-api.js), com tela de gerenciamento em [itens-agendamento-admin.html](./itens-agendamento-admin.html).

O agendamento feito pelo cliente ([agendamento.html](./agendamento.html)) usa as mesmas rotas do admin. A tela ([js/agendamento.js](./js/agendamento.js)) só cuida da interface; as regras (horários livres, escolha do recurso, cadastro do cliente pelo telefone, gravação e cancelamento) ficam em [js/booking/booking-service.js](./js/booking/booking-service.js). Como o backend não tem uma rota pública de agendamento, existem limitações conhecidas, descritas no topo desse arquivo: a verificação de conflito é feita no navegador, a gravação usa várias chamadas (com desfazer em caso de falha), o recurso é escolhido automaticamente e o cliente é lembrado apenas no navegador em que agendou.

O módulo de pagamentos está disponível em [js/api/payment-api.js](./js/api/payment-api.js) (tipos em [js/types/payment-types.js](./js/types/payment-types.js)), com tela em [pagamentos-admin.html](./pagamentos-admin.html). A tela mostra as métricas do mês, o faturamento por período, a lista de pagamentos com filtro por status, permite registrar o pagamento dos pendentes e exportar as linhas exibidas em CSV. Os pagamentos são criados, recalculados e cancelados pelo backend a partir dos itens e do status do agendamento; o frontend apenas consulta e registra o recebimento.

## Pré-requisitos

- Node.js instalado.
- Backend em execução na porta `8081`.
- Banco de dados configurado e acessível pelo backend.

## Executar corretamente

1. Inicie o backend conforme as instruções do projeto backend.
2. Abra um terminal na pasta `beleza-arte-frontend`.
3. Inicie o proxy local:

```bash
npm start
```

4. Acesse as páginas pelo endereço:

```text
http://localhost:3000
```

Por exemplo, a tela de serviços fica em:

```text
http://localhost:3000/servicos-admin.html
```



## Comandos disponíveis

O comando abaixo inicia o servidor definido em [server.js](./server.js):

```bash
npm start
```

Para usar outra porta:

```powershell
$env:PORT=3001
npm start
```

Depois, acesse `http://localhost:3001`.

## Como adicionar um módulo da API

Para integrar outro recurso:

1. Crie um arquivo específico em `js/api/`, por exemplo `professional-api.js`.
2. Use uma URL relativa começando por `/api`, nunca `http://localhost:8081` diretamente:

```javascript
fetch("/api/searchSpecialty?specialty=Cabeleireira");
```

3. Centralize nesse arquivo os métodos, endpoints, headers, payloads e mensagens de erro do módulo.
4. Inclua o arquivo da API antes do JavaScript da tela no HTML.
5. Execute o frontend por `http://localhost:3000`.

Não é necessário criar um novo proxy para cada módulo. O [server.js](./server.js) encaminha todas as rotas iniciadas por `/api/` para a API base.





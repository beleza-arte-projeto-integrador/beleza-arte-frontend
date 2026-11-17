# beleza-arte-projeto-integrador

Sistema web para um salão de beleza, desenvolvido como Projeto Integrador da faculdade de Análise e Desenvolvimento de Sistemas.

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





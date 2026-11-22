# Beleza & Arte — Sistema de Agendamento (Frontend)

Sistema web responsivo de agendamento para salões de beleza de pequeno e médio porte, desenvolvido como Projeto Integrador (2ª etapa) dos cursos de Tecnologia em Análise e Desenvolvimento de Sistemas e Sistemas para Internet — SENAC EAD, 2026.

Este repositório contém o **frontend**. O backend fica em outro repositório da mesma organização:

| Parte | Repositório |
|---|---|
| Frontend (este) | [beleza-arte-frontend](https://github.com/beleza-arte-projeto-integrador/beleza-arte-frontend) |
| Backend (API + banco de dados) | [beleza-arte-back](https://github.com/beleza-arte-projeto-integrador/beleza-arte-back) |

**Vídeo de demonstração:** _(adicionar o link aqui)_

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Prova de conceito (PoC)](#prova-de-conceito-poc)
- [Integrantes](#integrantes)
- [Tecnologias](#tecnologias)
- [Como executar](#como-executar)
- [Modo demonstração](#modo-demonstração-alternativa-temporária)
- [Telas](#telas)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Integração com a API](#integração-com-a-api)
- [Como adicionar um módulo da API](#como-adicionar-um-módulo-da-api)

## Sobre o projeto

Muitos salões ainda organizam a agenda em cadernos e pelo WhatsApp, o que gera conflitos de horário, faltas sem aviso e informações espalhadas. O Beleza & Arte centraliza em uma única plataforma a marcação de horários, o cadastro de clientes, a agenda das profissionais, os pagamentos e os relatórios gerenciais.

O sistema tem três áreas:

- **Cliente:** agenda serviços sozinha, sem ligar nem esperar resposta, e acompanha ou cancela os agendamentos.
- **Profissional:** vê a própria agenda, os avisos de desistência, o histórico de cancelamentos e o perfil.
- **Administração:** gerencia agendamentos, clientes, profissionais, serviços, recursos (cadeiras, cabines e equipamentos) e pagamentos, e acompanha o relatório gerencial.

## Prova de conceito (PoC)

A jornada escolhida para a prova de conceito é a da persona **Camila Rodrigues**: agendar um serviço de forma autônoma e acompanhar o agendamento.

1. Na página inicial, clicar em **"Agendar agora"**.
2. Escolher os serviços, a profissional, a data e o horário. O sistema mostra apenas os horários livres, conferindo a agenda da profissional e os recursos do salão para evitar sobreposição.
3. Informar nome, telefone e e-mail, revisar o resumo e confirmar.
4. Ver a confirmação imediata e o agendamento em **"Meus agendamentos"**, onde é possível cancelar.

Do lado do salão, o mesmo agendamento aparece na agenda da profissional e no painel administrativo, gera um pagamento pendente e entra no relatório gerencial.

## Integrantes

- Anny Gabrielly Cavalcanti Bernardo
- Felipe Araújo Duarte
- Fernanda Cavalcante Marques
- Gustavo Henrique Castro Soares
- Isabela Cavalcante Marques
- Matheus Francisco Batista Maciel
- Pedro Henrique Colombo dos Santos
- Victor Hugo Baum Schlichting

Professor: Anderson Clayton.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Frontend (este repositório) | HTML5, CSS3 e JavaScript puro (sem framework) |
| Servidor do frontend | Node.js (`server.js`): serve as páginas e encaminha `/api/*` para o backend. Sem dependências externas |
| Backend | Java com Spring Boot, documentação com Swagger. Veja o [repositório do backend](https://github.com/beleza-arte-projeto-integrador/beleza-arte-back) |
| Banco de dados | PostgreSQL (Supabase, ou local com Docker) |

## Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) **18 ou mais recente**.
- Git, para clonar o repositório.
- Para o modo completo, o backend rodando na porta `8081` (veja o [README do backend](https://github.com/beleza-arte-projeto-integrador/beleza-arte-back)). No modo demonstração offline, o backend não é necessário.

Não é preciso rodar `npm install`: o projeto não tem dependências externas.

### Passo a passo

1. Clone o repositório e entre na pasta:

   ```bash
   git clone https://github.com/beleza-arte-projeto-integrador/beleza-arte-frontend.git
   cd beleza-arte-frontend
   ```

2. Escolha como iniciar:

   | Comando | Quando usar |
   |---|---|
   | `npm run demo:offline` | **Avaliar só o frontend.** Não precisa de backend nem de banco; todos os dados são simulados. |
   | `npm run demo` | Com o backend rodando. Cadastros vêm do backend; agendamentos, pagamentos e relatório são simulados. |
   | `npm start` | Funcionamento normal, tudo pelo backend. |

3. Acesse no navegador:

   ```text
   http://localhost:3000
   ```

4. Para encerrar, pressione `Ctrl + C` no terminal.

### Acessos para teste

- **Cliente:** não precisa de login. Na página inicial, clique em "Agendar agora".
- **Administração:** `login-admin.html`, com `admin@belezaearte.com.br` e senha `admin123`.
- **Profissional:** `login-profissional.html`, só com o nome de usuário. No modo offline: `anna`, `sofia`, `camila`, `juliana`, `marina`, entre outros.

### Outras opções

Para usar outra porta (PowerShell):

```powershell
$env:PORT=3001
npm start
```

Para apontar para outro endereço de backend, defina a variável `API_BASE_URL` (padrão: `http://localhost:8081/v1/api/salao`).

## Modo demonstração (alternativa temporária)

A tabela de agendamentos do backend foi reestruturada, e a atualização do banco compartilhado ainda está pendente. Enquanto isso, as rotas de agendamento e o relatório gerencial do backend respondem erro. Para que as telas possam ser avaliadas, existe um **modo demonstração**, que responde essas rotas com dados simulados, seguindo o mesmo contrato e as mesmas regras do backend. Nenhuma tela foi alterada para isso.

| | `npm run demo:offline` | `npm run demo` |
|---|---|---|
| Clientes, profissionais, serviços e recursos | Simulados | **Backend real** |
| Agendamentos e itens | Simulados | Simulados |
| Pagamentos | Simulados | Simulados |
| Relatório gerencial | Simulado | Simulado |

- No modo demonstração aparece o aviso **"Modo demonstração"** no canto da tela.
- Os dados simulados ficam em memória e voltam ao estado inicial quando o servidor é reiniciado.
- Os dados iniciais são os mesmos do script de testes do banco do backend.

Detalhes, lista completa de rotas simuladas e como remover o modo: [mock-api/README.md](./mock-api/README.md).

## Telas

Com o servidor rodando, as telas ficam em `http://localhost:3000/<arquivo>`.

**Cliente**

| Tela | Arquivo |
|---|---|
| Página inicial | `index.html` |
| Agendamento e "Meus agendamentos" | `agendamento.html` |

**Profissional**

| Tela | Arquivo |
|---|---|
| Login | `login-profissional.html` |
| Cadastro | `cadastro-profissional.html` |
| Minha agenda, com avisos de desistência | `meus-agendamentos.html` |
| Histórico de cancelamentos | `historico-cancelamentos.html` |
| Meu perfil | `perfil-profissional.html` |

**Administração**

| Tela | Arquivo |
|---|---|
| Login | `login-admin.html` |
| Painel de gestão e relatório gerencial | `painel-admin.html` |
| Agendamentos | `remarcacao-admin.html` |
| Itens de agendamento | `itens-agendamento-admin.html` |
| Clientes | `clients-admin.html` |
| Profissionais | `profissionais-admin.html` |
| Cadastro de profissional | `cadastro-profissional-admin.html` |
| Serviços | `servicos-admin.html` |
| Recursos | `resources-admin.html` |
| Pagamentos | `pagamentos-admin.html` |

## Estrutura de pastas

```text
beleza-arte-frontend/
├── *.html             páginas (uma por tela)
├── css/               estilos de cada tela (style.css é o estilo geral)
├── images/            logo, banners, fotos de serviços e profissionais
├── js/
│   ├── api/           comunicação com o backend (um arquivo por recurso)
│   ├── types/         formato dos dados de agendamentos, pagamentos e relatório
│   ├── booking/       regras do agendamento feito pelo cliente
│   └── *.js           comportamento de cada tela
├── mock-api/          modo demonstração (API simulada)
├── server.js          servidor local: páginas + encaminhamento de /api/* para o backend
└── package.json       comandos start, demo e demo:offline
```

## Integração com a API

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

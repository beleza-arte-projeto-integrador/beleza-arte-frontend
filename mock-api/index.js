// API de demonstração (plano C).
//
// Responde, no lugar do backend, as rotas que dependem da tabela de
// agendamentos, seguindo o mesmo contrato (js/types/*.js) e as mesmas regras
// do backend. As telas e os arquivos js/api/* não sabem que estão falando com
// o mock: tudo continua passando por /api/*.
//
// Modos:
// - "hybrid"  (npm run demo):         agendamentos, itens, pagamentos e relatório
//                                     no mock; o restante vai para o backend real.
// - "offline" (npm run demo:offline): tudo no mock, sem backend nem banco.
//
// Para desligar o mock basta usar npm start. Para removê-lo de vez, apague a
// pasta mock-api/ e as linhas marcadas com "modo demonstração" no server.js.

const { buildSeed } = require("./data/seed");
const { Store } = require("./lib/store");
const { localCatalog, backendCatalog, namesFrom } = require("./lib/catalog");
const { readJsonBody, sendJson, sendError, MockHttpError } = require("./lib/http");
const { appointmentRoutes } = require("./routes/appointments");
const { appointmentItemRoutes } = require("./routes/appointment-items");
const { paymentRoutes, createPaymentRules } = require("./routes/payments");
const { reportRoutes } = require("./routes/reports");
const { catalogRoutes } = require("./routes/catalog");

const MODES = {
    hybrid: "híbrido (agendamentos simulados, cadastros do backend)",
    offline: "offline (tudo simulado, sem backend)"
};

/**
 * @param {{ mode: "hybrid"|"offline", backendUrl: string }} options
 */
function createMockApi({ mode, backendUrl }) {
    if (!MODES[mode]) throw new Error(`Modo de demonstração desconhecido: ${mode}`);
    const offline = mode === "offline";

    // No modo híbrido os IDs de clientes, serviços e profissionais são os do banco
    // real, então o mock começa sem agendamentos de exemplo (eles apontariam para
    // cadastros que talvez não existam). No offline, tudo vem do seed.
    const store = new Store(buildSeed({ catalog: offline, appointments: offline }));
    const catalog = offline ? localCatalog(store) : backendCatalog(backendUrl);
    const context = { store, catalog, names: namesFrom(catalog), paymentRules: createPaymentRules(store) };

    const routes = [
        ...appointmentRoutes(context),
        ...appointmentItemRoutes(context),
        ...paymentRoutes(context),
        ...reportRoutes(context),
        ...(offline ? catalogRoutes(context) : [])
    ];
    const routeTable = new Map(routes.map(route => [`${route.method} ${route.path}`, route]));

    /**
     * Atende a requisição se a rota for do mock.
     * @param {string} pathWithQuery caminho depois de /api (ex.: "/searchDateAppointments?date=2026-11-23")
     * @returns {Promise<boolean>} false quando a rota não é do mock (deve ir para o backend)
     */
    async function handle(request, response, pathWithQuery) {
        const url = new URL(pathWithQuery || "/", "http://mock.local");
        const route = routeTable.get(`${request.method} ${url.pathname}`);

        if (!route) {
            if (!offline) return false;
            sendError(response, new MockHttpError(404, `Rota não disponível no modo demonstração: ${request.method} ${url.pathname}`));
            return true;
        }

        try {
            const body = ["POST", "PUT"].includes(request.method) ? await readJsonBody(request) : {};
            const result = await route.handler({ query: url.searchParams, body }) || {};
            sendJson(response, result.status || (result.data === undefined ? 204 : 200), result.data, result.headers);
        } catch (error) {
            sendError(response, error);
        }
        return true;
    }

    return {
        handle,
        description: MODES[mode],
        mockedRoutes: routes.map(route => `${route.method} ${route.path}`)
    };
}

module.exports = { createMockApi };

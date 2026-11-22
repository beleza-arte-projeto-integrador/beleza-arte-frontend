// Utilitários HTTP do mock: leitura do corpo, respostas JSON e erros no
// mesmo formato do backend ({ message }), que as telas já sabem exibir.

class MockHttpError extends Error {
    /** @param {number} status @param {string} message @param {object} [extra] */
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

/** Regra de negócio violada (o backend responde 422). */
const businessError = message => new MockHttpError(422, message);

function readJsonBody(request) {
    return new Promise((resolve, reject) => {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", chunk => { raw += chunk; });
        request.on("end", () => {
            if (!raw.trim()) return resolve({});
            try {
                resolve(JSON.parse(raw));
            } catch {
                reject(new MockHttpError(400, "JSON inválido no corpo da requisição."));
            }
        });
        request.on("error", reject);
    });
}

function sendJson(response, status, data, headers = {}) {
    if (status === 204 || data === undefined) {
        response.writeHead(status === 200 ? 204 : status, headers);
        response.end();
        return;
    }
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
    response.end(JSON.stringify(data));
}

function sendError(response, error) {
    if (error instanceof MockHttpError) {
        sendJson(response, error.status, { message: error.message, ...error.extra });
        return;
    }
    console.error("[Mock] Erro inesperado:", error);
    sendJson(response, 500, { message: "Erro interno no modo demonstração." });
}

/** Lê um parâmetro de query obrigatório. */
function requiredParam(query, name) {
    const value = query.get(name);
    if (value === null) throw new MockHttpError(400, `Parâmetro obrigatório ausente: ${name}`);
    return value;
}

function toId(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

module.exports = { MockHttpError, businessError, readJsonBody, sendJson, sendError, requiredParam, toId };

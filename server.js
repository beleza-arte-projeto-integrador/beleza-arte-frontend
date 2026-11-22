const http = require("http");
const fs = require("fs");
const path = require("path");

const FRONTEND_ROOT = __dirname;
const PROXY_PREFIX = "/api";
const BACKEND_URL = process.env.API_BASE_URL || "http://localhost:8081/v1/api/salao";
const PORT = Number(process.env.PORT) || 3000;

// Modo demonstração (plano C): "node server.js --demo=hybrid" ou "--demo=offline"
// (npm run demo / npm run demo:offline). Sem a opção, o servidor funciona como antes.
const DEMO_MODE = (process.argv.find(arg => arg.startsWith("--demo=")) || "").slice("--demo=".length) || null;
const mockApi = DEMO_MODE ? require("./mock-api").createMockApi({ mode: DEMO_MODE, backendUrl: BACKEND_URL }) : null;
const demoBanner = DEMO_MODE ? require("./mock-api/banner").bannerHtml(DEMO_MODE) : "";

const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};

function sendText(response, statusCode, message) {
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(message);
}

function rewriteLocation(location, backendUrl) {
    if (!location) return location;

    const targetUrl = new URL(location, backendUrl);
    const backendPath = backendUrl.pathname.replace(/\/+$/, "");

    const isBackendPath = targetUrl.pathname === backendPath
        || targetUrl.pathname.startsWith(`${backendPath}/`);
    if (targetUrl.origin !== backendUrl.origin || !isBackendPath) {
        return location;
    }

    const suffix = targetUrl.pathname.slice(backendPath.length);
    return `${PROXY_PREFIX}${suffix || "/"}${targetUrl.search}${targetUrl.hash}`;
}

function proxyToBackend(request, response) {
    const backendUrl = new URL(BACKEND_URL);
    const suffix = request.url.slice(PROXY_PREFIX.length);
    const proxyRequest = http.request({
        hostname: backendUrl.hostname,
        port: backendUrl.port,
        path: `${backendUrl.pathname.replace(/\/+$/, "")}${suffix || "/"}`,
        method: request.method,
        headers: {
            ...request.headers,
            host: backendUrl.host
        }
    }, proxyResponse => {
        const headers = { ...proxyResponse.headers };
        if (headers.location) {
            headers.location = Array.isArray(headers.location)
                ? headers.location.map(location => rewriteLocation(location, backendUrl))
                : rewriteLocation(headers.location, backendUrl);
        }
        response.writeHead(proxyResponse.statusCode, headers);
        proxyResponse.pipe(response);
    });

    proxyRequest.on("error", error => {
        console.error("[Proxy] Falha ao conectar com o backend:", error.message);
        if (!response.headersSent) {
            sendText(response, 502, "NÃ£o foi possÃ­vel conectar com a API backend.");
        } else {
            response.end();
        }
    });

    request.pipe(proxyRequest);
}

function serveStatic(request, response) {
    const requestedPath = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relativePath = requestedPath === "/" ? "index.html" : requestedPath.slice(1);
    const filePath = path.resolve(FRONTEND_ROOT, relativePath);

    if (!filePath.startsWith(FRONTEND_ROOT + path.sep)) {
        sendText(response, 403, "Acesso negado.");
        return;
    }

    fs.stat(filePath, (statError, stats) => {
        if (statError || !stats.isFile()) {
            sendText(response, 404, "Arquivo nÃ£o encontrado.");
            return;
        }

        const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";

        // Modo demonstração: mostra o aviso "Modo demonstração" em todas as páginas.
        if (demoBanner && path.extname(filePath).toLowerCase() === ".html") {
            fs.readFile(filePath, "utf8", (readError, html) => {
                if (readError) {
                    sendText(response, 500, "Erro ao ler o arquivo.");
                    return;
                }
                response.writeHead(200, { "Content-Type": contentType });
                response.end(html.includes("</body>") ? html.replace("</body>", `${demoBanner}</body>`) : html + demoBanner);
            });
            return;
        }

        response.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(response);
    });
}

const server = http.createServer((request, response) => {
    if (request.url === PROXY_PREFIX || request.url.startsWith(`${PROXY_PREFIX}/`) || request.url.startsWith(`${PROXY_PREFIX}?`)) {
        if (mockApi) {
            // Modo demonstração: o mock responde as rotas dele; as demais seguem para o backend.
            mockApi.handle(request, response, request.url.slice(PROXY_PREFIX.length))
                .then(handled => { if (!handled) proxyToBackend(request, response); });
            return;
        }
        proxyToBackend(request, response);
        return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
        sendText(response, 405, "MÃ©todo nÃ£o permitido.");
        return;
    }

    serveStatic(request, response);
});

server.listen(PORT, "localhost", () => {
    console.log(`[Frontend] http://localhost:${PORT}`);
    console.log(`[Proxy] /api/* -> ${BACKEND_URL}/*`);
    if (mockApi) {
        console.log(`[Demo] Modo demonstração ${mockApi.description}.`);
        console.log(`[Demo] ${mockApi.mockedRoutes.length} rotas respondidas pelo mock (lista em mock-api/README.md).`);
    }
});

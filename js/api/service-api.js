(function () {
    const API_URL = "/api/service";
    /**
     * @typedef {Object} Service
     * @property {number} [id]
     * @property {string} name
     * @property {string} description
     * @property {number} price
     * @property {number} duration_minutes
     * @property {string} [created]
     * @property {string} category
     */

    /**
     * @typedef {Object} ServicePayload
     * @property {number} [id]
     * @property {string} name
     * @property {string} description
     * @property {number} price
     * @property {number} duration_minutes
     * @property {string} [created]
     * @property {string} category
     */

    const searchEndpoints = {
        name: ["searchName", "name"],
        description: ["searchDescription", "description"],
        duration: ["searchDuration", "duration_minutes"],
        price: ["searchPrice", "price"],
        category: ["searchCategory", "category"],
        created: ["searchCreated", "searchCreation"]
    };

    async function request(path, options = {}, expectedStatus = null) {
        const url = `${API_URL}${path}`;
        const requestOptions = {
            ...options,
            headers: options.body
                ? { "Content-Type": "application/json", ...options.headers }
                : options.headers
        };

        let response;
        try {
            response = await fetch(url, requestOptions);
        } catch {
            throw new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível.");
        }

        let data = null;
        const responseText = await response.text();

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {}
        }

        if (!response.ok || (expectedStatus !== null && response.status !== expectedStatus)) {
            const detail = data?.message || data?.error || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            const friendlyMessage = response.status === 404
                ? "Serviço não encontrado."
                : response.status >= 500
                    ? "O servidor encontrou um erro. Tente novamente mais tarde."
                    : detail;
            const error = new Error(friendlyMessage);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    // A API não expõe uma rota que lista todos os serviços (GET /service → 404)
    // e as buscas só retornam correspondências exatas. Como contorno, a lista é
    // montada combinando buscas por duração (múltiplos de 15 min até 4h) e por
    // categoria (as conhecidas + as descobertas nas buscas por duração).
    // Limitação: serviços com duração fora de múltiplos de 15 min E categoria
    // desconhecida não aparecem. Remover quando o backend tiver GET /service.
    const KNOWN_CATEGORIES = ["Cabelo", "Unhas", "Estética", "Maquiagem", "Depilação", "Sobrancelhas"];
    const DURATION_STEP = 15;
    const MAX_DURATION = 240;
    const CACHE_TTL_MS = 30000;
    let cachedList = null;
    let cachedAt = 0;

    function invalidateCache() {
        cachedList = null;
    }

    /** @returns {Promise<Service[]>} */
    function list() {
        if (!cachedList || Date.now() - cachedAt > CACHE_TTL_MS) {
            cachedAt = Date.now();
            cachedList = fetchAll().catch(error => {
                invalidateCache();
                throw error;
            });
        }
        return cachedList.then(services => [...services]);
    }

    async function fetchAll() {
        const services = new Map();
        const collect = group => group.forEach(service => services.set(Number(service.id), service));

        const durations = [];
        for (let minutes = DURATION_STEP; minutes <= MAX_DURATION; minutes += DURATION_STEP) {
            durations.push(minutes);
        }
        (await Promise.all([
            ...durations.map(minutes => search("duration", minutes)),
            ...KNOWN_CATEGORIES.map(category => search("category", category))
        ])).forEach(collect);

        // Categorias novas descobertas nas buscas por duração (ex.: "Relaxamento").
        const newCategories = new Set();
        services.forEach(service => {
            if (service.category && !KNOWN_CATEGORIES.includes(service.category)) newCategories.add(service.category);
        });
        (await Promise.all([...newCategories].map(category => search("category", category)))).forEach(collect);

        return [...services.values()].sort((a, b) => Number(a.id) - Number(b.id));
    }

    /** @param {keyof typeof searchEndpoints} type @param {string|number} value */
    function search(type, value) {
        const endpoint = searchEndpoints[type];

        if (!endpoint) {
            throw new Error("Tipo de busca de serviço inválido.");
        }

        return request(`/${endpoint[0]}?${endpoint[1]}=${encodeURIComponent(value)}`)
            .then(normalizeList)
            .catch(error => {
                if (error.status === 404) return [];
                throw error;
            });
    }

    /** @param {ServicePayload} payload @returns {Promise<Service|null>} */
    function create(payload) {
        invalidateCache();
        return request("/createServices", {
            method: "POST",
            body: JSON.stringify(payload)
        }, 201);
    }

    /** @param {Service} payload @returns {Promise<Service|null>} */
    function update(payload) {
        invalidateCache();
        return request("/updateServices", {
            method: "PUT",
            body: JSON.stringify(payload)
        }, 200);
    }

    /** @param {number} id @returns {Promise<null>} */
    function remove(id) {
        invalidateCache();
        return request(`/deleteServices?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        }, 204).catch(error => {
            if (error.status === 409 || error.status === 422 || error.status >= 500) {
                throw new Error("Não é possível excluir este serviço porque ele está vinculado a um agendamento.");
            }
            throw error;
        });
    }

    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (data && typeof data === "object" && ("id" in data || "name" in data)) return [data];
        return [];
    }

    window.serviceApi = { list, search, create, update, remove };
})();

// Nomes de clientes, serviços e profissionais e o expediente das profissionais,
// usados pelo mock para montar a lista de pagamentos e o relatório gerencial.
//
// - Modo offline: lê do banco em memória do próprio mock.
// - Modo híbrido: os cadastros são reais, então lê do backend, pelas mesmas
//   rotas que as telas usam. Se o backend não responder, o mock segue com
//   nomes genéricos ("Serviço 3"), como o próprio backend faz.

const CACHE_TTL_MS = 30000;
const SERVICE_DURATION_STEP = 15;
const SERVICE_MAX_DURATION = 240;
const KNOWN_CATEGORIES = ["Cabelo", "Unhas", "Estética", "Maquiagem", "Depilação", "Sobrancelhas"];
const LEGACY_SPECIALTIES = ["Cabeleireira", "Esteticista", "Manicure", "Maquiadora", "Depiladora", "Designer de Sobrancelhas"];

function localCatalog(store) {
    return {
        source: "mock",
        clients: async () => store.all("clients"),
        services: async () => store.all("services"),
        professionals: async () => store.all("professionals"),
        resources: async () => store.all("resources"),
        availability: async () => store.all("availability")
    };
}

function backendCatalog(backendUrl) {
    const base = backendUrl.replace(/\/+$/, "");
    const cache = new Map();

    async function getList(path) {
        let response;
        try {
            response = await fetch(`${base}${path}`);
        } catch {
            return [];
        }
        if (!response.ok) return [];
        const data = await response.json().catch(() => null);
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        return [];
    }

    function cached(key, load) {
        const entry = cache.get(key);
        if (entry && Date.now() - entry.at < CACHE_TTL_MS) return entry.promise;
        const promise = load().catch(() => []);
        cache.set(key, { at: Date.now(), promise });
        return promise;
    }

    function unique(lists) {
        const byId = new Map();
        lists.flat().forEach(item => { if (item && item.id !== undefined) byId.set(Number(item.id), item); });
        return [...byId.values()];
    }

    // Mesma estratégia do js/api/service-api.js: a API não tem rota que lista todos os serviços.
    async function loadServices() {
        const durations = [];
        for (let minutes = SERVICE_DURATION_STEP; minutes <= SERVICE_MAX_DURATION; minutes += SERVICE_DURATION_STEP) durations.push(minutes);
        return unique(await Promise.all([
            ...durations.map(minutes => getList(`/service/searchDuration?duration_minutes=${minutes}`)),
            ...KNOWN_CATEGORIES.map(category => getList(`/service/searchCategory?category=${encodeURIComponent(category)}`))
        ]));
    }

    // Mesma estratégia do js/api/professional-api.js: a busca por nome vazio não lista
    // todas; busca por especialidade (nome do serviço, categoria e especialidades antigas).
    async function loadProfessionals() {
        const services = await cached("services", loadServices);
        const specialties = new Set([
            ...services.map(service => service.name),
            ...services.map(service => service.category),
            ...LEGACY_SPECIALTIES
        ].filter(Boolean));
        return unique(await Promise.all([...specialties].map(specialty =>
            getList(`/searchSpecialty?specialty=${encodeURIComponent(specialty)}`))));
    }

    return {
        source: "backend",
        clients: () => cached("clients", () => getList("/searchNameClients?name=")),
        services: () => cached("services", loadServices),
        professionals: () => cached("professionals", loadProfessionals),
        resources: () => cached("resources", async () => unique(await Promise.all([
            getList("/searchActiveResources?active=true"),
            getList("/searchActiveResources?active=false")
        ]))),
        // O expediente não é usado pelas telas; sem ele a taxa de ocupação do relatório fica "sem expediente".
        availability: async () => [],
        /** Esquece o cache (ex.: depois de um cliente novo ser cadastrado no backend). */
        refresh: key => cache.delete(key)
    };
}

/** Funções de consulta por id, montadas sobre o catálogo. */
function namesFrom(catalog) {
    async function nameMap(loader) {
        const list = await loader();
        return new Map(list.map(item => [Number(item.id), item.name]));
    }
    return {
        clients: () => nameMap(catalog.clients),
        services: () => nameMap(catalog.services),
        professionals: () => nameMap(catalog.professionals)
    };
}

module.exports = { localCatalog, backendCatalog, namesFrom };

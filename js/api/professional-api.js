(function () {
    const searchEndpoints = {
        name: ["searchName", "name"],
        email: ["searchEmail", "email"],
        phone: ["searchPhone", "phone"],
        specialty: ["searchSpecialty", "specialty"],
        created: ["searchCreated", "created"]
    };

    async function request(path, options = {}) {
        const requestOptions = {
            ...options,
            headers: options.body
                ? { "Content-Type": "application/json", ...options.headers }
                : options.headers
        };

        let response;
        try {
            response = await fetch(`/api${path}`, requestOptions);
        } catch {
            throw new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível.");
        }

        const responseText = await response.text();
        let data = null;

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = responseText;
            }
        }

        if (!response.ok) {
            const detail = data?.message || data?.error || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            const friendlyMessage = response.status === 404
                ? "Profissional não encontrada."
                : response.status >= 500
                    ? "O servidor encontrou um erro. Tente novamente mais tarde."
                    : detail;
            const error = new Error(friendlyMessage);
            error.status = response.status;
            error.backendMessage = [data?.message, data?.description].filter(Boolean).join(" ");
            throw error;
        }

        return data;
    }

    function withoutPassword(professional) {
        if (!professional || typeof professional !== "object") return professional;
        const { password, senha, ...safeProfessional } = professional;
        return safeProfessional;
    }

    function normalizeList(data) {
        const items = Array.isArray(data)
            ? data
            : Array.isArray(data?.content)
                ? data.content
                : Array.isArray(data?.data)
                    ? data.data
                    : data && typeof data === "object" && ("id" in data || "name" in data)
                        ? [data]
                        : [];
        return items.map(withoutPassword);
    }

    // Especialidades usadas antes de a especialidade vir dos serviços cadastrados.
    // Continuam na busca para que profissionais antigos sigam aparecendo.
    const LEGACY_SPECIALTIES = [
        "Cabeleireira",
        "Esteticista",
        "Manicure",
        "Maquiadora",
        "Depiladora",
        "Designer de Sobrancelhas"
    ];

    function uniqueSorted(values) {
        const clean = values.map(value => String(value || "").trim()).filter(Boolean);
        return [...new Set(clean)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    // A especialidade é o NOME de um serviço cadastrado (GET /service/...).
    // Não há vínculo no banco: o valor é salvo como texto em "specialty".
    // Requer js/api/service-api.js carregado antes deste arquivo.
    // Retorna os serviços agrupados por categoria: [{ category, names: [...] }].
    async function specialtyGroups() {
        if (!window.serviceApi) return [];
        const services = await window.serviceApi.list();
        const byCategory = new Map();
        services.forEach(service => {
            const category = String(service.category || "").trim() || "Outros";
            if (!byCategory.has(category)) byCategory.set(category, []);
            byCategory.get(category).push(service.name);
        });
        return uniqueSorted([...byCategory.keys()])
            .map(category => ({ category, names: uniqueSorted(byCategory.get(category)) }))
            .filter(group => group.names.length);
    }

    // Lista simples com os nomes de todos os serviços.
    async function specialties() {
        const groups = await specialtyGroups();
        return uniqueSorted(groups.flatMap(group => group.names));
    }

    // Valores usados para encontrar profissionais: nomes dos serviços, categorias
    // (usadas numa versão anterior do cadastro) e as especialidades antigas.
    async function searchableSpecialties() {
        let groups = [];
        try {
            groups = await specialtyGroups();
        } catch {
            // Sem a lista de serviços, busca ao menos pelas especialidades antigas.
        }
        return [...new Set([
            ...groups.flatMap(group => group.names),
            ...groups.map(group => group.category),
            ...LEGACY_SPECIALTIES
        ])];
    }

    async function list() {
        const values = await searchableSpecialties();
        const groups = await Promise.all(values.map(specialty => search("specialty", specialty)));
        const professionals = new Map();
        groups.forEach(group => group.forEach(professional => {
            professionals.set(Number(professional.id), professional);
        }));
        return [...professionals.values()];
    }

    // O backend não tem busca por usuário nem por id: procura na listagem completa.
    async function findByUsername(username) {
        const wanted = String(username || "").trim().toLowerCase();
        if (!wanted) return null;
        const professionals = await list();
        return professionals.find(item => String(item.username || "").trim().toLowerCase() === wanted) || null;
    }

    async function findById(id) {
        const professionals = await list();
        return professionals.find(item => String(item.id) === String(id)) || null;
    }

    function search(type, value) {
        const endpoint = searchEndpoints[type];
        if (!endpoint) throw new Error("Tipo de busca de profissional inválido.");
        return request(`/${endpoint[0]}?${endpoint[1]}=${encodeURIComponent(value)}`)
            .then(normalizeList)
            .catch(error => {
                if (error.status === 422 && /find professional|not found/i.test(error.message)) return [];
                throw error;
            });
    }

    const saveErrorTranslations = [
        [/name is required/i, "O nome é obrigatório."],
        [/cpf must have 11 digits/i, "CPF deve ter 11 dígitos."],
        [/this cpf is already registered/i, "Já existe um profissional com este CPF."],
        [/this email is already registered/i, "Já existe um profissional com este e-mail."],
        [/username is already in use/i, "Este nome de usuário já está em uso."]
    ];

    function translateSaveError(error, fallback) {
        if (!error.status) return error; // erro de rede (fetch falhou)
        if (error.status === 502 || error.status === 503 || error.status === 504) {
            return Object.assign(new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível."), { status: error.status });
        }
        const text = error.backendMessage || error.message || "";
        const match = saveErrorTranslations.find(([pattern]) => pattern.test(text));
        return Object.assign(new Error(match ? match[1] : fallback), { status: error.status });
    }

    function create(payload) {
        const { id, created, updated, ...body } = payload || {};
        if (body.experienceYears !== undefined) body.experienceYears = parseInt(body.experienceYears, 10) || 0;
        return request("/createProfessionals", {
            method: "POST",
            body: JSON.stringify(body)
        }).then(withoutPassword).catch(error => {
            throw translateSaveError(error, "Não foi possível cadastrar o profissional. Tente novamente.");
        });
    }

    function update(payload) {
        return request("/updateProfessionals", {
            method: "PUT",
            body: JSON.stringify(payload)
        }).then(withoutPassword).catch(error => {
            throw translateSaveError(error, "Não foi possível atualizar o profissional. Tente novamente.");
        });
    }

    function remove(id) {
        return request(`/deleteProfessionals?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        }).catch(error => {
            if (error.status === 409 || error.status === 422 || error.status >= 500) {
                throw new Error("Não é possível excluir esta profissional porque ela está vinculada a um agendamento.");
            }
            throw error;
        });
    }

    window.professionalApi = { list, search, findByUsername, findById, create, update, remove, withoutPassword, specialties, specialtyGroups, searchableSpecialties };
})();

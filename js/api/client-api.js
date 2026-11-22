(function () {
    /**
     * @typedef {Object} Client
     * @property {number} id
     * @property {string} name
     * @property {string} phone
     * @property {string} [email]
     * @property {string} [created]
     * @property {string} [createdAt]
     * @property {string} [created_at]
     */

    /**
     * @typedef {Object} ClientPayload
     * @property {number} [id]
     * @property {string} name
     * @property {string} phone
     * @property {string} [email]
     */

    /**
     * @typedef {Object} ClientExportData
     * @property {number} id
     * @property {string} name
     * @property {string} phone
     * @property {string} [email]
     * @property {string} [created]
     * @property {Object} [appointments]
     */

    const searchEndpoints = {
        name: ["searchNameClients", "name"],
        phone: ["searchPhoneClients", "phone"],
        email: ["searchEmailClients", "email"],
        created: ["searchCreatedClients", "created"]
    };

    async function request(path, options = {}) {
        let response;
        try {
            response = await fetch(`/api${path}`, {
                ...options,
                headers: options.body
                    ? { "Content-Type": "application/json", ...options.headers }
                    : options.headers
            });
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
            const detail = data?.message || data?.error || data?.detail;
            let message = detail || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            if (response.status === 404) message = "Cliente não encontrado.";
            else if (response.status === 409) {
                const conflictText = `${detail || ""}`.toLowerCase();
                message = /telefone|phone|duplic|cadastrad/.test(conflictText)
                    ? "Este telefone já está cadastrado."
                    : /agendamento|appointment/.test(conflictText)
                        ? "Não é possível excluir este cliente porque ele possui agendamentos."
                        : "Não foi possível concluir a operação. O telefone pode já estar cadastrado ou o cliente possui agendamentos.";
            }
            else if (response.status === 422 || response.status === 400) message = detail || "Erro de validação. Confira os dados informados.";
            else if (response.status >= 500) message = "O servidor encontrou um erro. Tente novamente mais tarde.";

            const error = new Error(message);
            error.status = response.status;
            throw error;
        }
        return data;
    }

    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (data && typeof data === "object" && ("id" in data || "name" in data)) return [data];
        return [];
    }

    /** @returns {Promise<Client[]>} */
    function list() {
        // The API does not expose a root list route. An empty name search
        // is the confirmed route that returns the existing client set.
        return search("name", "");
    }

    /** @param {"name"|"phone"|"email"|"created"} type @param {string} value */
    function search(type, value) {
        const endpoint = searchEndpoints[type];
        if (!endpoint) throw new Error("Tipo de busca de cliente inválido.");
        return request(`/${endpoint[0]}?${endpoint[1]}=${encodeURIComponent(value)}`)
            .then(normalizeList)
            .catch(error => {
                if (error.status === 404) return [];
                throw error;
            });
    }

    /** @param {ClientPayload} payload */
    function create(payload) {
        return request("/createClients", { method: "POST", body: JSON.stringify(payload) });
    }

    /** @param {Client} payload */
    function update(payload) {
        return request("/updateClients", { method: "PUT", body: JSON.stringify(payload) });
    }

    /** @param {number} id */
    function remove(id) {
        return request(`/deleteClients?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(error => {
            const text = `${error.message || ""} `.toLowerCase();
            if (error.status === 409 || /agendament|appointment/.test(text)) {
                throw new Error("Não é possível excluir este cliente porque ele possui agendamentos.");
            }
            if (/telefone|phone|duplic|cadastrad/.test(text)) {
                throw new Error("Este telefone já está cadastrado.");
            }
            throw error;
        });
    }

    /** @param {number} id @returns {Promise<Blob>} */
    async function exportData(id) {
        let response;
        try {
            response = await fetch(`/api/exportClientsData?id=${encodeURIComponent(id)}`);
        } catch {
            throw new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível.");
        }
        if (!response.ok) {
            if (response.status === 404) throw new Error("Cliente não encontrado.");
            throw new Error(response.status >= 500
                ? "O servidor encontrou um erro. Tente novamente mais tarde."
                : "Não foi possível exportar os dados do cliente.");
        }
        return response.blob();
    }

    /** @param {number} id */
    function anonymize(id) {
        return request(`/anonymizeClients?id=${encodeURIComponent(id)}`, { method: "PUT" }).catch(error => {
            if (error.status === 404) throw new Error("Cliente não encontrado.");
            throw error;
        });
    }

    window.clientApi = { list, search, create, update, remove, exportData, anonymize };
})();

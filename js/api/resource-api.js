(function () {
    /**
     * @typedef {Object} Resource
     * @property {number} id
     * @property {string} name
     * @property {string} type
     * @property {boolean} active
     */

    /**
     * @typedef {Object} ResourcePayload
     * @property {number} [id]
     * @property {string} name
     * @property {string} type
     * @property {boolean} active
     */

    const searchEndpoints = {
        name: ["searchNameResources", "name"],
        type: ["searchTypeResources", "type"],
        active: ["searchActiveResources", "active"]
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
            const message = response.status === 422
                ? detail || "Não foi possível realizar a operação. Confira os dados do recurso e tente novamente."
                : response.status >= 500
                    ? "O servidor encontrou um erro. Tente novamente mais tarde."
                    : detail || `Não foi possível concluir a operação (HTTP ${response.status}).`;
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

    /** @param {"name"|"type"|"active"} type @param {string} value */
    function search(type, value) {
        const endpoint = searchEndpoints[type];
        if (!endpoint) throw new Error("Tipo de busca de recurso inválido.");
        return request(`/${endpoint[0]}?${endpoint[1]}=${encodeURIComponent(value)}`)
            .then(normalizeList);
    }

    /** @param {ResourcePayload} payload */
    function create(payload) {
        return request("/createResources", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    /** @param {Resource} payload */
    function update(payload) {
        return request("/updateResources", {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    /** @param {number} id */
    function remove(id) {
        return request(`/deleteResources?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(error => {
            if (error.status === 409 || error.status === 422 || error.status >= 500) {
                throw new Error("Não é possível excluir este recurso porque ele está vinculado a um agendamento.");
            }
            throw error;
        });
    }

    window.resourceApi = { search, create, update, remove };
})();

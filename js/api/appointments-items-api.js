(function () {
    const API_URL = "/api/appointmentsItems";

    /**
     * @typedef {Object} AppointmentsItem
     * @property {number} [id]
     * @property {number} appointment_id
     * @property {number} service_id
     * @property {number} professional_id
     * @property {number} resource_id
     * @property {string} start_at
     * @property {string} end_at
     * @property {number} price
     */

    /**
     * @typedef {Omit<AppointmentsItem, "id">} AppointmentsItemCreatePayload
     */

    // Todos são obrigatórios no backend (sem algum deles: 422 "Erro: Campo não preenchido").
    const REQUIRED_FIELDS = {
        appointment_id: "agendamento",
        service_id: "serviço",
        professional_id: "profissional",
        resource_id: "recurso",
        start_at: "início",
        end_at: "término",
        price: "preço"
    };

    /** @param {string} path @param {RequestInit} [options] */
    async function request(path, options = {}) {
        const requestOptions = {
            ...options,
            headers: options.body
                ? { "Content-Type": "application/json", ...options.headers }
                : options.headers
        };

        let response;
        try {
            response = await fetch(`${API_URL}${path}`, requestOptions);
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
            const detail = typeof data === "string"
                ? data
                : data?.message || data?.error || data?.detail;
            const message = response.status >= 500
                ? "O servidor encontrou um erro. Tente novamente mais tarde."
                : detail || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    /** @param {unknown} data @returns {AppointmentsItem[]} */
    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (data && typeof data === "object" && "appointment_id" in data) return [data];
        return [];
    }

    /** @param {Partial<AppointmentsItem>} payload */
    function validate(payload) {
        const missing = Object.keys(REQUIRED_FIELDS).filter(key => {
            const value = payload?.[key];
            if (value === undefined || value === null || value === "") return true;
            if (key === "price") return !Number.isFinite(Number(value)) || Number(value) < 0;
            if (key.endsWith("_id")) return !Number.isInteger(Number(value)) || Number(value) <= 0;
            return false;
        });
        if (missing.length) {
            return `Preencha corretamente: ${missing.map(key => REQUIRED_FIELDS[key]).join(", ")}.`;
        }
        return "";
    }

    /** @param {AppointmentsItemCreatePayload} payload */
    function create(payload) {
        const { id, ...createPayload } = payload || {};
        const error = validate(createPayload);
        if (error) return Promise.reject(new Error(error));
        return request("/createAppointmentsItems", {
            method: "POST",
            body: JSON.stringify(createPayload)
        });
    }

    /** @param {AppointmentsItem} payload Corpo completo, com id. */
    function update(payload) {
        if (!Number.isInteger(Number(payload?.id)) || Number(payload.id) <= 0) {
            return Promise.reject(new Error("O identificador do item é obrigatório."));
        }
        const error = validate(payload);
        if (error) return Promise.reject(new Error(error));
        return request("/updateAppointmentsItems", {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    /** @param {number} id */
    function remove(id) {
        return request(`/deleteAppointmentsItems?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
    }

    // Não existe rota que lista todos os itens. Para ver os itens de um agendamento,
    // use appointment.items (as buscas de agendamentos já devolvem os itens).

    /** Busca exata. @param {string} endAt ISO com fuso @returns {Promise<AppointmentsItem[]>} */
    function searchEndDate(endAt) {
        return search(`/searchEndDate?end_at=${encodeURIComponent(endAt)}`);
    }

    /** Busca exata. @param {string} startAt ISO com fuso @returns {Promise<AppointmentsItem[]>} */
    function searchStartDate(startAt) {
        return search(`/searchStartDate?start_at=${encodeURIComponent(startAt)}`);
    }

    /** Busca exata. @param {number} price @returns {Promise<AppointmentsItem[]>} */
    function searchPrice(price) {
        return search(`/searchPrice?price=${encodeURIComponent(price)}`);
    }

    /** @param {string} path @returns {Promise<AppointmentsItem[]>} */
    function search(path) {
        return request(path).then(normalizeList).catch(error => {
            if (error.status === 404) return [];
            throw error;
        });
    }

    window.appointmentsItemsApi = {
        create,
        update,
        remove,
        validate,
        searchEndDate,
        searchStartDate,
        searchPrice
    };
})();

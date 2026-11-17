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
                : data?.message || data?.error || data?.detail || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            const error = new Error(detail);
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

    /** @param {AppointmentsItemCreatePayload} payload */
    function create(payload) {
        const { id, ...createPayload } = payload;
        return request("/createAppointmentsItems", {
            method: "POST",
            body: JSON.stringify(createPayload)
        });
    }

    /** @param {AppointmentsItem} payload */
    function update(payload) {
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

    /** @returns {Promise<AppointmentsItem[]>} */
    function list() {
        return request("").then(normalizeList).catch(error => {
            if (error.status === 404) return [];
            throw error;
        });
    }

    /** @param {string} endAt @returns {Promise<AppointmentsItem[]>} */
    function searchEndDate(endAt) {
        return search(`/searchEndDate?end_at=${encodeURIComponent(endAt)}`);
    }

    /** @param {string} startAt @returns {Promise<AppointmentsItem[]>} */
    function searchStartDate(startAt) {
        return search(`/searchStartDate?start_at=${encodeURIComponent(startAt)}`);
    }

    /** @param {number} price @returns {Promise<AppointmentsItem[]>} */
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
        list,
        create,
        update,
        remove,
        searchEndDate,
        searchStartDate,
        searchPrice
    };
})();

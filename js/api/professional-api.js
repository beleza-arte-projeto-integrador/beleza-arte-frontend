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

    function list() {
        return request("").then(normalizeList);
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

    function create(payload) {
        return request("/createProfessionals", {
            method: "POST",
            body: JSON.stringify(payload)
        }).then(withoutPassword);
    }

    function update(payload) {
        return request("/updateProfessionals", {
            method: "PUT",
            body: JSON.stringify(payload)
        }).then(withoutPassword);
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

    window.professionalApi = { list, search, create, update, remove, withoutPassword };
})();

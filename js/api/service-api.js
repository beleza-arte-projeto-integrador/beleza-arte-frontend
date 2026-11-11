(function () {
    const API_URL = "/api/service";
    const searchEndpoints = {
        name: ["searchName", "name"],
        description: ["searchDescription", "description"],
        duration: ["searchDuration", "duration_minutes"],
        price: ["searchPrice", "price"],
        category: ["searchCategory", "category"],
        created: ["searchCreated", "searchCreation"]
    };

    async function request(path, options = {}) {
        const method = options.method || "GET";
        const url = `${API_URL}${path}`;
        const requestOptions = {
            ...options,
            headers: options.body
                ? { "Content-Type": "application/json", ...options.headers }
                : options.headers
        };

        console.groupCollapsed(`[Services API] ${method} ${url}`);
        console.log("Requisição enviada:", {
            method,
            url,
            body: options.body ? JSON.parse(options.body) : undefined
        });

        let response;
        try {
            response = await fetch(url, requestOptions);
        } catch (error) {
            console.error("[Services API] Falha de conexão:", error);
            console.groupEnd();
            throw new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível.");
        }

        let data = null;
        const responseText = await response.text();

        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch (error) {
                console.warn("[Services API] Resposta não JSON:", responseText);
            }
        }

        console.log("Resposta recebida:", {
            status: response.status,
            ok: response.ok,
            data,
            raw: responseText
        });

        if (!response.ok) {
            const detail = data?.message || data?.error || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            const friendlyMessage = response.status === 404
                ? "Serviço não encontrado."
                : response.status >= 500
                    ? "O servidor encontrou um erro. Tente novamente mais tarde."
                    : detail;
            console.error("[Services API] Erro HTTP:", friendlyMessage);
            console.groupEnd();
            throw new Error(friendlyMessage);
        }

        console.log("[Services API] Operação concluída com sucesso.");
        console.groupEnd();
        return data;
    }

    function list() {
        return request("");
    }

    function search(type, value) {
        const endpoint = searchEndpoints[type];

        if (!endpoint) {
            throw new Error("Tipo de busca de serviço inválido.");
        }

        return request(`/${endpoint[0]}?${endpoint[1]}=${encodeURIComponent(value)}`);
    }

    function create(payload) {
        return request("/createServices", {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    function update(payload) {
        return request("/updateServices", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    function remove(id) {
        return request(`/deleteServices?id=${encodeURIComponent(id)}`, {
            method: "DELETE"
        });
    }

    window.serviceApi = { list, search, create, update, remove };
})();

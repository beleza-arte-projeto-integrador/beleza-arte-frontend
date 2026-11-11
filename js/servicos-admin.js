document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("service-form-card");
    const form = document.getElementById("service-form");
    const list = document.getElementById("service-list");
    const message = document.getElementById("service-message");
    const loading = document.getElementById("service-loading");
    const count = document.getElementById("service-count");
    const queryInput = document.getElementById("service-query");
    const filterInput = document.getElementById("service-filter");
    const saveButton = document.getElementById("save-service");
    let services = [];

    const fields = {
        id: document.getElementById("service-id"),
        name: document.getElementById("service-name"),
        description: document.getElementById("service-description"),
        price: document.getElementById("service-price"),
        duration_minutes: document.getElementById("service-duration"),
        created: document.getElementById("service-created"),
        category: document.getElementById("service-category")
    };

    function showMessage(text, type = "info") { message.textContent = text; message.className = `service-message ${type}`; }
    function setLoading(active) { loading.hidden = !active; document.querySelectorAll(".service-actions button, #novo-servico, #clear-filter").forEach(button => { button.disabled = active; }); }
    function asArray(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (data && typeof data === "object" && ("id" in data || "name" in data)) return [data];
        return [];
    }
    function formatPrice(value) { return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
    }
    function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
    function render() {
        count.textContent = `${services.length} serviço${services.length === 1 ? "" : "s"} encontrado${services.length === 1 ? "" : "s"}`;
        if (!services.length) {
            list.innerHTML = `<div class="empty-services"><strong>${queryInput.value.trim() ? "Nenhum serviço encontrado" : "Use a busca para consultar serviços"}</strong><span>${queryInput.value.trim() ? "Altere os filtros ou cadastre um novo serviço." : "O backend ainda não possui uma listagem geral. Selecione um filtro e pesquise."}</span></div>`;
            return;
        }
        list.innerHTML = services.map(service => `<div class="service-table service-row">
            <div><strong>${escapeHtml(service.name)}</strong><small>${escapeHtml(service.description)}</small></div>
            <span class="service-category">${escapeHtml(service.category)}</span>
            <span class="service-price">${formatPrice(service.price)}</span>
            <span class="service-duration">${escapeHtml(service.duration_minutes)} min</span>
            <span class="service-created">${formatDate(service.created)}</span>
            <div class="service-actions"><button type="button" data-action="edit" data-id="${escapeHtml(service.id)}">EDITAR</button><button type="button" class="delete-service" data-action="delete" data-id="${escapeHtml(service.id)}">EXCLUIR</button></div>
        </div>`).join("");
    }
    async function loadServices() {
        setLoading(true);
        try {
            const query = queryInput.value.trim();
            const filter = filterInput.value;
            if (!query) {
                services = [];
                render();
                showMessage("Selecione um filtro e informe um valor para consultar os serviços.", "info");
                return;
            }
            if (filter === "all") {
                services = [];
                render();
                showMessage("Selecione um campo específico para realizar a busca.", "info");
                return;
            }
            services = asArray(await serviceApi.search(filter, query));
            render();
            if (query && !services.length) showMessage("Nenhum serviço encontrado para essa busca.", "info");
            else message.className = "service-message";
        } catch (error) {
            services = [];
            render();
            showMessage(error.message || "Não foi possível carregar os serviços.", "error");
        } finally { setLoading(false); }
    }
    function localDateTimeValue(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }
    function openForm(service = null) {
        form.reset();
        document.querySelectorAll("[data-error-for]").forEach(error => error.textContent = "");
        fields.id.value = service?.id || "";
        Object.keys(fields).filter(key => key !== "id").forEach(key => { fields[key].value = service ? (key === "created" ? localDateTimeValue(service[key]) : service[key] ?? "") : ""; });
        if (!service) fields.created.value = localDateTimeValue(new Date().toISOString());
        document.getElementById("service-form-title").textContent = service ? "Editar serviço" : "Novo serviço";
        formCard.hidden = false;
        fields.name.focus();
    }
    function closeForm() { formCard.hidden = true; }
    function validate() {
        let valid = true;
        const required = ["name", "description", "price", "duration_minutes", "created", "category"];
        required.forEach(key => {
            const field = fields[key];
            const invalid = !String(field.value).trim() || (key === "price" && Number(field.value) < 0) || (key === "duration_minutes" && (!Number.isInteger(Number(field.value)) || Number(field.value) <= 0));
            const error = document.querySelector(`[data-error-for="${key}"]`);
            error.textContent = invalid ? (key === "duration_minutes" ? "Informe uma duração inteira maior que zero." : "Este campo é obrigatório.") : "";
            field.classList.toggle("invalido", invalid);
            valid = valid && !invalid;
        });
        return valid;
    }
    function payload() {
        const value = { name: fields.name.value.trim(), description: fields.description.value.trim(), price: Number(fields.price.value), duration_minutes: Number(fields.duration_minutes.value), created: new Date(fields.created.value).toISOString(), category: fields.category.value.trim() };
        if (fields.id.value) value.id = Number(fields.id.value);
        return value;
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) { showMessage("Revise os campos obrigatórios.", "error"); return; }
        saveButton.disabled = true;
        try {
            const editing = Boolean(fields.id.value);
            await (editing ? serviceApi.update(payload()) : serviceApi.create(payload()));
            closeForm();
            showMessage(editing ? "Serviço atualizado com sucesso." : "Serviço cadastrado com sucesso.", "success");
            await loadServices();
        } catch (error) { showMessage(error.message || "Não foi possível salvar o serviço.", "error"); }
        finally { saveButton.disabled = false; }
    });
    document.getElementById("novo-servico").addEventListener("click", () => openForm());
    document.getElementById("cancel-service").addEventListener("click", closeForm);
    document.getElementById("cancel-service-bottom").addEventListener("click", closeForm);
    document.getElementById("clear-filter").addEventListener("click", () => { queryInput.value = ""; filterInput.value = "all"; loadServices(); });
    queryInput.addEventListener("search", loadServices);
    queryInput.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); loadServices(); } });
    filterInput.addEventListener("change", () => { if (queryInput.value.trim()) loadServices(); });
    list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const service = services.find(item => String(item.id) === button.dataset.id);
        if (button.dataset.action === "edit" && service) openForm(service);
        if (button.dataset.action === "delete" && service && window.confirm(`Excluir o serviço "${service.name}"?`)) {
            setLoading(true);
            try { await serviceApi.remove(service.id); showMessage("Serviço excluído com sucesso.", "success"); await loadServices(); }
            catch (error) { showMessage(error.message || "Não foi possível excluir o serviço.", "error"); setLoading(false); }
        }
    });
    loadServices();
});

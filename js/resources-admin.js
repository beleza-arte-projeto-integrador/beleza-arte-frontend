document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("resource-form-card");
    const form = document.getElementById("resource-form");
    const list = document.getElementById("resource-list");
    const loading = document.getElementById("resource-loading");
    const count = document.getElementById("resource-count");
    const searchForm = document.getElementById("resource-search-form");
    const filterType = document.getElementById("resource-filter-type");
    const filterValue = document.getElementById("resource-filter-value");
    const activeValue = document.getElementById("resource-active-value");
    const notifications = document.getElementById("resource-notifications");
    const deleteModal = document.getElementById("resource-delete-modal");
    const deleteName = document.getElementById("resource-delete-name");
    const confirmDelete = document.getElementById("confirm-delete-resource");
    const fields = { id: document.getElementById("resource-id"), name: document.getElementById("resource-name"), type: document.getElementById("resource-type"), active: document.getElementById("resource-active") };
    let resources = [];
    let pendingDeletion = null;
    let activeSearch = null;

    function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
    function showMessage(text, type = "info") {
        const titles = { success: "Tudo certo", error: "Algo deu errado", info: "Aviso" };
        const icons = { success: "✓", error: "!", info: "i" };
        const notification = document.createElement("div");
        notification.className = `service-notification ${type}`;
        notification.innerHTML = `<span class="service-notification-icon">${icons[type]}</span><span class="service-notification-content"><strong class="service-notification-title">${titles[type]}</strong><span class="service-notification-text">${escapeHtml(text)}</span></span><button class="service-notification-close" type="button" aria-label="Fechar notificação">×</button>`;
        notification.querySelector("button").addEventListener("click", () => notification.remove());
        notifications.appendChild(notification);
        window.setTimeout(() => notification.remove(), type === "error" ? 7000 : 4500);
    }
    function setLoading(value) { loading.hidden = !value; document.querySelectorAll(".resource-toolbar button, #new-resource, #resource-form button").forEach(button => { button.disabled = value; }); }
    function render() {
        count.textContent = `${resources.length} recurso${resources.length === 1 ? "" : "s"} encontrado${resources.length === 1 ? "" : "s"}`;
        if (!resources.length) { list.innerHTML = `<div class="empty-services"><strong>Nenhum recurso encontrado</strong><span>Altere os filtros ou cadastre um novo recurso.</span></div>`; return; }
        list.innerHTML = resources.map(resource => `<div class="resource-table resource-row"><strong>${escapeHtml(resource.name)}</strong><span>${escapeHtml(resource.type)}</span><span class="resource-status ${resource.active ? "active" : "inactive"}">${resource.active ? "Ativo" : "Inativo"}</span><div class="resource-actions"><button type="button" data-action="edit" data-id="${escapeHtml(resource.id)}">EDITAR</button><button type="button" class="delete-service" data-action="delete" data-id="${escapeHtml(resource.id)}">EXCLUIR</button></div></div>`).join("");
    }
    function updateFilterInput() {
        const isActive = filterType.value === "active";
        activeValue.hidden = !isActive;
        filterValue.hidden = isActive;
        filterValue.required = !isActive;
        filterValue.placeholder = filterType.value === "name" ? "Informe o nome" : "Informe o tipo";
    }
    async function loadResources(search = activeSearch) {
        if (!search || !String(search.value).trim()) {
            count.textContent = "Informe um filtro para buscar recursos.";
            list.innerHTML = "";
            return;
        }
        setLoading(true);
        try {
            resources = await resourceApi.search(search.type, search.value);
            render();
        } catch (error) { resources = []; render(); showMessage(error.message || "Não foi possível carregar os recursos.", "error"); }
        finally { setLoading(false); }
    }
    function openForm(resource) {
        form.reset();
        document.querySelectorAll("[data-error-for]").forEach(error => error.textContent = "");
        fields.id.value = resource?.id || "";
        fields.name.value = resource?.name || "";
        fields.type.value = resource?.type || "";
        fields.active.value = resource ? String(resource.active) : "";
        document.getElementById("resource-form-title").textContent = resource ? "Editar recurso" : "Novo recurso";
        formCard.hidden = false;
        fields.name.focus();
    }
    function closeForm() { formCard.hidden = true; }
    function validate() {
        let valid = true;
        ["name", "type", "active"].forEach(key => {
            const invalid = !String(fields[key].value).trim();
            document.querySelector(`[data-error-for="${key}"]`).textContent = invalid ? "Este campo é obrigatório." : "";
            fields[key].classList.toggle("invalido", invalid);
            valid = valid && !invalid;
        });
        return valid;
    }
    function openDelete(resource) { pendingDeletion = resource; deleteName.textContent = resource.name; deleteModal.hidden = false; confirmDelete.focus(); }
    function closeDelete() { deleteModal.hidden = true; pendingDeletion = null; }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) { showMessage("Revise os campos obrigatórios.", "error"); return; }
        const editing = Boolean(fields.id.value);
        const payload = { name: fields.name.value.trim(), type: fields.type.value.trim(), active: fields.active.value === "true" };
        if (editing) payload.id = Number(fields.id.value);
        try {
            await (editing ? resourceApi.update(payload) : resourceApi.create(payload));
            closeForm();
            showMessage(editing ? "Recurso atualizado com sucesso." : "Recurso cadastrado com sucesso.", "success");
            await loadResources();
        } catch (error) { showMessage(error.message || "Não foi possível salvar o recurso.", "error"); }
    });
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        const value = filterType.value === "active" ? activeValue.value : filterValue.value.trim();
        if (!value) {
            showMessage("Informe um valor para buscar recursos.", "error");
            return;
        }
        activeSearch = { type: filterType.value, value };
        loadResources();
    });
    filterType.addEventListener("change", updateFilterInput);
    document.getElementById("new-resource").addEventListener("click", () => openForm());
    document.getElementById("cancel-resource").addEventListener("click", closeForm);
    document.getElementById("cancel-resource-bottom").addEventListener("click", closeForm);
    list.addEventListener("click", event => { const button = event.target.closest("button[data-action]"); if (!button) return; const resource = resources.find(item => String(item.id) === button.dataset.id); if (!resource) return; if (button.dataset.action === "edit") openForm(resource); else openDelete(resource); });
    document.querySelectorAll("[data-close-resource-delete]").forEach(button => button.addEventListener("click", closeDelete));
    confirmDelete.addEventListener("click", async () => { if (!pendingDeletion) return; const resource = pendingDeletion; closeDelete(); setLoading(true); try { await resourceApi.remove(resource.id); showMessage("Recurso excluído com sucesso.", "success"); await loadResources(); } catch (error) { showMessage(error.message || "Não foi possível excluir o recurso.", "error"); setLoading(false); } });
    updateFilterInput();
});

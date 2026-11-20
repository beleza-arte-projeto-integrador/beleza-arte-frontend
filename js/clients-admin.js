document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("client-form-card");
    const form = document.getElementById("client-form");
    const list = document.getElementById("client-list");
    const loading = document.getElementById("client-loading");
    const count = document.getElementById("client-count");
    const errorBox = document.getElementById("client-error");
    const searchForm = document.getElementById("client-search-form");
    const filterType = document.getElementById("client-filter-type");
    const filterValue = document.getElementById("client-filter-value");
    const createdValue = document.getElementById("client-created-value");
    const textSearch = document.getElementById("client-text-search");
    const notifications = document.getElementById("client-notifications");
    const deleteModal = document.getElementById("client-delete-modal");
    const deleteName = document.getElementById("client-delete-name");
    const confirmDelete = document.getElementById("confirm-delete-client");
    const anonymizeModal = document.getElementById("client-anonymize-modal");
    const anonymizeName = document.getElementById("client-anonymize-name");
    const confirmAnonymize = document.getElementById("confirm-anonymize-client");
    const fields = { id: document.getElementById("client-id"), name: document.getElementById("client-name"), phone: document.getElementById("client-phone"), email: document.getElementById("client-email") };
    let clients = [];
    let pendingDeletion = null;
    let pendingAnonymization = null;
    let activeSearch = null;

    function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }
    function normalizePhone(value) { return String(value || "").replace(/\D/g, "").slice(0, 11); }
    function formatPhone(value) {
        const digits = normalizePhone(value);
        if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return digits;
    }
    function formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
    }
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
    function setLoading(value) {
        loading.hidden = !value;
        document.querySelectorAll(".client-toolbar button, #new-client, #client-form button").forEach(button => { button.disabled = value; });
    }
    function render() {
        errorBox.hidden = true;
        count.textContent = `${clients.length} cliente${clients.length === 1 ? "" : "s"} encontrado${clients.length === 1 ? "" : "s"}`;
        if (!clients.length) {
            list.innerHTML = `<div class="empty-client"><strong>Nenhum cliente encontrado</strong><span>Altere os filtros ou cadastre um novo cliente.</span></div>`;
            return;
        }
        list.innerHTML = clients.map(client => {
            const created = client.created || client.createdAt || client.created_at;
            return `<div class="client-table client-row"><strong>${escapeHtml(client.name)}</strong><span>${escapeHtml(formatPhone(client.phone))}</span><span>${escapeHtml(client.email || "—")}</span><span>${escapeHtml(formatDate(created))}</span><div class="client-actions"><button type="button" data-action="edit" data-id="${escapeHtml(client.id)}">EDITAR</button><button type="button" class="export-client" data-action="export" data-id="${escapeHtml(client.id)}">EXPORTAR LGPD</button><button type="button" class="anonymize-client" data-action="anonymize" data-id="${escapeHtml(client.id)}">ANONIMIZAR</button><button type="button" class="delete-client" data-action="delete" data-id="${escapeHtml(client.id)}">EXCLUIR</button></div></div>`;
        }).join("");
    }
    function updateFilterInput() {
        const isCreated = filterType.value === "created";
        textSearch.hidden = isCreated;
        createdValue.hidden = !isCreated;
        filterValue.placeholder = filterType.value === "name" ? "Informe o nome" : filterType.value === "phone" ? "Informe o telefone" : "Informe o e-mail";
    }
    async function loadClients(search = activeSearch) {
        setLoading(true);
        try {
            clients = search ? await clientApi.search(search.type, search.value) : await clientApi.list();
            render();
        } catch (error) {
            clients = [];
            count.textContent = "Não foi possível carregar os clientes.";
            list.innerHTML = "";
            errorBox.textContent = error.message || "Não foi possível carregar os clientes.";
            errorBox.hidden = false;
            showMessage(error.message || "Não foi possível carregar os clientes.", "error");
        } finally { setLoading(false); }
    }
    function openForm(client) {
        form.reset();
        document.querySelectorAll("[data-error-for]").forEach(error => error.textContent = "");
        fields.id.value = client?.id || "";
        fields.name.value = client?.name || "";
        fields.phone.value = client ? formatPhone(client.phone) : "";
        fields.email.value = client?.email || "";
        document.getElementById("client-form-title").textContent = client ? "Editar cliente" : "Novo cliente";
        formCard.hidden = false;
        fields.name.focus();
    }
    function closeForm() { formCard.hidden = true; }
    function validate() {
        let valid = true;
        const nameInvalid = !fields.name.value.trim();
        const normalizedPhone = normalizePhone(fields.phone.value);
        const phoneInvalid = !normalizedPhone;
        const email = fields.email.value.trim();
        const emailInvalid = Boolean(email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const errors = { name: nameInvalid ? "O nome é obrigatório." : "", phone: phoneInvalid ? "O telefone é obrigatório." : "", email: emailInvalid ? "Informe um e-mail válido." : "" };
        Object.entries(errors).forEach(([key, text]) => {
            document.querySelector(`[data-error-for="${key}"]`).textContent = text;
            fields[key].classList.toggle("invalido", Boolean(text));
        });
        valid = !nameInvalid && !phoneInvalid && !emailInvalid;
        return valid;
    }
    function openDelete(client) { pendingDeletion = client; deleteName.textContent = client.name; deleteModal.hidden = false; confirmDelete.focus(); }
    function closeDelete() { deleteModal.hidden = true; pendingDeletion = null; }
    function openAnonymize(client) { pendingAnonymization = client; anonymizeName.textContent = client.name; anonymizeModal.hidden = false; confirmAnonymize.focus(); }
    function closeAnonymize() { anonymizeModal.hidden = true; pendingAnonymization = null; }
    fields.phone.addEventListener("input", () => {
        const raw = fields.phone.value;
        const start = fields.phone.selectionStart;
        // Quantidade de dígitos antes do cursor: a máscara adiciona/remove "(", ")", " " e "-",
        // então a posição do cursor precisa ser recalculada com base nos dígitos, não nos caracteres.
        const digitsBeforeCursor = start === null ? null : raw.slice(0, start).replace(/\D/g, "").length;
        const formatted = formatPhone(raw);
        fields.phone.value = formatted;
        if (digitsBeforeCursor === null) return;
        let position = 0;
        let seen = 0;
        while (position < formatted.length && seen < digitsBeforeCursor) {
            if (/\d/.test(formatted[position])) seen++;
            position++;
        }
        fields.phone.setSelectionRange(position, position);
    });
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) { showMessage("Revise os campos obrigatórios e o formato do e-mail.", "error"); return; }
        const editing = Boolean(fields.id.value);
        const payload = { name: fields.name.value.trim(), phone: normalizePhone(fields.phone.value), email: fields.email.value.trim() };
        if (editing) payload.id = Number(fields.id.value);
        setLoading(true);
        try {
            await (editing ? clientApi.update(payload) : clientApi.create(payload));
            closeForm();
            showMessage(editing ? "Cliente atualizado com sucesso." : "Cliente cadastrado com sucesso.", "success");
            await loadClients(activeSearch);
        } catch (error) {
            showMessage(error.status === 422 ? (error.message || "Erro de validação.") : (error.message || "Não foi possível salvar o cliente."), "error");
            setLoading(false);
        }
    });
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        const value = filterType.value === "created" ? createdValue.value : filterValue.value.trim();
        if (!value) { showMessage("Informe um valor para buscar clientes.", "error"); return; }
        let searchValue = value;
        if (filterType.value === "phone") searchValue = normalizePhone(value);
        if (filterType.value === "created") searchValue = value.length === 16 ? `${value}:00` : value;
        activeSearch = { type: filterType.value, value: searchValue };
        loadClients();
    });
    document.getElementById("clear-client-search").addEventListener("click", () => { activeSearch = null; filterValue.value = ""; createdValue.value = ""; loadClients(); });
    filterType.addEventListener("change", updateFilterInput);
    document.getElementById("new-client").addEventListener("click", () => openForm());
    document.getElementById("cancel-client").addEventListener("click", closeForm);
    document.getElementById("cancel-client-bottom").addEventListener("click", closeForm);
    list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const client = clients.find(item => String(item.id) === button.dataset.id);
        if (!client) return;
        if (button.dataset.action === "edit") openForm(client);
        else if (button.dataset.action === "delete") openDelete(client);
        else if (button.dataset.action === "anonymize") openAnonymize(client);
        else {
            try {
                const blob = await clientApi.exportData(client.id);
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `dados-cliente-${client.id}.json`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
                showMessage("Dados exportados conforme solicitado pela LGPD.", "success");
            } catch (error) { showMessage(error.message || "Não foi possível exportar os dados.", "error"); }
        }
    });
    document.querySelectorAll("[data-close-client-delete]").forEach(button => button.addEventListener("click", closeDelete));
    confirmDelete.addEventListener("click", async () => {
        if (!pendingDeletion) return;
        const client = pendingDeletion;
        closeDelete();
        setLoading(true);
        try {
            await clientApi.remove(client.id);
            activeSearch = null;
            filterValue.value = "";
            createdValue.value = "";
            showMessage("Cliente excluído com sucesso.", "success");
            await loadClients();
        }
        catch (error) { showMessage(error.message || "Não foi possível excluir o cliente.", "error"); setLoading(false); }
    });
    document.querySelectorAll("[data-close-client-anonymize]").forEach(button => button.addEventListener("click", closeAnonymize));
    confirmAnonymize.addEventListener("click", async () => {
        if (!pendingAnonymization) return;
        const client = pendingAnonymization;
        closeAnonymize();
        setLoading(true);
        try { await clientApi.anonymize(client.id); showMessage("Dados pessoais anonimizados. O histórico de agendamentos foi mantido.", "success"); await loadClients(activeSearch); }
        catch (error) { showMessage(error.message || "Não foi possível anonimizar os dados.", "error"); setLoading(false); }
    });
    updateFilterInput();
    loadClients();
});

document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("item-form-card");
    const form = document.getElementById("item-form");
    const list = document.getElementById("item-list");
    const count = document.getElementById("item-count");
    const loading = document.getElementById("item-loading");
    const notifications = document.getElementById("item-notifications");
    const saveButton = document.getElementById("save-item");
    const searchType = document.getElementById("search-type");
    const searchValue = document.getElementById("search-value");
    const deleteModal = document.getElementById("item-delete-modal");
    const deleteName = document.getElementById("item-delete-name");
    const confirmDelete = document.getElementById("confirm-delete-item");
    let items = [];
    let pendingDeletion = null;

    const fields = {
        id: document.getElementById("item-id"),
        appointment_id: document.getElementById("appointment-id"),
        service_id: document.getElementById("service-id"),
        professional_id: document.getElementById("professional-id"),
        resource_id: document.getElementById("resource-id"),
        start_at: document.getElementById("start-at"),
        end_at: document.getElementById("end-at"),
        price: document.getElementById("item-price")
    };

    function showMessage(message, type) {
        const notification = document.createElement("div");
        notification.className = `item-notification ${type}`;
        notification.textContent = message;
        notifications.appendChild(notification);
        window.setTimeout(() => notification.remove(), type === "error" ? 7000 : 4500);
    }

    function setLoading(active) {
        loading.hidden = !active;
        document.querySelectorAll("button").forEach(button => {
            button.disabled = active;
        });
    }

    function friendlyError(error, fallback) {
        return error?.status === 422
            ? error.message
            : error?.message || fallback;
    }

    function localDateTimeValue(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 16);
    }

    function isoDateTime(value) {
        return new Date(value).toISOString();
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value || "—") : date.toLocaleString("pt-BR");
    }

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
    }

    function render() {
        count.textContent = `${items.length} item${items.length === 1 ? "" : "s"} encontrado${items.length === 1 ? "" : "s"}`;
        if (!items.length) {
            list.innerHTML = `<div class="empty-items"><strong>Nenhum item encontrado</strong><span>Cadastre um item ou altere os filtros de busca.</span></div>`;
            return;
        }
        list.innerHTML = items.map(item => `<div class="item-table item-row">
            <span>${escapeHtml(item.id)}</span>
            <span>${escapeHtml(item.appointment_id)}</span>
            <span>${escapeHtml(item.service_id)}</span>
            <span>${escapeHtml(item.professional_id)}</span>
            <span>${escapeHtml(formatDate(item.start_at))}<small>até ${escapeHtml(formatDate(item.end_at))}</small></span>
            <strong>${escapeHtml(formatPrice(item.price))}</strong>
            <div class="item-actions"><button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">EDITAR</button><button type="button" class="delete-item" data-action="delete" data-id="${escapeHtml(item.id)}">EXCLUIR</button></div>
        </div>`).join("");
    }

    async function loadItems(loader = () => appointmentsItemsApi.list()) {
        setLoading(true);
        try {
            items = await loader();
            render();
            if (!items.length) showMessage("Nenhum item encontrado.", "info");
        } catch (error) {
            items = [];
            render();
            showMessage(friendlyError(error, "Não foi possível carregar os itens."), "error");
        } finally {
            setLoading(false);
        }
    }

    function openForm(item) {
        form.reset();
        document.querySelectorAll("[data-error-for]").forEach(error => error.textContent = "");
        fields.id.value = item?.id || "";
        Object.keys(fields).filter(key => key !== "id").forEach(key => {
            fields[key].value = item
                ? (key === "start_at" || key === "end_at" ? localDateTimeValue(item[key]) : item[key] ?? "")
                : "";
        });
        document.getElementById("item-form-title").textContent = item ? "Editar item" : "Novo item";
        formCard.hidden = false;
        fields.appointment_id.focus();
    }

    function validate() {
        let valid = true;
        Object.keys(fields).filter(key => key !== "id").forEach(key => {
            const field = fields[key];
            const numeric = ["appointment_id", "service_id", "professional_id", "resource_id", "price"].includes(key);
            const date = ["start_at", "end_at"].includes(key) ? new Date(field.value) : null;
            const invalid = !String(field.value).trim()
                || (numeric && !Number.isFinite(Number(field.value)))
                || (["appointment_id", "service_id", "professional_id", "resource_id"].includes(key) && Number(field.value) <= 0)
                || (key === "price" && Number(field.value) < 0)
                || (date && Number.isNaN(date.getTime()));
            const error = document.querySelector(`[data-error-for="${key}"]`);
            error.textContent = invalid ? "Este campo é obrigatório e deve ser válido." : "";
            field.classList.toggle("invalido", invalid);
            valid = valid && !invalid;
        });
        if (!valid) showMessage("Revise os campos obrigatórios.", "error");
        return valid;
    }

    function payload() {
        const value = {
            appointment_id: Number(fields.appointment_id.value),
            service_id: Number(fields.service_id.value),
            professional_id: Number(fields.professional_id.value),
            resource_id: Number(fields.resource_id.value),
            start_at: isoDateTime(fields.start_at.value),
            end_at: isoDateTime(fields.end_at.value),
            price: Number(fields.price.value)
        };
        if (fields.id.value) value.id = Number(fields.id.value);
        return value;
    }

    function openDelete(item) {
        pendingDeletion = item;
        deleteName.textContent = `Item #${item.id} do agendamento #${item.appointment_id}`;
        deleteModal.hidden = false;
        confirmDelete.focus();
    }

    function closeDelete() {
        deleteModal.hidden = true;
        pendingDeletion = null;
    }

    async function searchItems() {
        if (!searchValue.value) {
            showMessage("Informe um valor para buscar.", "error");
            return;
        }
        const value = searchType.value === "price" ? Number(searchValue.value) : isoDateTime(searchValue.value);
        const search = searchType.value === "start"
            ? () => appointmentsItemsApi.searchStartDate(value)
            : searchType.value === "end"
                ? () => appointmentsItemsApi.searchEndDate(value)
                : () => appointmentsItemsApi.searchPrice(value);
        await loadItems(search);
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) return;
        saveButton.disabled = true;
        try {
            const editing = Boolean(fields.id.value);
            if (editing) await appointmentsItemsApi.update(payload());
            else await appointmentsItemsApi.create(payload());
            formCard.hidden = true;
            showMessage(editing ? "Item atualizado com sucesso." : "Item criado com sucesso.", "success");
            await loadItems();
        } catch (error) {
            showMessage(friendlyError(error, "Não foi possível salvar o item."), "error");
        } finally {
            saveButton.disabled = false;
        }
    });

    list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const item = items.find(value => String(value.id) === button.dataset.id);
        if (!item) return;
        if (button.dataset.action === "edit") openForm(item);
        if (button.dataset.action === "delete") openDelete(item);
    });

    document.querySelectorAll("[data-close-item-delete]").forEach(button => button.addEventListener("click", closeDelete));
    confirmDelete.addEventListener("click", async () => {
        if (!pendingDeletion) return;
        const item = pendingDeletion;
        closeDelete();
        setLoading(true);
        try {
            await appointmentsItemsApi.remove(item.id);
            showMessage("Item excluído com sucesso.", "success");
            await loadItems();
        } catch (error) {
            showMessage(friendlyError(error, "Não foi possível excluir o item."), "error");
            setLoading(false);
        }
    });

    document.getElementById("new-item").addEventListener("click", () => openForm());
    document.getElementById("cancel-item").addEventListener("click", () => { formCard.hidden = true; });
    document.getElementById("cancel-item-bottom").addEventListener("click", () => { formCard.hidden = true; });
    document.getElementById("search-items").addEventListener("click", searchItems);
    document.getElementById("clear-search").addEventListener("click", () => {
        searchValue.value = "";
        searchType.value = "start";
        loadItems();
    });
    searchType.addEventListener("change", () => {
        searchValue.type = searchType.value === "price" ? "number" : "datetime-local";
        searchValue.step = searchType.value === "price" ? "0.01" : "";
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !deleteModal.hidden) closeDelete();
    });
    loadItems();
});

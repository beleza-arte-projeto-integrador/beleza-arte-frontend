document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("item-form-card");
    const form = document.getElementById("item-form");
    const list = document.getElementById("item-list");
    const count = document.getElementById("item-count");
    const loading = document.getElementById("item-loading");
    const notifications = document.getElementById("item-notifications");
    const searchType = document.getElementById("search-type");
    const searchValue = document.getElementById("search-value");
    const deleteModal = document.getElementById("item-delete-modal");
    const deleteName = document.getElementById("item-delete-name");
    const confirmDelete = document.getElementById("confirm-delete-item");
    const { brasiliaParts, toBrasiliaIso, addMinutesLocal, formatDateTime } = appointmentApi.time;
    let items = [];
    let services = [];
    let professionals = [];
    let resources = [];
    let pendingDeletion = null;
    let lastSearch = null;

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
        document.querySelectorAll("button, #search-type, #search-value").forEach(element => {
            element.disabled = active;
        });
    }

    function friendlyError(error, fallback) {
        return error?.message || fallback;
    }

    // Datas exibidas e enviadas no horário de Brasília (-03:00), sem converter para UTC.
    function localDateTimeValue(value) {
        return brasiliaParts(value)?.local || "";
    }

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
    }

    function findById(collection, id) {
        return collection.find(value => Number(value.id) === Number(id));
    }

    const labels = {
        service_id: id => findById(services, id)?.name || `Serviço #${id}`,
        professional_id: id => findById(professionals, id)?.name || `Profissional #${id}`,
        resource_id: id => {
            const resource = findById(resources, id);
            return resource ? `${resource.name} (${resource.type || "recurso"})` : `Recurso #${id}`;
        }
    };

    // Preenche um select com as opções (id → nome). Mantém o valor atual selecionado, se ainda existir.
    function fillSelect(select, collection, getLabel, placeholder) {
        const current = select.value;
        select.innerHTML = "";
        select.add(new Option(placeholder, ""));
        collection.forEach(value => select.add(new Option(getLabel(value), value.id)));
        if ([...select.options].some(option => option.value === current)) select.value = current;
    }

    // Garante que o valor de um item salvo apareça no select mesmo fora da lista
    // (ex.: recurso inativo ou profissional que não veio na busca).
    function selectValue(select, id, missingLabel) {
        const value = id === null || id === undefined ? "" : String(id);
        if (value && ![...select.options].some(option => option.value === value)) {
            select.add(new Option(missingLabel(value), value));
        }
        select.value = value;
    }

    async function loadLookups() {
        const results = await Promise.allSettled([
            serviceApi.list(),
            professionalApi.list(),
            resourceApi.search("active", "true")
        ]);
        const names = ["serviços", "profissionais", "recursos"];
        const failures = results
            .map((result, index) => result.status === "rejected" ? `${names[index]}: ${result.reason?.message || "erro desconhecido"}` : null)
            .filter(Boolean);
        const byName = (a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
        services = results[0].status === "fulfilled" ? [...results[0].value].sort(byName) : [];
        professionals = results[1].status === "fulfilled" ? [...results[1].value].filter(value => value.active !== false).sort(byName) : [];
        resources = results[2].status === "fulfilled" ? results[2].value.filter(value => value.active !== false).sort(byName) : [];
        fillSelect(fields.service_id, services, service => service.name, services.length ? "Selecione um serviço" : "Nenhum serviço cadastrado");
        fillSelect(fields.professional_id, professionals, professional => professional.name, professionals.length ? "Selecione um profissional" : "Nenhum profissional cadastrado");
        fillSelect(fields.resource_id, resources, resource => `${resource.name} (${resource.type || "recurso"})`,resources.length ? "Selecione um recurso" : "Nenhum recurso ativo");
        if (failures.length) showMessage(`Não foi possível carregar ${failures.join("; ")}.`, "error");
        if (items.length) render();
    }

    // Ao escolher o serviço (ou mudar o início): sugere preço e término pela duração.
    function updateEndFromDuration() {
        const service = findById(services, fields.service_id.value);
        const duration = Number(service?.duration_minutes);
        if (fields.start_at.value && duration > 0) fields.end_at.value = addMinutesLocal(fields.start_at.value, duration);
    }

    function render(emptyText = "Cadastre um item ou altere os filtros de busca.") {
        count.textContent = `${items.length} item${items.length === 1 ? "" : "s"} encontrado${items.length === 1 ? "" : "s"}`;
        if (!items.length) {
            list.innerHTML = `<div class="empty-items"><strong>Nenhum item encontrado</strong><span>${escapeHtml(emptyText)}</span></div>`;
            return;
        }
        list.innerHTML = items.map(item => `<div class="item-table item-row">
            <span>${escapeHtml(item.id)}</span>
            <span>${escapeHtml(item.appointment_id)}</span>
            <span>${escapeHtml(labels.service_id(item.service_id))}<small>${item.resource_id ? escapeHtml(labels.resource_id(item.resource_id)) : "Sem recurso"}</small></span>
            <span>${escapeHtml(labels.professional_id(item.professional_id))}</span>
            <span>${escapeHtml(formatDateTime(item.start_at))}<small>até ${escapeHtml(formatDateTime(item.end_at))}</small></span>
            <strong>${escapeHtml(formatPrice(item.price))}</strong>
            <div class="item-actions"><button type="button" data-action="edit" data-id="${escapeHtml(item.id)}">EDITAR</button><button type="button" class="delete-item" data-action="delete" data-id="${escapeHtml(item.id)}">EXCLUIR</button></div>
        </div>`).join("");
    }

    // Não existe rota que lista todos os itens: a tela começa vazia e carrega por busca.
    async function loadItems(loader = lastSearch) {
        if (!loader) {
            items = [];
            render("Busque pela data de início/término exata ou pelo preço.");
            count.textContent = "Faça uma busca para ver os itens.";
            return;
        }
        lastSearch = loader;
        setLoading(true);
        try {
            items = await loader();
            items.sort((a, b) => Number(a.id) - Number(b.id));
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
            if (labels[key]) {
                selectValue(fields[key], item?.[key], labels[key]);
                return;
            }
            fields[key].value = item
                ? (key === "start_at" || key === "end_at" ? localDateTimeValue(item[key]) : item[key] ?? "")
                : "";
        });
        // Com o profissional definido, mostra só os serviços dele (mantendo o serviço salvo do item).
        document.getElementById("item-form-title").textContent = item ? "Editar item" : "Novo item";
        formCard.hidden = false;
        fields.appointment_id.focus();
    }

    function validate() {
        let valid = true;
        Object.keys(fields).filter(key => key !== "id").forEach(key => {
            const field = fields[key];
            const numeric = ["appointment_id", "service_id", "professional_id", "resource_id", "price"].includes(key);
            const invalid = !String(field.value).trim()
                || (numeric && !Number.isFinite(Number(field.value)))
                || (["appointment_id", "service_id", "professional_id", "resource_id"].includes(key) && Number(field.value) <= 0)
                || (key === "price" && Number(field.value) < 0)
                || (["start_at", "end_at"].includes(key) && !toBrasiliaIso(field.value));
            const error = document.querySelector(`[data-error-for="${key}"]`);
            error.textContent = invalid ? "Este campo é obrigatório e deve ser válido." : "";
            field.classList.toggle("invalido", invalid);
            valid = valid && !invalid;
        });
        if (valid && fields.end_at.value <= fields.start_at.value) {
            document.querySelector('[data-error-for="end_at"]').textContent = "O término deve ser depois do início.";
            fields.end_at.classList.add("invalido");
            valid = false;
        }
        if (!valid) showMessage("Revise os campos obrigatórios.", "error");
        return valid;
    }

    function payload() {
        const value = {
            appointment_id: Number(fields.appointment_id.value),
            service_id: Number(fields.service_id.value),
            professional_id: Number(fields.professional_id.value),
            resource_id: Number(fields.resource_id.value),
            start_at: toBrasiliaIso(fields.start_at.value),
            end_at: toBrasiliaIso(fields.end_at.value),
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

    function updateSearchInput() {
        const type = searchType.value;
        searchValue.value = "";
        searchValue.type = type === "price" ? "number" : "datetime-local";
        searchValue.step = type === "price" ? "0.01" : "";
        searchValue.min = type === "price" ? "0" : "";
        searchValue.placeholder = type === "price" ? "Ex.: 80.00" : "";
    }

    async function searchItems() {
        const type = searchType.value;
        if (!searchValue.value) {
            showMessage("Informe um valor para buscar.", "error");
            return;
        }
        const value = type === "price" ? Number(searchValue.value) : toBrasiliaIso(searchValue.value);
        const search = type === "start"
            ? () => appointmentsItemsApi.searchStartDate(value)
            : type === "end"
                ? () => appointmentsItemsApi.searchEndDate(value)
                : () => appointmentsItemsApi.searchPrice(value);
        await loadItems(search);
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) return;
        const editing = Boolean(fields.id.value);
        const value = payload();
        let saved = false;
        setLoading(true);
        try {
            if (editing) await appointmentsItemsApi.update(value);
            else await appointmentsItemsApi.create(value);
            saved = true;
            formCard.hidden = true;
            showMessage(editing ? "Item atualizado com sucesso." : "Item criado com sucesso.", "success");
        } catch (error) {
            showMessage(friendlyError(error, "Não foi possível salvar o item."), "error");
        } finally {
            setLoading(false);
        }
        if (saved) {
            // Mostra o item salvo, buscando pela data de início dele.
            searchType.value = "start";
            updateSearchInput();
            searchValue.value = localDateTimeValue(value.start_at);
            await loadItems(() => appointmentsItemsApi.searchStartDate(value.start_at));
        }
    });

    list.addEventListener("click", event => {
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
        let removed = false;
        try {
            await appointmentsItemsApi.remove(item.id);
            removed = true;
            showMessage("Item excluído com sucesso.", "success");
        } catch (error) {
            showMessage(friendlyError(error, "Não foi possível excluir o item."), "error");
        } finally {
            setLoading(false);
        }
        if (removed) await loadItems();
    });

    fields.service_id.addEventListener("change", () => {
        const service = findById(services, fields.service_id.value);
        if (service) fields.price.value = service.price;
        updateEndFromDuration();
    });
    fields.start_at.addEventListener("change", updateEndFromDuration);
    document.getElementById("new-item").addEventListener("click", () => openForm());
    document.getElementById("cancel-item").addEventListener("click", () => { formCard.hidden = true; });
    document.getElementById("cancel-item-bottom").addEventListener("click", () => { formCard.hidden = true; });
    document.getElementById("search-items").addEventListener("click", searchItems);
    searchValue.addEventListener("keydown", event => {
        if (event.key === "Enter") searchItems();
    });
    document.getElementById("clear-search").addEventListener("click", () => {
        searchType.value = "start";
        updateSearchInput();
        lastSearch = null;
        loadItems(null);
    });
    searchType.addEventListener("change", updateSearchInput);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !deleteModal.hidden) closeDelete();
    });
    loadItems(null);
    loadLookups();
});

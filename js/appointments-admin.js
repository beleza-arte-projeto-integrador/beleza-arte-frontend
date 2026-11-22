document.addEventListener("DOMContentLoaded", () => {
    const formCard = document.getElementById("appointment-form-card");
    const form = document.getElementById("appointment-form");
    const formTitle = document.getElementById("appointment-form-title");
    const formHint = document.getElementById("appointment-form-hint");
    const idInput = document.getElementById("appointment-id");
    const clientInput = document.getElementById("appointment-id-client");
    const notesInput = document.getElementById("appointment-notes");
    const itemsForm = document.getElementById("appointment-items-form");
    const addItemButton = document.getElementById("add-appointment-item");
    const submitButton = document.getElementById("save-appointment");
    const loading = document.getElementById("appointment-loading");
    const list = document.getElementById("appointment-list");
    const count = document.getElementById("appointment-count");
    const notifications = document.getElementById("appointment-notifications");
    const deleteModal = document.getElementById("appointment-delete-modal");
    const deleteName = document.getElementById("appointment-delete-name");
    const cancelModal = document.getElementById("appointment-cancel-modal");
    const cancelForm = document.getElementById("appointment-cancel-form");
    const cancelName = document.getElementById("appointment-cancel-name");
    const cancelReason = document.getElementById("appointment-cancel-reason");
    const cancelError = document.getElementById("appointment-cancel-error");
    const searchForm = document.getElementById("appointment-client-search");
    const searchClient = document.getElementById("appointment-search-client-id");
    const searchProfessional = document.getElementById("appointment-search-professional");
    const searchService = document.getElementById("appointment-search-service");
    const searchStatus = document.getElementById("appointment-search-status");
    const searchDate = document.getElementById("appointment-search-date");

    const { STATUS } = appointmentApi;
    const { brasiliaParts, toBrasiliaIso, addMinutesLocal, formatDate, formatTime, formatDateTime } = appointmentApi.time;

    let appointments = [];
    let clients = [];
    let services = [];
    let professionals = [];
    let resources = [];
    let editingAppointment = null;
    let pendingDeletion = null;
    let pendingCancellation = null;
    let requestInProgress = false;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
    }

    function showMessage(text, type = "info") {
        const titles = { success: "Tudo certo", error: "Algo deu errado", info: "Aviso" };
        const notification = document.createElement("div");
        notification.className = `service-notification ${type}`;
        notification.innerHTML = `<span class="service-notification-icon">${type === "success" ? "✓" : "!"}</span><span class="service-notification-content"><strong class="service-notification-title">${titles[type]}</strong><span class="service-notification-text">${escapeHtml(text)}</span></span><button class="service-notification-close" type="button" aria-label="Fechar">×</button>`;
        notification.querySelector("button").addEventListener("click", () => notification.remove());
        notifications.appendChild(notification);
        window.setTimeout(() => notification.remove(), type === "error" ? 7000 : 4500);
    }

    // Desabilita formulários e botões da página enquanto uma requisição está em andamento.
    function setLoading(active) {
        requestInProgress = active;
        loading.hidden = !active;
        document.querySelectorAll("#appointment-form button, #appointment-form input, #appointment-form select, #appointment-form textarea, #appointment-client-search button, #appointment-list button, #appointment-cancel-form button, #appointment-cancel-form textarea, #confirm-delete-appointment, #new-appointment").forEach(element => {
            if (active) {
                element.dataset.wasDisabled = element.disabled ? "1" : "";
                element.disabled = true;
            } else {
                element.disabled = element.dataset.wasDisabled === "1";
                delete element.dataset.wasDisabled;
            }
        });
    }

    function formatPrice(value) {
        return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function findById(collection, id) {
        return collection.find(value => Number(value.id) === Number(id));
    }

    function serviceName(id) {
        return findById(services, id)?.name || `Serviço #${id}`;
    }

    function professionalName(id) {
        return findById(professionals, id)?.name || `Profissional #${id}`;
    }

    function clientName(id) {
        return findById(clients, id)?.name || `Cliente #${id}`;
    }

    function statusOf(appointment) {
        return String(appointment?.status || "").toUpperCase();
    }

    function fillSelect(select, options, getLabel, placeholder) {
        const current = select.value;
        select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + options.map(option => {
            const id = Number(option.id);
            return `<option value="${id}">${escapeHtml(getLabel(option))}</option>`;
        }).join("");
        if ([...select.options].some(option => option.value === String(current))) select.value = current;
    }

    function fillLookupSelects() {
        fillSelect(clientInput, clients, client => `${client.name || "Cliente"} - ${client.phone || ""}`, "Selecione um cliente");
        fillSelect(searchClient, clients, client => client.name || `Cliente #${client.id}`, "Todos os clientes");
        fillSelect(searchProfessional, professionals, professional => professional.name || `Profissional #${professional.id}`, "Todos");
        fillSelect(searchService, services, service => service.name || `Serviço #${service.id}`, "Todos");
    }

    function optionsHtml(collection, selectedId, getLabel, missingLabel) {
        const options = collection.map(value => `<option value="${escapeHtml(value.id)}" ${Number(selectedId) === Number(value.id) ? "selected" : ""}>${escapeHtml(getLabel(value))}</option>`);
        // Mantém o valor atual do item mesmo que ele não esteja na lista (ex.: recurso inativo).
        if (selectedId && !findById(collection, selectedId)) {
            options.push(`<option value="${escapeHtml(selectedId)}" selected>${escapeHtml(missingLabel(selectedId))}</option>`);
        }
        return options.join("");
    }

    function updateEndFromDuration(row) {
        const service = findById(services, row.querySelector(".item-service").value);
        const start = row.querySelector(".item-start").value;
        const duration = Number(service?.duration_minutes);
        if (start && duration > 0) row.querySelector(".item-end").value = addMinutesLocal(start, duration);
    }

    function addItemRow(item = null, readOnly = false) {
        const row = document.createElement("div");
        row.className = "appointment-item-row";
        row.innerHTML = `
            <label class="admin-field">Serviço *<select class="item-service" required><option value="">Selecione</option>${optionsHtml(services, item?.service_id, service => service.name, id => `Serviço #${id}`)}</select></label>
            <label class="admin-field">Profissional *<select class="item-professional" required><option value="">Selecione</option>${optionsHtml(professionals, item?.professional_id, professional => professional.name, id => `Profissional #${id}`)}</select></label>
            <label class="admin-field">Recurso *<select class="item-resource" required><option value="">Selecione</option>${optionsHtml(resources, item?.resource_id, resource => `${resource.name} (${resource.type || "recurso"})`, id => `Recurso #${id} (inativo)`)}</select></label>
            <label class="admin-field">Início *<input class="item-start" type="datetime-local" required value="${escapeHtml(brasiliaParts(item?.start_at)?.local || "")}"></label>
            <label class="admin-field">Término *<input class="item-end" type="datetime-local" required value="${escapeHtml(brasiliaParts(item?.end_at)?.local || "")}"></label>
            <label class="admin-field">Preço (R$) *<input class="item-price" type="number" min="0" step="0.01" required value="${escapeHtml(item?.price ?? "")}"></label>
            <button class="appointment-item-remove" type="button" title="Remover serviço" aria-label="Remover serviço">×</button>
        `;
        row.dataset.itemId = item?.id || "";
        const serviceSelect = row.querySelector(".item-service");
        const priceInput = row.querySelector(".item-price");
        // Ao escolher o serviço: preço e término sugeridos (o usuário ainda pode ajustar).
        serviceSelect.addEventListener("change", () => {
            const selectedService = findById(services, serviceSelect.value);
            if (selectedService) priceInput.value = selectedService.price;
            updateEndFromDuration(row);
        });
        row.querySelector(".item-start").addEventListener("change", () => updateEndFromDuration(row));
        row.querySelector(".appointment-item-remove").addEventListener("click", () => row.remove());
        if (readOnly) {
            row.dataset.readOnly = "1";
            row.querySelectorAll("select, input, button").forEach(element => { element.disabled = true; });
        }
        itemsForm.appendChild(row);
    }

    function setFormMode(appointment) {
        const final = appointment ? appointmentApi.isFinalStatus(statusOf(appointment)) : false;
        clientInput.disabled = Boolean(appointment);
        addItemButton.hidden = final;
        formTitle.textContent = appointment ? `Editar agendamento #${appointment.id}` : "Novo agendamento";
        submitButton.textContent = appointment ? "ATUALIZAR AGENDAMENTO" : "CRIAR AGENDAMENTO";
        formHint.textContent = !appointment
            ? "Selecione um cliente e informe todos os serviços da visita."
            : final
                ? `Agendamento ${appointmentApi.statusLabel(statusOf(appointment)).toLowerCase()}: apenas as observações podem ser alteradas.`
                : "O cliente não pode ser alterado. Ajuste as observações e os serviços da visita.";
    }

    function openCreate() {
        if (requestInProgress) return;
        editingAppointment = null;
        form.reset();
        idInput.value = "";
        setFormMode(null);
        itemsForm.innerHTML = "";
        addItemRow();
        formCard.hidden = false;
        clientInput.focus();
    }

    function openEdit(appointment) {
        if (requestInProgress) return;
        editingAppointment = appointment;
        form.reset();
        idInput.value = appointment.id;
        clientInput.value = String(appointment.idClient);
        notesInput.value = appointment.notes || "";
        setFormMode(appointment);
        itemsForm.innerHTML = "";
        const final = appointmentApi.isFinalStatus(statusOf(appointment));
        const items = appointmentApi.sortItems(appointment.items);
        if (items.length) items.forEach(item => addItemRow(item, final));
        else if (!final) addItemRow();
        formCard.hidden = false;
        formCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function closeForm() {
        formCard.hidden = true;
        editingAppointment = null;
        form.reset();
        clientInput.disabled = false;
        itemsForm.innerHTML = "";
    }

    function editableRows() {
        return [...itemsForm.querySelectorAll(".appointment-item-row")].filter(row => row.dataset.readOnly !== "1");
    }

    function validateForm() {
        const editing = Boolean(editingAppointment);
        const final = editing && appointmentApi.isFinalStatus(statusOf(editingAppointment));
        let valid = editing || Number(clientInput.value) > 0;
        document.querySelector('[data-error-for="idClient"]').textContent = valid ? "" : "Selecione um cliente existente.";
        clientInput.classList.toggle("invalido", !valid);
        if (final) return valid;

        const rows = editableRows();
        if (!rows.length) {
            showMessage("Adicione pelo menos um serviço ao agendamento.", "error");
            return false;
        }
        rows.forEach(row => {
            row.querySelectorAll("select, input").forEach(field => {
                const fieldValid = String(field.value).trim() !== "" && !(field.type === "number" && Number(field.value) < 0);
                field.classList.toggle("invalido", !fieldValid);
                valid = valid && fieldValid;
            });
            const start = row.querySelector(".item-start").value;
            const end = row.querySelector(".item-end").value;
            if (start && end && end <= start) {
                row.querySelector(".item-end").classList.add("invalido");
                valid = false;
            }
        });
        if (!valid) showMessage("Selecione o cliente e preencha corretamente todos os serviços (serviço, profissional, recurso, início, término e preço).", "error");
        return valid;
    }

    function itemPayload(row, appointmentId) {
        const payload = {
            appointment_id: appointmentId,
            service_id: Number(row.querySelector(".item-service").value),
            professional_id: Number(row.querySelector(".item-professional").value),
            resource_id: Number(row.querySelector(".item-resource").value),
            start_at: toBrasiliaIso(row.querySelector(".item-start").value),
            end_at: toBrasiliaIso(row.querySelector(".item-end").value),
            price: Number(row.querySelector(".item-price").value)
        };
        if (row.dataset.itemId) payload.id = Number(row.dataset.itemId);
        return payload;
    }

    async function loadBaseData() {
        const results = await Promise.allSettled([
            clientApi.list(),
            serviceApi.list(),
            professionalApi.list(),
            resourceApi.search("active", "true")
        ]);
        const labels = ["clientes", "serviços", "profissionais", "recursos"];
        const failures = [];
        results.forEach((result, index) => {
            if (result.status === "rejected") failures.push(`${labels[index]}: ${result.reason?.message || "erro desconhecido"}`);
        });
        clients = results[0].status === "fulfilled" ? results[0].value : [];
        services = results[1].status === "fulfilled" ? results[1].value : [];
        professionals = results[2].status === "fulfilled" ? results[2].value : [];
        resources = results[3].status === "fulfilled" ? results[3].value.filter(resource => resource.active !== false) : [];
        fillLookupSelects();
        if (failures.length) showMessage(`Não foi possível carregar ${failures.join("; ")}.`, "error");
    }

    // Usa a busca mais específica do backend e aplica os demais filtros sobre o resultado.
    async function fetchAppointments(filters) {
        if (filters.clientId) return appointmentApi.searchAppointmentsByClient(filters.clientId);
        if (filters.professionalId) return appointmentApi.searchAppointmentsByProfessional(filters.professionalId);
        if (filters.serviceId) return appointmentApi.searchAppointmentsByService(filters.serviceId);
        if (filters.date) return appointmentApi.searchAppointmentsByDate(filters.date);
        if (filters.status) return appointmentApi.searchAppointmentsByStatus(filters.status);
        return appointmentApi.listAllAppointments();
    }

    function matchesFilters(appointment, filters) {
        const items = appointment.items || [];
        if (filters.clientId && Number(appointment.idClient) !== filters.clientId) return false;
        if (filters.status && statusOf(appointment) !== filters.status) return false;
        if (filters.professionalId && !items.some(item => Number(item.professional_id) === filters.professionalId)) return false;
        if (filters.serviceId && !items.some(item => Number(item.service_id) === filters.serviceId)) return false;
        if (filters.date && !items.some(item => brasiliaParts(item.start_at)?.date === filters.date)) return false;
        return true;
    }

    async function loadAppointments() {
        if (requestInProgress) return;
        const filters = {
            clientId: Number(searchClient.value) || 0,
            professionalId: Number(searchProfessional.value) || 0,
            serviceId: Number(searchService.value) || 0,
            status: searchStatus.value,
            date: searchDate.value
        };
        setLoading(true);
        count.textContent = "Buscando agendamentos...";
        list.innerHTML = `<div class="appointment-loading-row">Carregando agendamentos da API...</div>`;
        try {
            const found = await fetchAppointments(filters);
            appointments = appointmentApi.mergeAppointments([found]).filter(appointment => matchesFilters(appointment, filters));
            render();
        } catch (error) {
            appointments = [];
            count.textContent = "Não foi possível carregar os agendamentos.";
            list.innerHTML = `<div class="empty-appointments">${escapeHtml(error?.message || "Não foi possível carregar os agendamentos.")}</div>`;
            showMessage(error?.message || "Não foi possível carregar os agendamentos.", "error");
        } finally {
            setLoading(false);
        }
    }

    function statusTag(status) {
        const css = `status-${status.toLowerCase().replace(/_/g, "-")}`;
        return `<span class="appointment-status-tag ${escapeHtml(css)}">${escapeHtml(appointmentApi.statusLabel(status).toUpperCase())}</span>`;
    }

    function actionButtons(appointment) {
        const status = statusOf(appointment);
        const id = escapeHtml(appointment.id);
        const buttons = [`<button type="button" data-action="edit" data-id="${id}">EDITAR</button>`];
        if (appointmentApi.canChangeTo(status, STATUS.CONFIRMADO)) buttons.push(`<button type="button" class="appointment-confirm" data-action="confirm" data-id="${id}">CONFIRMAR</button>`);
        if (appointmentApi.canChangeTo(status, STATUS.CONCLUIDO)) buttons.push(`<button type="button" class="appointment-complete" data-action="complete" data-id="${id}">CONCLUIR</button>`);
        if (appointmentApi.canChangeTo(status, STATUS.NAO_COMPARECEU)) buttons.push(`<button type="button" class="appointment-no-show" data-action="no-show" data-id="${id}">NÃO COMPARECEU</button>`);
        if (appointmentApi.canChangeTo(status, STATUS.CANCELADO)) buttons.push(`<button type="button" class="appointment-cancel" data-action="cancel" data-id="${id}">CANCELAR</button>`);
        buttons.push(`<button type="button" class="delete-appointment" data-action="delete" data-id="${id}">EXCLUIR</button>`);
        return buttons.join("");
    }

    function render() {
        count.textContent = `${appointments.length} agendamento${appointments.length === 1 ? "" : "s"} encontrado${appointments.length === 1 ? "" : "s"}`;
        if (!appointments.length) {
            list.innerHTML = `<div class="empty-appointments">Nenhum agendamento encontrado com os filtros selecionados.</div>`;
            return;
        }
        list.innerHTML = appointments.map(appointment => {
            const status = statusOf(appointment);
            const items = appointmentApi.sortItems(appointment.items);
            const itemsSummary = items.length
                ? items.map(item => `<small class="appointment-item-line"><strong>${escapeHtml(serviceName(item.service_id))}</strong> · ${escapeHtml(professionalName(item.professional_id))} · ${escapeHtml(formatDate(item.start_at))} ${escapeHtml(formatTime(item.start_at))}–${escapeHtml(formatTime(item.end_at))} · ${escapeHtml(formatPrice(item.price))}</small>`).join("")
                : `<small class="appointment-item-line">Nenhum serviço cadastrado.</small>`;
            const cancelInfo = status === STATUS.CANCELADO
                ? `<small class="appointment-cancel-info">Cancelado por ${escapeHtml(appointmentApi.cancelledByLabel(appointment.cancelledBy))}${appointment.cancelledAt ? ` em ${escapeHtml(formatDateTime(appointment.cancelledAt))}` : ""}${appointment.cancelReason ? ` · Motivo: ${escapeHtml(appointment.cancelReason)}` : ""}</small>`
                : "";
            return `<div class="appointment-table appointment-row">
                <strong>#${escapeHtml(appointment.id)}</strong>
                <span>${escapeHtml(clientName(appointment.idClient))}</span>
                <span>${itemsSummary}${appointment.notes ? `<small class="appointment-notes-line">Obs.: ${escapeHtml(appointment.notes)}</small>` : ""}${cancelInfo}</span>
                ${statusTag(status)}
                <div class="appointment-actions">${actionButtons(appointment)}</div>
            </div>`;
        }).join("");
    }

    async function syncItems(appointmentId) {
        const rows = editableRows();
        for (const row of rows) {
            const payload = itemPayload(row, appointmentId);
            if (payload.id) await appointmentsItemsApi.update(payload);
            else {
                const created = await appointmentsItemsApi.create(payload);
                // Evita duplicar o item se outra etapa falhar e o usuário salvar de novo.
                if (created?.id) {
                    row.dataset.itemId = created.id;
                    if (editingAppointment) editingAppointment.items = [...(editingAppointment.items || []), created];
                }
            }
        }
        const keptIds = rows.map(row => Number(row.dataset.itemId)).filter(Boolean);
        const existingIds = (editingAppointment?.items || []).map(item => Number(item.id));
        for (const itemId of existingIds) {
            if (!keptIds.includes(itemId)) await appointmentsItemsApi.remove(itemId);
        }
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (requestInProgress || !validateForm()) return;
        const editing = Boolean(editingAppointment);
        const final = editing && appointmentApi.isFinalStatus(statusOf(editingAppointment));
        setLoading(true);
        try {
            let appointmentId = Number(idInput.value);
            if (editing) {
                // Não envia status nem idClient: o backend mantém os atuais.
                await appointmentApi.updateAppointment({ id: appointmentId, notes: notesInput.value });
            } else {
                const created = await appointmentApi.createAppointment({
                    idClient: Number(clientInput.value),
                    notes: notesInput.value
                });
                appointmentId = Number(created?.id);
                if (!appointmentId) throw new Error("A API criou a visita, mas não retornou o ID do agendamento.");
                // A partir daqui o formulário passa a editar o agendamento criado (não cria outro se um item falhar).
                editingAppointment = { ...created, items: [] };
                idInput.value = appointmentId;
            }
            if (!final) await syncItems(appointmentId);
            setLoading(false);
            closeForm();
            showMessage(editing ? "Agendamento atualizado com sucesso." : "Agendamento criado com sucesso.", "success");
            await loadAppointments();
        } catch (error) {
            setLoading(false);
            const prefix = !editing && editingAppointment ? `O agendamento #${editingAppointment.id} foi criado, mas um serviço falhou. ` : "";
            if (prefix) setFormMode(editingAppointment);
            showMessage(prefix + (error?.message || "Não foi possível salvar o agendamento."), "error");
        } finally {
            if (requestInProgress) setLoading(false);
        }
    });

    async function changeStatus(appointment, action) {
        const operations = {
            confirm: [appointmentApi.confirmAppointment, "confirmado"],
            complete: [appointmentApi.completeAppointment, "concluído"],
            "no-show": [appointmentApi.noShowAppointment, "marcado como não compareceu"]
        };
        const [operation, label] = operations[action];
        setLoading(true);
        try {
            await operation(appointment.id);
            showMessage(`Agendamento #${appointment.id} ${label}.`, "success");
        } catch (error) {
            showMessage(error?.message || "Não foi possível alterar o status do agendamento.", "error");
        } finally {
            setLoading(false);
        }
        await loadAppointments();
    }

    function openCancel(appointment) {
        pendingCancellation = appointment;
        cancelName.textContent = `Agendamento #${appointment.id} · ${clientName(appointment.idClient)}`;
        cancelReason.value = "";
        cancelError.textContent = "";
        cancelReason.classList.remove("invalido");
        cancelModal.hidden = false;
        cancelReason.focus();
    }

    function closeCancel() {
        if (requestInProgress) return;
        cancelModal.hidden = true;
        pendingCancellation = null;
    }

    function closeDelete() {
        if (requestInProgress) return;
        deleteModal.hidden = true;
        pendingDeletion = null;
    }

    list.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button || requestInProgress) return;
        const appointment = appointments.find(item => String(item.id) === button.dataset.id);
        if (!appointment) return;
        const action = button.dataset.action;
        if (action === "edit") openEdit(appointment);
        if (action === "delete") {
            pendingDeletion = appointment;
            deleteName.textContent = `Agendamento #${appointment.id} · ${clientName(appointment.idClient)}`;
            deleteModal.hidden = false;
        }
        if (action === "cancel") openCancel(appointment);
        if (["confirm", "complete", "no-show"].includes(action)) changeStatus(appointment, action);
    });

    cancelForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!pendingCancellation || requestInProgress) return;
        const reason = cancelReason.value.trim();
        if (!reason) {
            cancelError.textContent = "Informe o motivo do cancelamento.";
            cancelReason.classList.add("invalido");
            cancelReason.focus();
            return;
        }
        const appointment = pendingCancellation;
        setLoading(true);
        try {
            await appointmentApi.cancelAppointment(appointment.id, "SALAO", reason);
            setLoading(false);
            closeCancel();
            showMessage(`Agendamento #${appointment.id} cancelado.`, "success");
            await loadAppointments();
        } catch (error) {
            cancelError.textContent = error?.message || "Não foi possível cancelar o agendamento.";
            showMessage(error?.message || "Não foi possível cancelar o agendamento.", "error");
        } finally {
            if (requestInProgress) setLoading(false);
        }
    });

    document.getElementById("confirm-delete-appointment").addEventListener("click", async () => {
        if (!pendingDeletion || requestInProgress) return;
        const appointment = pendingDeletion;
        setLoading(true);
        try {
            // O banco apaga os itens junto com o agendamento.
            await appointmentApi.deleteAppointment(appointment.id);
            setLoading(false);
            closeDelete();
            if (editingAppointment && Number(editingAppointment.id) === Number(appointment.id)) closeForm();
            showMessage(`Agendamento #${appointment.id} excluído com sucesso.`, "success");
            await loadAppointments();
        } catch (error) {
            setLoading(false);
            closeDelete();
            showMessage(error?.message || "Não foi possível excluir o agendamento.", "error");
        }
    });

    document.getElementById("new-appointment").addEventListener("click", openCreate);
    document.getElementById("close-appointment-form").addEventListener("click", closeForm);
    document.getElementById("cancel-appointment-form").addEventListener("click", closeForm);
    addItemButton.addEventListener("click", () => addItemRow());
    document.querySelectorAll("[data-close-appointment-delete]").forEach(button => button.addEventListener("click", closeDelete));
    document.querySelectorAll("[data-close-appointment-cancel]").forEach(button => button.addEventListener("click", closeCancel));
    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (!cancelModal.hidden) closeCancel();
        if (!deleteModal.hidden) closeDelete();
    });
    searchForm.addEventListener("submit", event => {
        event.preventDefault();
        loadAppointments();
    });
    document.getElementById("clear-appointment-search").addEventListener("click", () => {
        searchClient.value = "";
        searchProfessional.value = "";
        searchService.value = "";
        searchStatus.value = "";
        searchDate.value = "";
        loadAppointments();
    });

    loadBaseData().finally(() => {
        if (window.location.hash === "#novo") openCreate();
        loadAppointments();
    });
});

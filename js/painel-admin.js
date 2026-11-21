document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("professional-search");
    const specialty = document.getElementById("specialty-filter");
    const list = document.getElementById("professional-list");
    const status = document.getElementById("professional-status");
    const modal = document.getElementById("professional-modal");
    const form = document.getElementById("professional-form");
    const formError = document.getElementById("professional-form-error");
    const notifications = document.getElementById("professional-notifications");
    const deleteModal = document.getElementById("delete-professional-modal");
    const deleteName = document.getElementById("delete-professional-name");
    const confirmDelete = document.getElementById("confirm-delete-professional");
    let professionalBeingEdited = null;
    let professionalPendingDeletion = null;
    let professionals = [];
    let searchTimer = null;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    function initials(name) {
        return String(name || "P").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    }

    function setStatus(message, type = "") {
        status.textContent = message;
        status.className = `professional-status ${type}`.trim();
    }

    function showNotification(text, type = "info") {
        const titles = { success: "Tudo certo", error: "Algo deu errado", info: "Aviso" };
        const icons = { success: "✓", error: "!", info: "i" };
        const notification = document.createElement("div");
        notification.className = `service-notification ${type}`;
        notification.innerHTML = `<span class="service-notification-icon">${icons[type]}</span><span class="service-notification-content"><strong class="service-notification-title">${titles[type]}</strong><span class="service-notification-text"></span></span><button class="service-notification-close" type="button" aria-label="Fechar notificação">×</button>`;
        notification.querySelector(".service-notification-text").textContent = text;
        notification.querySelector(".service-notification-close").addEventListener("click", () => removeNotification(notification));
        notifications.appendChild(notification);
        window.setTimeout(() => removeNotification(notification), type === "error" ? 7000 : 4500);
    }

    function removeNotification(notification) {
        if (!notification.isConnected) return;
        notification.classList.add("is-removing");
        window.setTimeout(() => notification.remove(), 200);
    }

    const editSpecialty = document.getElementById("edit-specialty");

    function addOption(select, value) {
        if (!value || [...select.options].some(option => option.value === value)) return;
        select.add(new Option(value, value));
    }

    // Especialidades = categorias dos serviços cadastrados. O filtro inclui também
    // as especialidades antigas, para que profissionais já cadastrados continuem aparecendo.
    async function loadSpecialtyOptions() {
        try {
            const [categories, searchable] = await Promise.all([
                professionalApi.specialties(),
                professionalApi.searchableSpecialties()
            ]);
            searchable.forEach(value => addOption(specialty, value));
            categories.forEach(value => addOption(editSpecialty, value));
        } catch {
            showNotification("Não foi possível carregar as especialidades (categorias de serviço).", "error");
        }
    }

    function openEditModal(professional) {
        professionalBeingEdited = professional;
        formError.textContent = "";
        document.getElementById("edit-name").value = professional.name || "";
        addOption(editSpecialty, professional.specialty); // mantém valores fora da lista
        editSpecialty.value = professional.specialty || "";
        document.getElementById("edit-phone").value = professional.phone || "";
        document.getElementById("edit-email").value = professional.email || "";
        document.getElementById("edit-cpf").value = professional.cpf || "";
        document.getElementById("edit-experience").value = professional.experienceYears ?? 0;
        document.getElementById("edit-username").value = professional.username || "";
        document.getElementById("edit-active").value = String(professional.active !== false);
        modal.hidden = false;
        modal.classList.add("visible");
        document.getElementById("edit-name").focus();
    }

    function closeEditModal() {
        modal.hidden = true;
        modal.classList.remove("visible");
        professionalBeingEdited = null;
    }

    function openDeleteModal(professional) {
        professionalPendingDeletion = professional;
        deleteName.textContent = professional.name;
        deleteModal.hidden = false;
    }

    function closeDeleteModal() {
        deleteModal.hidden = true;
        professionalPendingDeletion = null;
    }

    function render(items = professionals) {
        if (!items.length) {
            list.innerHTML = `<div class="professional-empty"><span class="professional-empty-icon">♙</span><strong>Nenhum profissional encontrado</strong><span>Confira os filtros informados ou cadastre uma nova profissional.</span></div>`;
            return;
        }

        list.innerHTML = items.map(professional => `
            <article class="professional-card">
                <div class="professional-top"><span class="big-avatar">${escapeHtml(initials(professional.name))}</span><span class="status-dot">${professional.active === false ? "Inativa" : "Ativa"}</span></div>
                <h2>${escapeHtml(professional.name)}</h2><p>${escapeHtml(professional.specialty)}</p>
                <div class="professional-meta"><span>✦ ${escapeHtml(professional.experienceYears ?? 0)} anos de experiência</span><span>✉ ${escapeHtml(professional.email)}</span></div>
                <div class="card-actions"><button type="button" data-action="edit" data-id="${escapeHtml(professional.id)}">EDITAR</button><button type="button" data-action="delete" data-id="${escapeHtml(professional.id)}">EXCLUIR</button></div>
            </article>
        `).join("");
    }

    // O backend só encontra pelo nome completo (searchName é busca exata).
    // Para achar por parte do nome ("anny" -> "Anny Gabrielly"), a lista completa é
    // carregada uma vez e filtrada aqui. Ela é descartada após editar ou excluir.
    let allProfessionalsRequest = null;

    function allProfessionals() {
        if (!allProfessionalsRequest) {
            allProfessionalsRequest = professionalApi.list().catch(error => {
                allProfessionalsRequest = null;
                throw error;
            });
        }
        return allProfessionalsRequest;
    }

    function forgetAllProfessionals() {
        allProfessionalsRequest = null;
    }

    // Minúsculas e sem acento: "Ánny" e "anny" são iguais na busca.
    function normalizeText(value) {
        return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    }

    async function searchByName(query) {
        const wanted = normalizeText(query);
        const items = await allProfessionals();
        return items
            .filter(item => normalizeText(item.name).includes(wanted))
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
    }

    // Ignora respostas antigas quando a pessoa continua digitando.
    let lastSearch = 0;

    async function loadProfessionals() {
        const searchId = ++lastSearch;
        setStatus("Carregando profissionais...");
        list.setAttribute("aria-busy", "true");
        try {
            const query = search.value.trim();
            if (!query && !specialty.value) {
                professionals = [];
                render();
                setStatus("Selecione um serviço ou informe um nome para pesquisar.", "info");
                return;
            }
            if (query && query.length < 2) {
                professionals = [];
                render();
                setStatus("Digite pelo menos 2 caracteres para pesquisar pelo nome.", "info");
                return;
            }
            const found = query
                ? await searchByName(query)
                : await professionalApi.search("specialty", specialty.value);
            if (searchId !== lastSearch) return;
            professionals = found;
            if (query && specialty.value) {
                professionals = professionals.filter(item => item.specialty === specialty.value);
            }
            render(professionals);
            setStatus(professionals.length ? `${professionals.length} profissional(is) encontrado(s).` : "Nenhum profissional encontrado.");
        } catch (error) {
            if (searchId !== lastSearch) return;
            professionals = [];
            list.innerHTML = "";
            setStatus("");
            showNotification(`${error.message || "Não foi possível carregar os profissionais."} Verifique se a API está disponível e tente novamente.`, "error");
        } finally {
            list.removeAttribute("aria-busy");
        }
    }

    search.addEventListener("search", loadProfessionals);
    search.addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(loadProfessionals, 350);
    });
    search.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            loadProfessionals();
        }
    });
    specialty.addEventListener("change", loadProfessionals);
    list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const professional = professionals.find(item => String(item.id) === button.dataset.id);
        if (!professional) return;
        if (button.dataset.action === "edit") {
            openEditModal(professional);
            return;
        }
        if (button.dataset.action === "delete") openDeleteModal(professional);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!professionalBeingEdited) return;
        const saveButton = form.querySelector("button[type=submit]");
        saveButton.disabled = true;
        formError.textContent = "";
        const updatedProfessional = {
            ...professionalBeingEdited,
            name: document.getElementById("edit-name").value.trim(),
            specialty: document.getElementById("edit-specialty").value,
            phone: document.getElementById("edit-phone").value.trim(),
            email: document.getElementById("edit-email").value.trim(),
            cpf: document.getElementById("edit-cpf").value.trim(),
            experienceYears: Number(document.getElementById("edit-experience").value),
            username: document.getElementById("edit-username").value.trim(),
            active: document.getElementById("edit-active").value === "true"
        };
        try {
            await professionalApi.update(updatedProfessional);
            forgetAllProfessionals();
            closeEditModal();
            showNotification("Profissional atualizada com sucesso.", "success");
            await loadProfessionals();
        } catch (error) {
            formError.textContent = error.message || "Não foi possível atualizar a profissional.";
        } finally {
            saveButton.disabled = false;
        }
    });
    document.getElementById("close-professional-modal").addEventListener("click", closeEditModal);
    document.getElementById("cancel-professional-modal").addEventListener("click", closeEditModal);
    modal.addEventListener("click", event => {
        if (event.target === modal) closeEditModal();
    });
    document.querySelectorAll("[data-close-professional-delete]").forEach(button => button.addEventListener("click", closeDeleteModal));
    confirmDelete.addEventListener("click", async () => {
        if (!professionalPendingDeletion) return;
        const professional = professionalPendingDeletion;
        closeDeleteModal();
        try {
            await professionalApi.remove(professional.id);
            forgetAllProfessionals();
            showNotification("Profissional excluída com sucesso.", "success");
            await loadProfessionals();
        } catch (error) {
            showNotification(error.message || "Não foi possível excluir a profissional.", "error");
        }
    });

    loadSpecialtyOptions();
    loadProfessionals();
});

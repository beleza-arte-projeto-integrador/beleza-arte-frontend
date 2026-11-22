document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("formCadastroProfissional");
    const fields = {
        name: document.getElementById("nome"),
        cpf: document.getElementById("cpf"),
        phone: document.getElementById("telefone"),
        email: document.getElementById("email"),
        specialty: document.getElementById("especialidade"),
        experience: document.getElementById("experiencia"),
        username: document.getElementById("usuario"),
        password: document.getElementById("senha"),
        confirmation: document.getElementById("confirmarSenha"),
        terms: document.getElementById("termos")
    };
    const message = document.getElementById("mensagemCadastro");
    const editId = new URLSearchParams(window.location.search).get("id");
    const isAdminForm = Boolean(document.querySelector(".admin-submit"));
    let editingProfessional = null;

    function setPasswordVisible(button, visible) {
        const field = document.getElementById(button.dataset.target);
        if (!field) return;
        field.type = visible ? "text" : "password";
        button.textContent = visible ? "🙈" : "👁";
        button.setAttribute("aria-label", visible ? "Ocultar senha" : "Mostrar senha");
    }
    const passwordToggles = document.querySelectorAll(".mostrar-senha");
    passwordToggles.forEach(button => {
        setPasswordVisible(button, false);
        button.addEventListener("click", () => {
            const field = document.getElementById(button.dataset.target);
            setPasswordVisible(button, field?.type === "password");
        });
    });
    form.addEventListener("reset", () => passwordToggles.forEach(button => setPasswordVisible(button, false)));

    function onlyNumbers(value) { return value.replace(/\D/g, ""); }
    function showMessage(text, type) {
        message.className = `mensagem ${type}-mensagem`;
        message.textContent = text;
    }
    function error(field, id, text) {
        field.classList.add("invalido");
        document.getElementById(id).textContent = text;
    }
    function clearError(field, id) {
        field.classList.remove("invalido");
        document.getElementById(id).textContent = "";
    }
    function experienceYears(value) {
        const text = String(value).trim();
        return /^\d+$/.test(text) ? Number(text) : null;
    }
    function payload() {
        const value = {
            ...(editingProfessional || {}),
            name: fields.name.value.trim(),
            specialty: fields.specialty.value.trim(),
            phone: fields.phone.value.trim(),
            email: fields.email.value.trim(),
            cpf: fields.cpf.value.trim(),
            experienceYears: experienceYears(fields.experience.value),
            username: fields.username.value.trim(),
            active: editingProfessional?.active ?? true
        };
        if (fields.password.value) value.password = fields.password.value;
        return value;
    }
    function validate() {
        let valid = true;
        if (fields.name.value.trim().length < 5) { error(fields.name, "erro-nome", "Digite seu nome completo."); valid = false; } else clearError(fields.name, "erro-nome");
        if (onlyNumbers(fields.cpf.value).length !== 11) { error(fields.cpf, "erro-cpf", "CPF deve ter 11 dígitos."); valid = false; } else clearError(fields.cpf, "erro-cpf");
        if (onlyNumbers(fields.phone.value).length < 10) { error(fields.phone, "erro-telefone", "Digite um telefone válido."); valid = false; } else clearError(fields.phone, "erro-telefone");
        if (!fields.email.checkValidity()) { error(fields.email, "erro-email", "Digite um e-mail válido."); valid = false; } else clearError(fields.email, "erro-email");
        if (!fields.specialty.value.trim()) { error(fields.specialty, "erro-especialidade", "Selecione o serviço da especialidade."); valid = false; } else clearError(fields.specialty, "erro-especialidade");
        const years = experienceYears(fields.experience.value);
        if (years === null || years > 80) { error(fields.experience, "erro-experiencia", "Informe os anos de experiência (número inteiro de 0 a 80)."); valid = false; } else clearError(fields.experience, "erro-experiencia");
        if (!/^[a-z0-9._-]{4,30}$/.test(fields.username.value)) { error(fields.username, "erro-usuario", "O usuário deve ter de 4 a 30 caracteres."); valid = false; } else clearError(fields.username, "erro-usuario");
        const passwordRequired = !editingProfessional;
        if ((passwordRequired || fields.password.value) && !(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(fields.password.value))) { error(fields.password, "erro-senha", "A senha deve ter pelo menos 8 caracteres, uma maiúscula, uma minúscula e um número."); valid = false; } else clearError(fields.password, "erro-senha");
        if (fields.password.value !== fields.confirmation.value) { error(fields.confirmation, "erro-confirmarSenha", "As senhas não são iguais."); valid = false; } else clearError(fields.confirmation, "erro-confirmarSenha");
        if (!editingProfessional && !fields.terms.checked) { document.getElementById("erro-termos").textContent = "Você precisa aceitar os termos."; valid = false; } else document.getElementById("erro-termos").textContent = "";
        return valid;
    }
    function fill(professional) {
        fields.name.value = professional.name || "";
        fields.cpf.value = professional.cpf || "";
        fields.phone.value = professional.phone || "";
        fields.email.value = professional.email || "";
        fields.specialty.value = professional.specialty || "";
        fields.experience.value = professional.experienceYears ?? "";
        fields.username.value = professional.username || "";
        if (isAdminForm) {
            document.querySelector("h1").textContent = "Editar profissional";
            document.querySelector(".page-heading p:not(.eyebrow)").textContent = "Atualize os dados da profissional.";
            document.querySelector(".admin-form-heading h2").textContent = "Editar cadastro";
            document.querySelector(".admin-submit").firstChild.textContent = "SALVAR ALTERAÇÕES ";
        }
    }
    function addSpecialtyOption(value) {
        if (!value || [...fields.specialty.options].some(option => option.value === value)) return;
        fields.specialty.add(new Option(value, value));
    }
    // Especialidades = nomes dos serviços cadastrados no backend (ordem alfabética).
    // A lista do navegador ganha barra de rolagem sozinha quando não cabe na tela.
    async function loadSpecialties() {
        fields.specialty.disabled = true;
        try {
            const names = await professionalApi.specialties();
            fields.specialty.options[0].textContent = names.length ? "Selecione um serviço" : "Nenhum serviço cadastrado";
            names.forEach(addSpecialtyOption);
            if (!names.length) showMessage("Cadastre ao menos um serviço para definir a especialidade.", "erro");
        } catch {
            fields.specialty.options[0].textContent = "Não foi possível carregar";
            showMessage("Não foi possível carregar os serviços. Verifique se a API está disponível.", "erro");
        } finally {
            fields.specialty.disabled = false;
        }
    }
    const specialtiesReady = loadSpecialties();

    if (editId) {
        try {
            const [professionals] = await Promise.all([professionalApi.list(), specialtiesReady]);
            editingProfessional = professionals.find(item => String(item.id) === editId);
            if (!editingProfessional) throw new Error("Profissional não encontrada.");
            addSpecialtyOption(editingProfessional.specialty); // mantém valores antigos fora da lista
            fill(editingProfessional);
        } catch (loadError) {
            showMessage(loadError.message, "erro");
            form.querySelector("button[type=submit]").disabled = true;
        }
    }
    form.addEventListener("submit", async event => {
        event.preventDefault();
        if (!validate()) { showMessage("Corrija os campos destacados antes de continuar.", "erro"); return; }
        const submit = form.querySelector("button[type=submit]");
        submit.disabled = true;
        let succeeded = false;
        try {
            const saved = editId ? await professionalApi.update(payload()) : await professionalApi.create(payload());
            const safe = professionalApi.withoutPassword(saved?.data || saved);
            if (safe?.id) localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(safe));
            succeeded = true;
            showMessage(editId ? "Profissional atualizada com sucesso." : "Profissional cadastrada com sucesso.", "sucesso");
            if (!editId) form.reset();
            setTimeout(() => { window.location.href = isAdminForm ? "profissionais-admin.html" : "meus-agendamentos.html"; }, 800);
        } catch (saveError) {
            showMessage(saveError.message || "Não foi possível salvar a profissional.", "erro");
        } finally {
            if (!succeeded) submit.disabled = false; // após sucesso, mantém desabilitado até o redirecionamento
        }
    });
});

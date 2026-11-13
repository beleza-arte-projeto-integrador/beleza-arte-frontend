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
        const match = String(value).match(/\d+/);
        if (String(value).toLowerCase().includes("menos")) return 0;
        if (String(value).toLowerCase().includes("mais")) return 11;
        return match ? Number(match[0]) : Number(value) || 0;
    }
    function experienceLabel(value) {
        const years = Number(value);
        if (years < 1) return "Menos de 1 ano";
        if (years <= 3) return "1 a 3 anos";
        if (years <= 7) return "4 a 7 anos";
        if (years <= 10) return "8 a 10 anos";
        return "Mais de 10 anos";
    }
    function payload() {
        const value = {
            ...(editingProfessional || {}),
            name: fields.name.value.trim(),
            specialty: fields.specialty.value,
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
        if (onlyNumbers(fields.cpf.value).length !== 11) { error(fields.cpf, "erro-cpf", "Digite um CPF válido."); valid = false; } else clearError(fields.cpf, "erro-cpf");
        if (onlyNumbers(fields.phone.value).length < 10) { error(fields.phone, "erro-telefone", "Digite um telefone válido."); valid = false; } else clearError(fields.phone, "erro-telefone");
        if (!fields.email.checkValidity()) { error(fields.email, "erro-email", "Digite um e-mail válido."); valid = false; } else clearError(fields.email, "erro-email");
        if (!fields.specialty.value) { error(fields.specialty, "erro-especialidade", "Selecione sua especialidade."); valid = false; } else clearError(fields.specialty, "erro-especialidade");
        if (!fields.experience.value) { error(fields.experience, "erro-experiencia", "Selecione seu tempo de experiência."); valid = false; } else clearError(fields.experience, "erro-experiencia");
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
        fields.experience.value = experienceLabel(professional.experienceYears);
        fields.username.value = professional.username || "";
        if (isAdminForm) {
            document.querySelector("h1").textContent = "Editar profissional";
            document.querySelector(".page-heading p:not(.eyebrow)").textContent = "Atualize os dados da profissional.";
            document.querySelector(".admin-form-heading h2").textContent = "Editar cadastro";
            document.querySelector(".admin-submit").firstChild.textContent = "SALVAR ALTERAÇÕES ";
        }
    }
    if (editId) {
        try {
            const professionals = await professionalApi.list();
            editingProfessional = professionals.find(item => String(item.id) === editId);
            if (!editingProfessional) throw new Error("Profissional não encontrada.");
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
        try {
            const saved = editId ? await professionalApi.update(payload()) : await professionalApi.create(payload());
            const safe = professionalApi.withoutPassword(saved?.data || saved);
            if (safe?.id) localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(safe));
            showMessage(editId ? "Profissional atualizada com sucesso." : "Profissional cadastrada com sucesso.", "sucesso");
            setTimeout(() => { window.location.href = isAdminForm ? "profissionais-admin.html" : "meus-agendamentos.html"; }, 800);
        } catch (saveError) {
            showMessage(saveError.message || "Não foi possível salvar a profissional.", "erro");
        } finally {
            submit.disabled = false;
        }
    });
});

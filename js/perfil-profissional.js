// Edição do cadastro pela própria profissional logada (PUT /updateProfessionals).
// Requer service-api.js, professional-api.js e auth-profissional.js.
//
// Cuidados com o backend:
// - O CPF vem mascarado (***.000.000-**) e não pode ser alterado aqui. Ele é reenviado
//   exatamente como veio: o backend mantém o CPF original. NÃO omitir o campo, pois
//   sem ele o backend apaga o CPF.
// - A senha não é editada aqui (o backend ainda não tem endpoint de login) e
//   nunca é enviada na atualização.
document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("formPerfilProfissional");
    const nome = document.getElementById("nome");
    const cpf = document.getElementById("cpf");
    const telefone = document.getElementById("telefone");
    const email = document.getElementById("email");
    const especialidade = document.getElementById("especialidade");
    const experiencia = document.getElementById("experiencia");
    const usuario = document.getElementById("usuario");
    const mensagem = document.getElementById("mensagemPerfil");
    const botaoSalvar = form.querySelector("button[type=submit]");

    function mostrarMensagem(texto, tipo) {
        mensagem.className = `mensagem ${tipo}-mensagem`;
        mensagem.textContent = texto;
    }

    let profissionalAtual = null;
    try {
        profissionalAtual = JSON.parse(localStorage.getItem("belezaArteProfissionalAtual"));
    } catch {
        profissionalAtual = null;
    }
    // Sem login, auth-profissional.js já redireciona para a tela de login.
    if (!profissionalAtual) return;

    botaoSalvar.disabled = true;

    function adicionarEspecialidade(valor) {
        if (!valor || [...especialidade.options].some(option => option.value === valor)) return;
        especialidade.add(new Option(valor, valor));
    }

    // Especialidades = nomes dos serviços cadastrados no backend (mesma regra do cadastro).
    async function carregarEspecialidades() {
        try {
            const nomes = await professionalApi.specialties();
            especialidade.options[0].textContent = nomes.length ? "Selecione sua especialidade" : "Nenhum serviço cadastrado";
            nomes.forEach(adicionarEspecialidade);
        } catch {
            especialidade.options[0].textContent = "Selecione sua especialidade";
        }
    }

    let profissional;
    try {
        [profissional] = await Promise.all([
            professionalApi.findById(profissionalAtual.id),
            carregarEspecialidades()
        ]);
    } catch (error) {
        mostrarMensagem(error.message || "Não foi possível carregar seu cadastro.", "erro");
        return;
    }

    // Cadastro excluído ou inativo: auth-profissional.js desloga e redireciona.
    if (!profissional) {
        mostrarMensagem("Não foi possível localizar seu cadastro.", "erro");
        return;
    }

    nome.value = profissional.name || "";
    cpf.value = profissional.cpf || "";
    telefone.value = profissional.phone || "";
    email.value = profissional.email || "";
    adicionarEspecialidade(profissional.specialty); // mantém especialidades antigas fora da lista
    especialidade.value = profissional.specialty || "";
    experiencia.value = profissional.experienceYears ?? "";
    usuario.value = profissional.username || "";
    botaoSalvar.disabled = false;

    function somenteNumeros(valor) {
        return valor.replace(/\D/g, "");
    }

    telefone.addEventListener("input", () => {
        let valor = somenteNumeros(telefone.value).slice(0, 11);

        if (valor.length <= 10) {
            valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
            valor = valor.replace(/(\d{4})(\d)/, "$1-$2");
        } else {
            valor = valor.replace(/(\d{2})(\d)/, "($1) $2");
            valor = valor.replace(/(\d{5})(\d)/, "$1-$2");
        }

        telefone.value = valor;
    });

    usuario.addEventListener("input", () => {
        usuario.value = usuario.value.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30);
    });

    function mostrarErro(campo, idErro, texto) {
        campo.classList.add("invalido");
        campo.classList.remove("valido");
        document.getElementById(idErro).textContent = texto;
    }

    function limparErro(campo, idErro) {
        campo.classList.remove("invalido");
        campo.classList.add("valido");
        document.getElementById(idErro).textContent = "";
    }

    function anosDeExperiencia() {
        const texto = String(experiencia.value).trim();
        return /^\d+$/.test(texto) ? Number(texto) : null;
    }

    function validar() {
        let valido = true;

        if (nome.value.trim().length < 5) {
            mostrarErro(nome, "erro-nome", "Digite seu nome completo.");
            valido = false;
        } else {
            limparErro(nome, "erro-nome");
        }

        if (somenteNumeros(telefone.value).length < 10) {
            mostrarErro(telefone, "erro-telefone", "Digite um telefone válido.");
            valido = false;
        } else {
            limparErro(telefone, "erro-telefone");
        }

        if (!email.value.trim() || !email.checkValidity()) {
            mostrarErro(email, "erro-email", "Digite um e-mail válido.");
            valido = false;
        } else {
            limparErro(email, "erro-email");
        }

        if (!especialidade.value) {
            mostrarErro(especialidade, "erro-especialidade", "Selecione sua especialidade.");
            valido = false;
        } else {
            limparErro(especialidade, "erro-especialidade");
        }

        const anos = anosDeExperiencia();
        if (anos === null || anos > 80) {
            mostrarErro(experiencia, "erro-experiencia", "Informe os anos de experiência (número inteiro de 0 a 80).");
            valido = false;
        } else {
            limparErro(experiencia, "erro-experiencia");
        }

        if (!/^[a-z0-9._-]{4,30}$/.test(usuario.value)) {
            mostrarErro(usuario, "erro-usuario", "O usuário deve ter de 4 a 30 caracteres.");
            valido = false;
        } else {
            limparErro(usuario, "erro-usuario");
        }

        return valido;
    }

    form.addEventListener("submit", async event => {
        event.preventDefault();
        mostrarMensagem("", "");
        mensagem.className = "mensagem";

        if (!validar()) {
            mostrarMensagem("Corrija os campos destacados antes de continuar.", "erro");
            document.querySelector(".invalido")?.focus();
            return;
        }

        const { password, senha: _senha, created, updated, ...dadosAtuais } = profissional;
        const profissionalAtualizada = {
            ...dadosAtuais,
            cpf: profissional.cpf, // reenviado como veio da API (ver comentário no topo)
            name: nome.value.trim(),
            phone: telefone.value.trim(),
            email: email.value.trim(),
            specialty: especialidade.value,
            experienceYears: anosDeExperiencia(),
            username: usuario.value.trim(),
            active: profissional.active ?? true
        };

        botaoSalvar.disabled = true;
        let salvou = false;
        try {
            const resposta = await professionalApi.update(profissionalAtualizada);
            const segura = professionalApi.withoutPassword(resposta?.data || resposta || profissionalAtualizada);
            localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(segura));
            salvou = true;
            mostrarMensagem("✓ Dados atualizados com sucesso!", "sucesso");
            setTimeout(() => { window.location.href = "meus-agendamentos.html"; }, 1000);
        } catch (error) {
            mostrarMensagem(error.message || "Não foi possível atualizar seus dados.", "erro");
        } finally {
            if (!salvou) botaoSalvar.disabled = false;
        }
    });
});

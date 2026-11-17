document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("formPerfilProfissional");
    const nome = document.getElementById("nome");
    const cpf = document.getElementById("cpf");
    const telefone = document.getElementById("telefone");
    const email = document.getElementById("email");
    const especialidade = document.getElementById("especialidade");
    const experiencia = document.getElementById("experiencia");
    const usuario = document.getElementById("usuario");
    const senha = document.getElementById("senha");
    const confirmarSenha = document.getElementById("confirmarSenha");
    const mensagem = document.getElementById("mensagemPerfil");
    const servicos = document.querySelectorAll('input[name="servicos"]');
    const profissionalAtual = JSON.parse(localStorage.getItem("belezaArteProfissionalAtual"));

    if (!profissionalAtual) {
        alert("Você precisa estar logada para acessar seu perfil.");
        window.location.href = "login-profissional.html";
        return;
    }

    let profissional;
    try {
        const profissionais = await professionalApi.list();
        profissional = profissionais.find(item => String(item.id) === String(profissionalAtual.id));
    } catch (error) {
        mensagem.className = "mensagem erro-mensagem";
        mensagem.textContent = error.message || "Não foi possível carregar seu cadastro.";
        return;
    }

    if (!profissional) {
        alert("Não foi possível localizar seu cadastro.");
        localStorage.removeItem("belezaArteProfissionalAtual");
        window.location.href = "login-profissional.html";
        return;
    }

    nome.value = profissional.name || "";
    cpf.value = profissional.cpf || "";
    telefone.value = profissional.phone || "";
    email.value = profissional.email || "";
    especialidade.value = profissional.specialty || "";
    experiencia.value = experienceLabel(profissional.experienceYears);
    usuario.value = profissional.username || "";

    function experienceLabel(value) {
        const years = Number(value);
        if (years < 1) return "Menos de 1 ano";
        if (years <= 3) return "1 a 3 anos";
        if (years <= 7) return "4 a 7 anos";
        if (years <= 10) return "8 a 10 anos";
        return "Mais de 10 anos";
    }

    function experienceYears(value) {
        const text = String(value).toLowerCase();
        if (text.includes("menos")) return 0;
        if (text.includes("mais")) return 11;
        return Number(text.match(/\d+/)?.[0] || 0);
    }

    const servicosSalvos = [];

    servicos.forEach(servico => {
        servico.checked = servicosSalvos.includes(servico.value);
    });

    function atualizarServicos() {
        const especialidadeSelecionada = especialidade.value;

        servicos.forEach(servico => {
            const permitidos = servico.dataset.especialidades ? servico.dataset.especialidades.split(",").map(item => item.trim()) : [];
            const label = servico.closest(".checkbox");

            if (!especialidadeSelecionada) {
                label.style.display = "none";
                servico.disabled = true;
                return;
            }

            if (permitidos.includes(especialidadeSelecionada)) {
                label.style.display = "flex";
                servico.disabled = false;
            } else {
                label.style.display = "none";
                servico.checked = false;
                servico.disabled = true;
            }
        });
    }

    especialidade.addEventListener("change", atualizarServicos);

    atualizarServicos();

    function somenteNumeros(valor) {
        return valor.replace(/\D/g, "");
    }

    cpf.addEventListener("input", () => {
        let valor = somenteNumeros(cpf.value).slice(0, 11);

        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
        valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");

        cpf.value = valor;
    });

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

    document.querySelectorAll(".mostrar-senha").forEach(botao => {
        botao.addEventListener("click", () => {
            const id = botao.dataset.target;
            const campo = document.getElementById(id);

            if (campo.type === "password") {
                campo.type = "text";
                botao.textContent = "🙈";
            } else {
                campo.type = "password";
                botao.textContent = "👁";
            }
        });
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

    form.addEventListener("submit", async event => {
        event.preventDefault();
        let valido = true;

        mensagem.className = "mensagem";
        mensagem.textContent = "";

        if (nome.value.trim().length < 5) {
            mostrarErro(nome, "erro-nome", "Digite seu nome completo.");
            valido = false;
        } else {
            limparErro(nome, "erro-nome");
        }

        const cpfNumeros = somenteNumeros(cpf.value);

        if (cpfNumeros.length !== 11) {
            mostrarErro(cpf, "erro-cpf", "Digite um CPF válido.");
            valido = false;
        } else {
            limparErro(cpf, "erro-cpf");
        }

        const telefoneNumeros = somenteNumeros(telefone.value);

        if (telefoneNumeros.length < 10) {
            mostrarErro(telefone, "erro-telefone", "Digite um telefone válido.");
            valido = false;
        } else {
            limparErro(telefone, "erro-telefone");
        }

        if (!email.checkValidity()) {
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

        if (!experiencia.value) {
            mostrarErro(experiencia, "erro-experiencia", "Selecione seu tempo de experiência.");
            valido = false;
        } else {
            limparErro(experiencia, "erro-experiencia");
        }

        const servicosSelecionados = document.querySelectorAll('input[name="servicos"]:checked');

        if (servicosSelecionados.length === 0) {
            document.getElementById("erro-servicos").textContent = "Selecione pelo menos um serviço.";
            valido = false;
        } else {
            document.getElementById("erro-servicos").textContent = "";
        }

        const regexUsuario = /^[a-z0-9._-]{4,30}$/;

        if (!regexUsuario.test(usuario.value)) {
            mostrarErro(usuario, "erro-usuario", "O usuário deve ter de 4 a 30 caracteres.");
            valido = false;
        } else {
            limparErro(usuario, "erro-usuario");
        }

        if (senha.value) {
            const senhaValida = senha.value.length >= 8 && /[A-Z]/.test(senha.value) && /[a-z]/.test(senha.value) && /[0-9]/.test(senha.value);

            if (!senhaValida) {
                mostrarErro(senha, "erro-senha", "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.");
                valido = false;
            } else {
                limparErro(senha, "erro-senha");
            }

            if (confirmarSenha.value !== senha.value) {
                mostrarErro(confirmarSenha, "erro-confirmarSenha", "As senhas não são iguais.");
                valido = false;
            } else {
                limparErro(confirmarSenha, "erro-confirmarSenha");
            }
        } else {
            document.getElementById("erro-senha").textContent = "";
            document.getElementById("erro-confirmarSenha").textContent = "";
        }

        if (!valido) {
            mensagem.className = "mensagem erro-mensagem";
            mensagem.textContent = "Corrija os campos destacados antes de continuar.";

            const primeiroErro = document.querySelector(".invalido");

            if (primeiroErro) {
                primeiroErro.focus();
            }

            return;
        }

        const profissionalAtualizada = {
            ...profissional,
            name: nome.value.trim(),
            cpf: cpf.value,
            phone: telefone.value,
            email: email.value.trim(),
            specialty: especialidade.value,
            experienceYears: experienceYears(experiencia.value),
            username: usuario.value.trim()
        };
        if (senha.value) profissionalAtualizada.password = senha.value;

        try {
            const resposta = await professionalApi.update(profissionalAtualizada);
            const segura = professionalApi.withoutPassword(resposta?.data || resposta || profissionalAtualizada);
            localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(segura));
            mensagem.className = "mensagem sucesso-mensagem";
            mensagem.textContent = "✓ Dados atualizados com sucesso!";
            setTimeout(() => { window.location.href = "meus-agendamentos.html"; }, 1000);
        } catch (error) {
            mensagem.className = "mensagem erro-mensagem";
            mensagem.textContent = error.message || "Não foi possível atualizar seus dados.";
        }
    });
});
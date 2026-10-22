document.addEventListener("DOMContentLoaded", () => {
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

    let profissionais = JSON.parse(localStorage.getItem("belezaArteProfissionais")) || [];
    const indiceProfissional = profissionais.findIndex(profissional => profissional.id === profissionalAtual.id);

    if (indiceProfissional === -1) {
        alert("Não foi possível localizar seu cadastro.");
        localStorage.removeItem("belezaArteProfissionalAtual");
        window.location.href = "login-profissional.html";
        return;
    }

    const profissional = profissionais[indiceProfissional];

    nome.value = profissional.nome || "";
    cpf.value = profissional.cpf || "";
    telefone.value = profissional.telefone || "";
    email.value = profissional.email || "";
    especialidade.value = profissional.especialidade || "";
    experiencia.value = profissional.experiencia || "";
    usuario.value = profissional.usuario || "";

    const servicosSalvos = profissional.servicos || [];

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

    function usuarioJaExiste(nomeUsuario) {
        return profissionais.some(profissional => {
            if (profissional.id === profissionalAtual.id) {
                return false;
            }

            return (profissional.usuario.toLowerCase() === nomeUsuario.toLowerCase());
        });
    }

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

    form.addEventListener("submit", event => {
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
        } else if (usuarioJaExiste(usuario.value)) {
            mostrarErro(usuario, "erro-usuario", "Este nome de usuário já está sendo usado.");
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

        const novosServicos = Array.from(servicosSelecionados).map(checkbox => checkbox.value);

        const profissionalAtualizada = {
            ...profissional, nome: nome.value.trim(), cpf: cpf.value, telefone: telefone.value, email: email.value.trim(), especialidade: especialidade.value, experiencia: experiencia.value, servicos: novosServicos, usuario: usuario.value.trim()
        };

        if (senha.value) {
            profissionalAtualizada.senha = senha.value;
        }

        profissionais[indiceProfissional] = profissionalAtualizada;

        localStorage.setItem("belezaArteProfissionais", JSON.stringify(profissionais));
        localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(profissionalAtualizada));

        mensagem.className = "mensagem sucesso-mensagem";
        mensagem.textContent = "✓ Dados atualizados com sucesso!";

        setTimeout(() => {
            window.location.href = "meus-agendamentos.html";
        }, 1000);
    });
});
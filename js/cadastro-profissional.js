
document.addEventListener(
    "DOMContentLoaded",
    () => {
        const form = document.getElementById("formCadastroProfissional");
        const nome = document.getElementById("nome");
        const cpf = document.getElementById("cpf");
        const telefone = document.getElementById("telefone");
        const email = document.getElementById("email");
        const especialidade = document.getElementById("especialidade");
        const servicos = document.querySelectorAll('input[name="servicos"]');

        function atualizarServicosPorEspecialidade() {
            const especialidadeSelecionada = especialidade.value;

            servicos.forEach(servico => {
                const especialidadesPermitidas = servico.dataset.especialidades ? servico.dataset.especialidades.split(",").map(item => item.trim()) : [];
                const permitido = especialidadesPermitidas.includes(especialidadeSelecionada);
                const label = servico.closest(".checkbox");

                if (!especialidadeSelecionada) {
                    label.style.display = "none";
                    servico.checked = false;
                    servico.disabled = true;
                    return;
                }

                if (permitido) {
                    label.style.display = "flex";
                    servico.disabled = false;
                } else {
                    label.style.display = "none";
                    servico.checked = false;
                    servico.disabled = true;
                }
            });

            document.getElementById("erro-servicos").textContent = "";
        }

        especialidade.addEventListener("change", atualizarServicosPorEspecialidade);

        atualizarServicosPorEspecialidade();

        const experiencia = document.getElementById("experiencia");
        const usuario = document.getElementById("usuario");
        const senha = document.getElementById("senha");
        const confirmarSenha = document.getElementById("confirmarSenha");
        const termos = document.getElementById("termos");
        const mensagem = document.getElementById("mensagemCadastro");
        const barraSenha = document.getElementById("barraSenha");
        const textoForcaSenha = document.getElementById("textoForcaSenha");

        function somenteNumeros(valor) {
            return valor.replace(/\D/g, "");
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

        function validarCPF(valor) {
            const cpfNumeros = somenteNumeros(valor);

            if (cpfNumeros.length !== 11) {
                return false;
            }

            if (/^(\d)\1{10}$/.test(cpfNumeros)) {
                return false;
            }

            let soma = 0;

            for (let i = 0; i < 9; i++) {
                soma += Number(cpfNumeros.charAt(i)) * (10 - i);
            }

            let resto = (soma * 10) % 11;

            if (resto === 10 || resto === 11) {
                resto = 0;
            }

            if (resto !== Number(cpfNumeros.charAt(9))) {
                return false;
            }

            soma = 0;

            for (let i = 0; i < 10; i++) {
                soma += Number(cpfNumeros.charAt(i)) * (11 - i);
            }

            resto = (soma * 10) % 11;

            if (resto === 10 || resto === 11) {
                resto = 0;
            }

            return (resto === Number(cpfNumeros.charAt(10)));
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
            usuario.value = usuario.value.toLowerCase().replace(/[^a-z0-9._-]/g,).slice(0, 30);
        });

        function analisarSenha(valor) {
            let pontos = 0;

            if (valor.length >= 8) {
                pontos++;
            }

            if (/[A-Z]/.test(valor)) {
                pontos++;
            }

            if (/[a-z]/.test(valor)) {
                pontos++;
            }

            if (/[0-9]/.test(valor)) {
                pontos++;
            }

            if (/[^A-Za-z0-9]/.test(valor)) {
                pontos++;
            }

            return pontos;
        }

        senha.addEventListener("input", () => {
            const pontos = analisarSenha(senha.value);
            const porcentagem = (pontos / 5) * 100;
            barraSenha.style.width = porcentagem + "%";

            if (pontos <= 1) {
                textoForcaSenha.textContent = "Senha muito fraca.";
            } else if (pontos === 2) {
                textoForcaSenha.textContent = "Senha fraca.";
            } else if (pontos === 3) {
                textoForcaSenha.textContent = "Senha média.";
            } else if (pontos === 4) {
                textoForcaSenha.textContent = "Senha forte.";
            } else {
                textoForcaSenha.textContent = "Senha muito forte.";
            }
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
            const profissionais = JSON.parse(localStorage.getItem("belezaArteProfissionais")) || [];
            return profissionais.some(profissional => profissional.usuario.toLowerCase() === nomeUsuario.toLowerCase());
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

            if (!validarCPF(cpf.value)) {
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
                mostrarErro(usuario, "erro-usuario", "O usuário deve ter de 4 a 30 caracteres e usar apenas letras, números, ponto, hífen ou underline.");
                valido = false;
            } else if (usuarioJaExiste(usuario.value)) {
                mostrarErro(usuario, "erro-usuario", "Este nome de usuário já está cadastrado.");
                valido = false;
            } else {
                limparErro(usuario, "erro-usuario");
            }

            const senhaValida = senha.value.length >= 8 && /[A-Z]/.test(senha.value) && /[a-z]/.test(senha.value) && /[0-9]/.test(senha.value);

            if (!senhaValida) {
                mostrarErro(senha, "erro-senha", "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número.");
                valido = false;
            } else {
                limparErro(senha, "erro-senha");
            }

            if (confirmarSenha.value !== senha.value || !confirmarSenha.value) {
                mostrarErro(confirmarSenha, "erro-confirmarSenha", "As senhas não são iguais.");
                valido = false;
            } else {
                limparErro(confirmarSenha, "erro-confirmarSenha");
            }

            if (!termos.checked) {
                document.getElementById("erro-termos").textContent = "Você precisa aceitar os termos.";
                valido = false;
            } else {
                document.getElementById("erro-termos").textContent = "";
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

            const profissionais = JSON.parse(localStorage.getItem("belezaArteProfissionais")) || [];
            const novoProfissional = {
                id: Date.now(),
                nome: nome.value.trim(),
                cpf: cpf.value,
                telefone: telefone.value,
                email: email.value.trim(),
                especialidade: especialidade.value,
                experiencia: experiencia.value,
                servicos: Array.from(servicosSelecionados).map(checkbox => checkbox.value),
                usuario: usuario.value,
                senha: senha.value,
                criadoEm: new Date().toISOString(),
                status: "Ativo"
            };

            profissionais.push(novoProfissional);
            localStorage.setItem("belezaArteProfissionais", JSON.stringify(profissionais));

            mensagem.className = "mensagem sucesso-mensagem";
            mensagem.textContent = "✓ Profissional cadastrada com sucesso!";

            localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(novoProfissional));

            setTimeout(() => {
                window.location.href = "meus-agendamentos.html";
            }, 1000);
        });
    }
);
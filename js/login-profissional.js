document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formLoginProfissional");
    const usuario = document.getElementById("usuario");
    const senha = document.getElementById("senha");
    const mensagem = document.getElementById("mensagemLogin");

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const usuarioDigitado = usuario.value.trim().toLowerCase();
        const senhaDigitada = senha.value;

        if (!usuarioDigitado || !senhaDigitada) {
            mensagem.className = "mensagem erro";
            mensagem.textContent = "Preencha usuário e senha.";
            return;
        }

        const profissionais = JSON.parse(localStorage.getItem("belezaArteProfissionais")) || [];
        const profissionalEncontrada = profissionais.find(profissional => profissional.usuario.toLowerCase() === usuarioDigitado && profissional.senha === senhaDigitada);

        if (!profissionalEncontrada) {
            mensagem.className = "mensagem erro";
            mensagem.textContent = "Usuário ou senha incorretos.";
            return;
        }

        localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(profissionalEncontrada));

        mensagem.className = "mensagem sucesso";
        mensagem.textContent = "Login realizado com sucesso!";

        setTimeout(() => {
            window.location.href = "meus-agendamentos.html";
        }, 500);
    });
});
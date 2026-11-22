// Login da profissional pelo nome de usuário cadastrado no backend.
// O backend não tem endpoint de login e não devolve a senha, então só é possível
// conferir se o usuário existe e está ativo. Requer service-api.js e professional-api.js.
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formLoginProfissional");
    const usuario = document.getElementById("usuario");
    const mensagem = document.getElementById("mensagemLogin");
    const botao = form.querySelector("button[type=submit]");

    function mostrarMensagem(texto, tipo) {
        mensagem.className = `mensagem ${tipo}`;
        mensagem.textContent = texto;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const usuarioDigitado = usuario.value.trim();
        if (!usuarioDigitado) {
            mostrarMensagem("Preencha o nome de usuário.", "erro");
            return;
        }

        botao.disabled = true;
        let profissional;
        try {
            profissional = await professionalApi.findByUsername(usuarioDigitado);
        } catch (erro) {
            mostrarMensagem(erro.message || "Não foi possível verificar o usuário. Tente novamente.", "erro");
            botao.disabled = false;
            return;
        }

        if (!profissional) {
            mostrarMensagem("Usuário não encontrado.", "erro");
            botao.disabled = false;
            return;
        }

        if (profissional.active === false) {
            mostrarMensagem("Este cadastro está inativo. Procure a administração do salão.", "erro");
            botao.disabled = false;
            return;
        }

        localStorage.setItem("belezaArteProfissionalAtual", JSON.stringify(professionalApi.withoutPassword(profissional)));
        mostrarMensagem("Login realizado com sucesso!", "sucesso");

        setTimeout(() => {
            window.location.href = "meus-agendamentos.html";
        }, 500);
    });
});

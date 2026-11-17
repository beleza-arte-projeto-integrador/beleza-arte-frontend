document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formLoginAdmin");
    const email = document.getElementById("admin-email");
    const password = document.getElementById("admin-password");
    const message = document.getElementById("admin-login-message");

    const demoUser = {
        email: "admin@belezaearte.com.br",
        password: "admin123"
    };

    form.addEventListener("submit", event => {
        event.preventDefault();

        if (email.value.trim().toLowerCase() !== demoUser.email || password.value !== demoUser.password) {
            message.textContent = "E-mail ou senha incorretos. Use os dados de demonstração exibidos acima.";
            message.className = "admin-login-message visible error";
            return;
        }

        message.textContent = "Acesso autorizado. Redirecionando...";
        message.className = "admin-login-message visible success";
        window.setTimeout(() => {
            window.location.href = "painel-admin.html";
        }, 350);
    });
});

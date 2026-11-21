// Botão "Entre em contato com a gente": abre o WhatsApp da administração com uma
// mensagem pronta identificando a profissional logada. Basta ter na página um link
// com id="botao-whatsapp-admin".
(function () {
    const NUMERO_ADMIN = "5581988642586"; // 55 (Brasil) + DDD 81 + número

    function profissionalLogada() {
        try {
            return JSON.parse(localStorage.getItem("belezaArteProfissionalAtual")) || {};
        } catch {
            return {};
        }
    }

    function montarMensagem() {
        const profissional = profissionalLogada();
        const nome = String(profissional.name || profissional.nome || "").trim();
        const usuario = String(profissional.username || profissional.usuario || "").trim();

        if (!nome) return "Olá! Sou profissional do Beleza & Arte e gostaria de falar com a administração.";
        const identificacao = usuario ? `${nome} (usuário: ${usuario})` : nome;
        return `Olá! Sou a ${identificacao}, profissional do Beleza & Arte, e gostaria de falar com a administração.`;
    }

    function montarLink() {
        return `https://wa.me/${NUMERO_ADMIN}?text=${encodeURIComponent(montarMensagem())}`;
    }

    const botao = document.getElementById("botao-whatsapp-admin");
    if (!botao) return;

    botao.href = montarLink();

    // Monta o link na hora do clique para usar sempre os dados atuais da profissional.
    botao.addEventListener("click", () => {
        botao.href = montarLink();
    });

    // QR code (biblioteca qrcodejs): quem escanear com o celular cai direto no WhatsApp
    // com a mensagem pronta. Se a biblioteca não carregar, o cartão continua clicável.
    const areaQr = document.getElementById("qrcode-whatsapp");
    if (areaQr && typeof QRCode !== "undefined") {
        new QRCode(areaQr, {
            text: montarLink(),
            width: 120,
            height: 120,
            colorDark: "#111111",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    } else if (areaQr) {
        areaQr.hidden = true;
    }
})();

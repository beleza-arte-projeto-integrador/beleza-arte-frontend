document.addEventListener("DOMContentLoaded", () => {
    const profissionalAtual = obterProfissionalAtualNotificacao();

    if (!profissionalAtual) {
        return;
    }

    mostrarNotificacoesCancelamento(profissionalAtual);
});

function obterProfissionalAtualNotificacao() {
    try {
        return JSON.parse(localStorage.getItem("belezaArteProfissionalAtual"));
    } catch (erro) {
        return null;
    }
}

function mostrarNotificacoesCancelamento(profissional) {
    let notificacoes = [];

    try {
        notificacoes = JSON.parse(localStorage.getItem("belezaArteNotificacoesCancelamento")) || [];
    } catch (erro) {
        notificacoes = [];
    }

    if (!Array.isArray(notificacoes)) {
        notificacoes = [];
    }

    const minhasNotificacoes = notificacoes.filter(notificacao => {
        return (String(notificacao.destinatario || "").toUpperCase() === "PROFISSIONAL" && String(notificacao.registro?.profissionalId || "") === String(profissional.id || ""));
    });

    const naoLidas = minhasNotificacoes.filter(notificacao => !notificacao.lida);

    if (naoLidas.length === 0) {
        return;
    }

    criarAvisoCancelamento(naoLidas);
}

function criarAvisoCancelamento(notificacoes) {
    const avisoAnterior = document.getElementById("aviso-cancelamento-cliente");

    if (avisoAnterior) {
        avisoAnterior.remove();
    }

    const aviso = document.createElement("div");
    aviso.id = "aviso-cancelamento-cliente";
    aviso.className = "aviso-cancelamento-cliente";

    const registro = notificacoes[0].registro;

    aviso.innerHTML = `
        <div class="icone-notificacao">!</div>

        <div class="conteudo-notificacao">
            <strong>Cancelamento de agendamento</strong>

            <p>
                O cliente
                <strong>${escaparHTML(registro.cliente || "Cliente")} </strong>
                cancelou o serviço
                <strong>${escaparHTML(registro.servico || "Serviço")}</strong>.
            </p>

            <small>${escaparHTML(registro.data ? formatarDataNotificacao(registro.data) : "Data não informada")} às ${escaparHTML(registro.hora || "—")}</small>
        </div>

        <button type="button" class="fechar-notificacao" aria-label="Fechar"> × </button>
    `;

    document.body.appendChild(aviso);

    const botaoFechar = aviso.querySelector(".fechar-notificacao");

    if (botaoFechar) {
        botaoFechar.addEventListener("click", () => {
            marcarNotificacoesComoLidas(notificacoes);
            aviso.remove();
        });
    }
}

function marcarNotificacoesComoLidas(notificacoesLidas) {
    let notificacoes = [];

    try {
        notificacoes = JSON.parse(localStorage.getItem("belezaArteNotificacoesCancelamento")) || [];
    } catch (erro) {
        return;
    }

    const ids = notificacoesLidas.map(notificacao => notificacao.id);

    notificacoes = notificacoes.map(notificacao => {
        if (ids.includes(notificacao.id)) {
            return { ...notificacao, lida: true };
        }

        return notificacao;
    });

    localStorage.setItem("belezaArteNotificacoesCancelamento", JSON.stringify(notificacoes));
}

function formatarDataNotificacao(data) {
    if (!data) {
        return "—";
    }

    const valor = String(data);

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    return valor;
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
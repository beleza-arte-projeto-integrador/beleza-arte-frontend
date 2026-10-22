document.addEventListener("DOMContentLoaded", () => {
    const lista = document.getElementById("lista-historico");

    if (!lista) {
        return;
    }

    carregarHistorico(lista);
});

function carregarHistorico(lista) {
    let cancelamentos = [];

    try {
        cancelamentos = JSON.parse(localStorage.getItem("belezaArteCancelamentos")) || [];
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        cancelamentos = [];
    }

    if (!Array.isArray(cancelamentos)) {
        cancelamentos = [];
    }

    if (cancelamentos.length === 0) {
        lista.innerHTML = `
            <div class="historico-vazio">
                <div class="icone">✓</div>
                <h2>Nenhum cancelamento</h2>
                <p>Ainda não existem cancelamentos registrados.</p>
            </div>
        `;

        return;
    }

    cancelamentos.sort((a, b) => {
        return (Number(b.timestamp || 0) - Number(a.timestamp || 0));
    });

    lista.innerHTML = "";

    cancelamentos.forEach(cancelamento => {
        const card = document.createElement("article");
        card.className = "card-historico";

        const canceladoPor = cancelamento.canceladoPor === "PROFISSIONAL" ? "PROFISSIONAL" : "CLIENTE";
        const classeCanceladoPor = canceladoPor === "CLIENTE" ? "cancelado-cliente" : "cancelado-profissional";

        card.innerHTML = `
            <divclass="cabecalho-historico">
                <h3>${escaparHistorico(cancelamento.servico || "Serviço")}</h3>
                <span class="status-cancelado">CANCELADO</span>
            </div>

            <div class="dados-historico">
                <div class="dado-historico">
                    <small>CLIENTE</small>
                    <strong>${escaparHistorico(cancelamento.cliente || "Cliente")}</strong>
                </div>

                <div class="dado-historico">
                    <small>PROFISSIONAL</small>
                    <strong>${escaparHistorico(cancelamento.profissional || "Profissional")}</strong>
                </div>

                <div class="dado-historico">
                    <small>DATA DO SERVIÇO</small>
                    <strong>${escaparHistorico(formatarHistorico(cancelamento.data))}</strong>
                </div>

                <div class="dado-historico">
                    <small> HORÁRIO </small>
                    <strong> ${escaparHistorico(cancelamento.hora || "—")} </strong>
                </div>
            </div>

            <div class="rodape-historico">
                <span>
                    Cancelado por:
                    <strong class="${classeCanceladoPor}">${canceladoPor}</strong>
                </span>

                <span>${escaparHistorico(cancelamento.dataCancelamento || "")} às ${escaparHistorico(cancelamento.horaCancelamento || "")}</span>
            </div>
        `;

        lista.appendChild(card);
    });
}

function formatarHistorico(data) {
    if (!data) {
        return "—";
    }

    const partes = String(data).split("-");

    if (partes.length === 3) {
        return (partes[2] + "/" + partes[1] + "/" + partes[0]);
    }

    return String(data);
}

function escaparHistorico(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
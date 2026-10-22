document.addEventListener("DOMContentLoaded", () => {
    const listaHistorico = document.getElementById("lista-historico");

    if (!listaHistorico) {
        return;
    }

    let profissionalAtual = null;

    try {
        profissionalAtual = JSON.parse(localStorage.getItem("belezaArteProfissionalAtual"));
    } catch (erro) {
        console.error(erro);
    }

    if (!profissionalAtual) {
        listaHistorico.innerHTML = `
            <div class="historico-vazio">
                <div class="icone">🔒</div>
                <h2>Profissional não logada</h2>
                <p>Entre na sua conta profissional para visualizar o histórico.</p>
            </div>`;

        return;
    }

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

    const meusCancelamentos = cancelamentos.filter(cancelamento => {
        return (String(cancelamento.profissionalId || "") === String(profissionalAtual.id || ""));
    });

    if (meusCancelamentos.length === 0) {
        listaHistorico.innerHTML = `
            <div class="historico-vazio">
                <div class="icone"> ↻ </div>
                <h2> Nenhum cancelamento </h2>
                <p> Ainda não existem desistências ou cancelamentos registrados.</p>
            </div>`;

        return;
    }

    listaHistorico.innerHTML = "";

    meusCancelamentos.forEach(cancelamento => {
        const card = document.createElement("div");
        card.className = "card-historico";

        const canceladoPor = String(cancelamento.canceladoPor || "").toUpperCase();
        let textoCanceladoPor = "Cancelado";
        let classeCanceladoPor = "";

        if (canceladoPor === "CLIENTE") {
            textoCanceladoPor = "Cancelado pelo cliente";
            classeCanceladoPor = "cancelado-cliente";
        }

        if (canceladoPor === "PROFISSIONAL") {
            textoCanceladoPor = "Cancelado pela profissional";
            classeCanceladoPor = "cancelado-profissional";
        }

        card.innerHTML = `
            <div class="cabecalho-historico">
                <div>
                    <h3>${escaparHTML(cancelamento.cliente || "Cliente")}</h3>
                </div>

                <span class="status-cancelado"> CANCELADO </span>
            </div>

            <div class="dados-historico">
                <div class="dado-historico">
                    <small> SERVIÇO </small>
                    <strong>${escaparHTML(cancelamento.servico || "Serviço")}</strong>
                </div>

                <div class="dado-historico">
                    <small> PROFISSIONAL </small>
                    <strong>${escaparHTML(cancelamento.profissional || profissionalAtual.nome || "Profissional")}</strong>
                </div>

                <div class="dado-historico">
                    <small> DATA DO AGENDAMENTO </small>
                    <strong>${escaparHTML(formatarDataHistorico(cancelamento.data))}</strong>
                </div>

                <div class="dado-historico">
                    <small> HORÁRIO</small>
                    <strong>${escaparHTML(cancelamento.hora || "—")}</strong>
                </div>

                <div class="dado-historico">
                    <small> TELEFONE DO CLIENTE</small>
                    <strong>${escaparHTML(cancelamento.telefone || "—")}</strong>
                </div>

                <div class="dado-historico">
                    <small>E-MAIL DO CLIENTE</small>
                    <strong>${escaparHTML(cancelamento.email || "—")}</strong>
                </div>
            </div>

            <div class="rodape-historico">
                <span class="${classeCanceladoPor}">${textoCanceladoPor}</span>
                <span> Cancelado em: ${escaparHTML(cancelamento.dataCancelamento || "—")} às ${escaparHTML(cancelamento.horaCancelamento || "—")}</span>
            </div>
        `;

        listaHistorico.appendChild(card);
    });
});

function formatarDataHistorico(data) {
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
    return String(valor ?? "").replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
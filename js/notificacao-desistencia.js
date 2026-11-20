// Aviso de desistências: agendamentos da profissional cancelados pelo CLIENTE nos últimos dias.
// Os dados vêm da API (chamado por meus-agendamentos.js com a lista já carregada);
// nada é gravado no localStorage, então o aviso volta a aparecer ao recarregar a página.
const DIAS_AVISO_DESISTENCIA = 7;

function notificarDesistencias(agendamentos, nomes, profissionalId) {
    const limite = Date.now() - DIAS_AVISO_DESISTENCIA * 24 * 60 * 60 * 1000;
    const desistencias = (agendamentos || [])
        .filter(agendamento => String(agendamento.status || "").toUpperCase() === "CANCELADO")
        .filter(agendamento => String(agendamento.cancelledBy || "").toUpperCase() === "CLIENTE")
        .filter(agendamento => new Date(agendamento.cancelledAt || 0).getTime() >= limite)
        .sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime());

    const avisoAnterior = document.getElementById("aviso-cancelamento-cliente");
    if (avisoAnterior) {
        avisoAnterior.remove();
    }

    if (desistencias.length === 0) {
        return;
    }

    criarAvisoCancelamento(desistencias, nomes, profissionalId);
}

function criarAvisoCancelamento(desistencias, nomes, profissionalId) {
    const { formatDate, formatTime } = window.appointmentApi.time;
    const agendamento = desistencias[0];
    const itens = window.appointmentApi.sortItems(agendamento.items || [])
        .filter(item => !profissionalId || String(item.professional_id) === String(profissionalId));
    const primeiroItem = itens[0];
    const cliente = nomes?.clientes?.get(String(agendamento.idClient))?.name || `Cliente #${agendamento.idClient}`;
    const servicos = itens.map(item => nomes?.servicos?.get(String(item.service_id))?.name || `Serviço #${item.service_id}`).join(", ") || "Serviço";
    const outros = desistencias.length - 1;

    const aviso = document.createElement("div");
    aviso.id = "aviso-cancelamento-cliente";
    aviso.className = "aviso-cancelamento-cliente";
    aviso.innerHTML = `
        <div class="icone-notificacao">!</div>

        <div class="conteudo-notificacao">
            <strong>Cancelamento de agendamento</strong>

            <p>
                O cliente
                <strong>${escaparHTMLNotificacao(cliente)}</strong>
                cancelou o serviço
                <strong>${escaparHTMLNotificacao(servicos)}</strong>.
                ${agendamento.cancelReason ? `Motivo: ${escaparHTMLNotificacao(agendamento.cancelReason)}.` : ""}
            </p>

            <small>${escaparHTMLNotificacao(primeiroItem ? `${formatDate(primeiroItem.start_at)} às ${formatTime(primeiroItem.start_at)}` : "Data não informada")}${outros > 0 ? ` · e mais ${outros} cancelamento${outros === 1 ? "" : "s"} nos últimos ${DIAS_AVISO_DESISTENCIA} dias` : ""}</small>
        </div>

        <button type="button" class="fechar-notificacao" aria-label="Fechar"> × </button>
    `;

    document.body.appendChild(aviso);

    aviso.querySelector(".fechar-notificacao")?.addEventListener("click", () => aviso.remove());
}

function escaparHTMLNotificacao(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

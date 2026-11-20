// Cancelamentos vêm da API: agendamentos com status CANCELADO, com cancelledBy,
// cancelReason e cancelledAt. Nada é gravado no localStorage; só a profissional
// logada ("belezaArteProfissionalAtual") continua vindo de lá.
// Requer js/api/appointment-api.js. client-api.js, service-api.js e
// professional-api.js são opcionais e servem para mostrar nomes em vez de IDs.

const CHAVE_PROFISSIONAL_ATUAL = "belezaArteProfissionalAtual";

function obterProfissionalAtual() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_PROFISSIONAL_ATUAL));
    } catch (erro) {
        console.error("Erro ao carregar profissional:", erro);
        return null;
    }
}

function mapaPorId(lista) {
    return new Map((Array.isArray(lista) ? lista : []).map(item => [String(item.id), item]));
}

// Carrega clientes, serviços e profissionais para exibir nomes. Falhas não impedem a tela.
async function carregarNomesAgenda() {
    const [clientes, servicos, profissionais] = await Promise.allSettled([
        window.clientApi ? window.clientApi.list() : Promise.resolve([]),
        window.serviceApi ? window.serviceApi.list() : Promise.resolve([]),
        window.professionalApi ? window.professionalApi.list() : Promise.resolve([])
    ]);
    return {
        clientes: mapaPorId(clientes.status === "fulfilled" ? clientes.value : []),
        servicos: mapaPorId(servicos.status === "fulfilled" ? servicos.value : []),
        profissionais: mapaPorId(profissionais.status === "fulfilled" ? profissionais.value : [])
    };
}

function itensDaProfissional(agendamento, profissionalId) {
    const itens = window.appointmentApi.sortItems(agendamento?.items || []);
    if (!profissionalId) return itens;
    return itens.filter(item => String(item.professional_id) === String(profissionalId));
}

// Agendamentos cancelados (mais recentes primeiro). Com profissionalId, só os que têm itens dela.
async function carregarCancelamentos(profissionalId) {
    const cancelados = await window.appointmentApi.searchAppointmentsByStatus(window.appointmentApi.STATUS.CANCELADO);
    return cancelados
        .filter(agendamento => !profissionalId || itensDaProfissional(agendamento, profissionalId).length > 0)
        .sort((a, b) => new Date(b.cancelledAt || b.updated || 0).getTime() - new Date(a.cancelledAt || a.updated || 0).getTime());
}

function textoCanceladoPor(cancelledBy) {
    const valor = String(cancelledBy || "").toUpperCase();
    if (valor === "CLIENTE") return "Cancelado pelo cliente";
    if (valor === "SALAO") return "Cancelado pelo salão";
    return "Cancelado";
}

function classeCanceladoPor(cancelledBy) {
    return String(cancelledBy || "").toUpperCase() === "CLIENTE" ? "cancelado-cliente" : "cancelado-profissional";
}

function escaparHTMLCancelamento(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function nomeOuId(mapa, id, rotulo) {
    return mapa?.get(String(id))?.name || `${rotulo} #${id}`;
}

// Card de um agendamento cancelado (usado pelo histórico da profissional e pelo histórico geral).
function criarCardCancelamento(agendamento, nomes, profissionalId) {
    const { formatDate, formatTime, formatDateTime } = window.appointmentApi.time;
    const esc = escaparHTMLCancelamento;
    const itens = itensDaProfissional(agendamento, profissionalId);
    const cliente = nomes.clientes.get(String(agendamento.idClient));
    const servicos = itens.map(item => nomeOuId(nomes.servicos, item.service_id, "Serviço")).join(", ") || "—";
    const profissionaisNomes = [...new Set(itens.map(item => nomeOuId(nomes.profissionais, item.professional_id, "Profissional")))].join(", ") || "—";
    const datas = [...new Set(itens.map(item => formatDate(item.start_at)))].join(", ") || "—";
    const horarios = itens.map(item => `${formatTime(item.start_at)}–${formatTime(item.end_at)}`).join(", ") || "—";

    const card = document.createElement("article");
    card.className = "card-historico";
    card.innerHTML = `
        <div class="cabecalho-historico">
            <div>
                <h3>${esc(cliente?.name || `Cliente #${agendamento.idClient}`)}</h3>
                <small>Agendamento #${esc(agendamento.id)}</small>
            </div>
            <span class="status-cancelado">CANCELADO</span>
        </div>

        <div class="dados-historico">
            <div class="dado-historico">
                <small>SERVIÇO${itens.length === 1 ? "" : "S"}</small>
                <strong>${esc(servicos)}</strong>
            </div>
            <div class="dado-historico">
                <small>PROFISSIONAL</small>
                <strong>${esc(profissionaisNomes)}</strong>
            </div>
            <div class="dado-historico">
                <small>DATA DO AGENDAMENTO</small>
                <strong>${esc(datas)}</strong>
            </div>
            <div class="dado-historico">
                <small>HORÁRIO</small>
                <strong>${esc(horarios)}</strong>
            </div>
            <div class="dado-historico">
                <small>TELEFONE DO CLIENTE</small>
                <strong>${esc(cliente?.phone || "—")}</strong>
            </div>
            <div class="dado-historico">
                <small>E-MAIL DO CLIENTE</small>
                <strong>${esc(cliente?.email || "—")}</strong>
            </div>
            <div class="dado-historico dado-historico-motivo">
                <small>MOTIVO</small>
                <strong>${esc(agendamento.cancelReason || "Não informado")}</strong>
            </div>
        </div>

        <div class="rodape-historico">
            <span class="${classeCanceladoPor(agendamento.cancelledBy)}">${esc(textoCanceladoPor(agendamento.cancelledBy))}</span>
            <span>Cancelado em: ${esc(agendamento.cancelledAt ? formatDateTime(agendamento.cancelledAt) : "—")}</span>
        </div>
    `;
    return card;
}

function mensagemHistorico(lista, icone, titulo, texto) {
    lista.innerHTML = `
        <div class="historico-vazio">
            <div class="icone">${escaparHTMLCancelamento(icone)}</div>
            <h2>${escaparHTMLCancelamento(titulo)}</h2>
            <p>${escaparHTMLCancelamento(texto)}</p>
        </div>`;
}

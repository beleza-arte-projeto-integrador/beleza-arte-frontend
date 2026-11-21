// Agenda da profissional logada: agendamentos da API (searchProfessionalAppointments),
// mostrando só os serviços (items) dela. Requer appointment-api.js e cancelamentos.js.
document.addEventListener("DOMContentLoaded", () => {
    const dadosProfissional = document.getElementById("dados-profissional");
    const listaAgendamentos = document.getElementById("lista-agendamentos");
    const api = window.appointmentApi;
    const { STATUS } = api;
    const { formatDate, formatTime } = api.time;
    const profissionalAtual = obterProfissionalAtual();
    let nomes = { clientes: new Map(), servicos: new Map(), profissionais: new Map() };
    let agendamentos = [];
    let carregando = false;

    if (!profissionalAtual) {
        if (dadosProfissional) {
            dadosProfissional.innerHTML = `
                <div class="aviso"> Nenhuma profissional logada. </div>
            `;
        }

        if (listaAgendamentos) {
            mostrarMensagem("Faça login", "Entre na sua conta profissional para visualizar seus agendamentos.");
        }

        return;
    }

    const nomeProfissional = profissionalAtual.name || profissionalAtual.nome || "Profissional";
    const especialidadeProfissional = profissionalAtual.specialty || profissionalAtual.especialidade || "Profissional";
    const inicial = nomeProfissional.trim().charAt(0).toUpperCase();

    if (dadosProfissional) {
        dadosProfissional.innerHTML = `
            <div class="perfil-profissional">
                <div class="icone-perfil"> ${escaparHTML(inicial)}</div>
                <div>
                    <strong>${escaparHTML(nomeProfissional)}</strong>
                    <span> ${escaparHTML(especialidadeProfissional)}</span>
                </div>
            </div>
        `;
    }

    function mostrarMensagem(titulo, texto) {
        listaAgendamentos.innerHTML = `
            <div class="nenhum-agendamento">
                <div class="icone-calendario"> ▣ </div>
                <h2> ${escaparHTML(titulo)} </h2>
                <p> ${escaparHTML(texto)} </p>
            </div>
        `;
    }

    function inicioDe(agendamento) {
        const primeiro = itensDaProfissional(agendamento, profissionalAtual.id)[0];
        return primeiro ? new Date(primeiro.start_at).getTime() : 0;
    }

    // Em andamento (agendado/confirmado) primeiro, do mais próximo ao mais distante; depois os finalizados.
    function ordenar(lista) {
        const ativos = lista.filter(agendamento => !api.isFinalStatus(agendamento.status)).sort((a, b) => inicioDe(a) - inicioDe(b));
        const finalizados = lista.filter(agendamento => api.isFinalStatus(agendamento.status)).sort((a, b) => inicioDe(b) - inicioDe(a));
        return [...ativos, ...finalizados];
    }

    async function carregarAgendamentos() {
        if (carregando) return;
        carregando = true;
        mostrarMensagem("Carregando...", "Buscando seus agendamentos na API.");
        try {
            const [lista, nomesCarregados] = await Promise.all([
                api.searchAppointmentsByProfessional(profissionalAtual.id),
                carregarNomesAgenda()
            ]);
            nomes = nomesCarregados;
            agendamentos = ordenar(lista.filter(agendamento => itensDaProfissional(agendamento, profissionalAtual.id).length > 0));
            renderizarAgendamentos();
            if (typeof notificarDesistencias === "function") {
                notificarDesistencias(agendamentos, nomes, profissionalAtual.id);
            }
        } catch (erro) {
            mostrarMensagem("Não foi possível carregar os agendamentos", erro.message || "Tente novamente mais tarde.");
        } finally {
            carregando = false;
        }
    }

    function botoesDeStatus(agendamento) {
        const status = String(agendamento.status || "").toUpperCase();
        const id = escaparHTML(agendamento.id);
        const botoes = [];
        if (api.canChangeTo(status, STATUS.CONFIRMADO)) botoes.push(`<button type="button" class="botao-status-agendamento confirmar" data-acao="confirmar" data-id="${id}"> ✓ CONFIRMAR </button>`);
        if (api.canChangeTo(status, STATUS.CONCLUIDO)) botoes.push(`<button type="button" class="botao-status-agendamento concluir" data-acao="concluir" data-id="${id}"> ✓ CONCLUIR </button>`);
        if (api.canChangeTo(status, STATUS.NAO_COMPARECEU)) botoes.push(`<button type="button" class="botao-status-agendamento nao-compareceu" data-acao="nao-compareceu" data-id="${id}"> NÃO COMPARECEU </button>`);
        if (api.canChangeTo(status, STATUS.CANCELADO)) botoes.push(`<button type="button" class="botao-cancelar-servico" data-acao="cancelar" data-id="${id}"> ✕ CANCELAR </button>`);
        return botoes.join("");
    }

    function renderizarAgendamentos() {
        if (agendamentos.length === 0) {
            mostrarMensagem("Nenhum agendamento", "Você não possui agendamentos no momento.");
            return;
        }

        listaAgendamentos.innerHTML = agendamentos.map(agendamento => {
            const status = String(agendamento.status || "").toUpperCase();
            const itens = itensDaProfissional(agendamento, profissionalAtual.id);
            const cliente = nomes.clientes.get(String(agendamento.idClient));
            const nomeCliente = cliente?.name || `Cliente #${agendamento.idClient}`;
            const primeiro = itens[0];

            const listaServicosHTML = itens.map((item, index) => `
                <div class="servico-agendado">
                    <div class="icone-servico-agendado">
                        <span> ${index + 1} </span>
                    </div>

                    <div class="dados-servico-agendado">
                        <strong class="nome-servico-agendado">${escaparHTML(nomes.servicos.get(String(item.service_id))?.name || `Serviço #${item.service_id}`)}</strong>

                        <div class="detalhes-servico-agendado">
                            <div class="detalhe-agendamento">
                                <small>DATA</small>
                                <strong>${escaparHTML(formatDate(item.start_at))}</strong>
                            </div>

                            <div class="detalhe-agendamento">
                                <small> HORÁRIO </small>
                                <strong class="horario-destaque">${escaparHTML(formatTime(item.start_at))}–${escaparHTML(formatTime(item.end_at))}</strong>
                            </div>

                            <div class="detalhe-agendamento">
                                <small> PROFISSIONAL </small>
                                <strong> ${escaparHTML(nomeProfissional)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            `).join("");

            const cancelamento = status === STATUS.CANCELADO
                ? `<div class="detalhe-cancelamento-agenda">${escaparHTML(textoCanceladoPor(agendamento.cancelledBy))}${agendamento.cancelReason ? ` · Motivo: ${escaparHTML(agendamento.cancelReason)}` : ""}</div>`
                : "";

            return `
                <div class="card-agendamento" data-id="${escaparHTML(agendamento.id)}">
                    <div class="cabecalho-card-agendamento">
                        <div class="cliente-agendamento">
                            <div class="icone-cliente"> ${escaparHTML(nomeCliente.trim().charAt(0).toUpperCase())} </div>

                            <div>
                                <h3> ${escaparHTML(nomeCliente)}</h3>
                                <span> Agendamento #${escaparHTML(agendamento.id)} · ${itens.length} ${itens.length === 1 ? "serviço" : "serviços"} com você</span>
                            </div>
                        </div>

                        <div class="status-agendamento status-${escaparHTML(status.toLowerCase().replace(/_/g, "-"))}">
                            <span> ${escaparHTML(api.statusLabel(status).toUpperCase())} </span>
                        </div>
                    </div>

                    <div class="dados-cliente-agendamento">
                        <div>
                            <small> TELEFONE </small>
                            <strong> ${escaparHTML(cliente?.phone || "—")} </strong>
                        </div>

                        <div>
                            <small> E-MAIL </small>
                            <strong> ${escaparHTML(cliente?.email || "—")}</strong>
                        </div>
                    </div>

                    ${agendamento.notes ? `<div class="observacoes-agenda"><small>OBSERVAÇÕES</small><p>${escaparHTML(agendamento.notes)}</p></div>` : ""}
                    ${cancelamento}

                    <div class="titulo-servicos-agendamento">
                        <div class="linha-titulo"></div>
                        <h4>HORÁRIOS DOS SERVIÇOS</h4>
                        <div class="linha-titulo"></div>
                    </div>

                    <div class="lista-servicos-agendados">${listaServicosHTML}</div>

                    <div class="rodape-card-agendamento">
                        <div class="resumo-primeiro-horario">
                            <small>PRIMEIRO HORÁRIO</small>
                            <strong>${escaparHTML(primeiro ? `${formatDate(primeiro.start_at)} às ${formatTime(primeiro.start_at)}` : "—")}</strong>
                        </div>
                        <div class="acoes-status-agendamento">${botoesDeStatus(agendamento)}</div>
                    </div>
                </div>
            `;
        }).join("");
    }

    async function executarAcao(botao) {
        const agendamento = agendamentos.find(item => String(item.id) === botao.dataset.id);
        if (!agendamento || carregando) return;
        const id = Number(agendamento.id);
        const acao = botao.dataset.acao;
        let operacao;
        let sucesso;

        if (acao === "cancelar") {
            const motivo = prompt(`Informe o motivo do cancelamento do agendamento #${id}.\nTodos os serviços desta visita serão cancelados.`);
            if (motivo === null) return;
            if (!motivo.trim()) {
                alert("Informe o motivo do cancelamento.");
                return;
            }
            operacao = () => api.cancelAppointment(id, "SALAO", motivo.trim());
            sucesso = "Agendamento cancelado. O cancelamento aparece no histórico.";
        } else if (acao === "confirmar") {
            operacao = () => api.confirmAppointment(id);
            sucesso = "Agendamento confirmado.";
        } else if (acao === "concluir") {
            if (!confirm(`Marcar o agendamento #${id} como concluído?`)) return;
            operacao = () => api.completeAppointment(id);
            sucesso = "Agendamento concluído.";
        } else if (acao === "nao-compareceu") {
            if (!confirm(`Marcar que o cliente não compareceu ao agendamento #${id}?`)) return;
            operacao = () => api.noShowAppointment(id);
            sucesso = "Agendamento marcado como não compareceu.";
        } else {
            return;
        }

        const botoesDoCard = botao.closest(".card-agendamento")?.querySelectorAll("button[data-acao]") || [];
        botoesDoCard.forEach(item => { item.disabled = true; });
        try {
            await operacao();
            alert(sucesso);
            await carregarAgendamentos();
        } catch (erro) {
            alert(`Não foi possível atualizar o agendamento: ${erro.message}`);
            botoesDoCard.forEach(item => { item.disabled = false; });
        }
    }

    listaAgendamentos.addEventListener("click", event => {
        const botao = event.target.closest("button[data-acao]");
        if (botao) executarAcao(botao);
    });

    carregarAgendamentos();
});

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

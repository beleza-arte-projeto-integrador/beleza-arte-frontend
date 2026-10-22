
document.addEventListener("DOMContentLoaded", () => {
    const dadosProfissional = document.getElementById("dados-profissional");
    const listaAgendamentos = document.getElementById("lista-agendamentos");
    const botaoExcluirProfissional = document.getElementById("botao-excluir-profissional");
    let profissionalAtual = null;

    try {
        profissionalAtual = JSON.parse(localStorage.getItem("belezaArteProfissionalAtual"));
    } catch (erro) {
        console.error("Erro ao carregar profissional:", erro);
    }

    if (!profissionalAtual) {
        if (dadosProfissional) {
            dadosProfissional.innerHTML = `
                <div class="aviso"> Nenhuma profissional logada. </div>
            `;
        }

        if (listaAgendamentos) {
            listaAgendamentos.innerHTML = `
                <div class="nenhum-agendamento">
                    <div class="icone-calendario"> ▣ </div>
                    <h2> Faça login </h2>
                    <p> Entre na sua conta profissional para visualizar seus agendamentos. </p>
                </div>
            `;
        }

        return;
    }

    const inicial = profissionalAtual.nome ? profissionalAtual.nome.trim().charAt(0).toUpperCase() : "?";

    if (dadosProfissional) {
        dadosProfissional.innerHTML = `
            <div class="perfil-profissional">
                <div class="icone-perfil"> ${escaparHTML(inicial)}</div>
                <div>
                    <strong>${escaparHTML(profissionalAtual.nome || "Profissional")}</strong>
                    <span> ${escaparHTML(profissionalAtual.especialidade || "Profissional")}</span>
                </div>
            </div>
        `;
    }

    renderizarAgendamentos();

    function renderizarAgendamentos() {
        let agendamentos = [];

        try {
            agendamentos = JSON.parse(localStorage.getItem("belezaArteAgendamentos")) || [];
        } catch (erro) {
            console.error("Erro ao carregar agendamentos:", erro);
            agendamentos = [];
        }

        if (!Array.isArray(agendamentos)) {
            agendamentos = [];
        }

        const meusAgendamentos = [];

        agendamentos.forEach(agendamento => {
            if (!agendamento || !Array.isArray(agendamento.servicos)) {
                return;
            }

            const servicosDaProfissional = agendamento.servicos.map((servico, indiceOriginal) => {
                return { ...servico, indiceOriginal: indiceOriginal };
            })
            .filter(servico => {
                return (String(servico.profissionalId || "") === String(profissionalAtual.id || ""));
            });

            if (servicosDaProfissional.length > 0) {
                meusAgendamentos.push({ ...agendamento, servicos: servicosDaProfissional });
            }
        });

        if (meusAgendamentos.length === 0) {
            listaAgendamentos.innerHTML = `
                <div class="nenhum-agendamento">
                    <div class="icone-calendario"> ▣ </div>
                    <h2> Nenhum agendamento </h2>
                    <p> Você não possui agendamentos no momento. </p>
                </div>
            `;

            return;
        }

        listaAgendamentos.innerHTML = "";

        meusAgendamentos.forEach(agendamento => {
            const card = document.createElement("div");
            card.className = "card-agendamento";

            const servicosOrdenados = [...agendamento.servicos].sort((a, b) => {
                return (criarDataHora(a.data, a.hora) - criarDataHora(b.data, b.hora));
            });

            let listaServicosHTML = "";

            servicosOrdenados.forEach((servico, index) => {
                const nomeServico = servico.servico || servico.nomeServico || "Serviço";

                listaServicosHTML += `
                    <div class="servico-agendado">
                        <div class="icone-servico-agendado">
                            <span> ${index + 1} </span>
                        </div>

                        <div class="dados-servico-agendado">
                            <strong class="nome-servico-agendado">${escaparHTML(nomeServico)} </strong>

                            <div class="detalhes-servico-agendado">
                                <div class="detalhe-agendamento">
                                    <small>DATA</small>
                                    <strong>${escaparHTML(formatarData(servico.data))}</strong>
                                </div>

                                <div class="detalhe-agendamento">
                                    <small> HORÁRIO </small>
                                    <strong class="horario-destaque">${escaparHTML(servico.hora || "—")}</strong>
                                </div>

                                <div class="detalhe-agendamento">
                                    <small> PROFISSIONAL </small>
                                    <strong> ${escaparHTML(servico.profissional || profissionalAtual.nome || "—")}</strong>
                                </div>
                            </div>

                            <div class="acao-servico">
                                <button type="button" class="botao-cancelar-servico" data-agendamento-id="${escaparAtributo(agendamento.id)}" data-servico-indice="${servico.indiceOriginal}"> ✕ CANCELAR ESTE SERVIÇO </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            const primeiroServico = servicosOrdenados[0];

            card.innerHTML = `
                <div class="cabecalho-card-agendamento">
                    <div class="cliente-agendamento">
                        <div class="icone-cliente"> ${escaparHTML((agendamento.nome || "C").trim().charAt(0).toUpperCase())} </div>

                        <div>
                            <h3> ${escaparHTML(agendamento.nome || "Cliente")}</h3>
                            <span> ${servicosOrdenados.length} ${servicosOrdenados.length === 1 ? " serviço agendado" : " serviços agendados"}</span>
                        </div>
                    </div>

                    <div class="status-agendamento">
                        <span> AGENDADO </span>
                    </div>
                </div>

                <div class="dados-cliente-agendamento">
                    <div>
                        <small> TELEFONE </small>
                        <strong> ${escaparHTML(agendamento.telefone || "—")} </strong>
                    </div>

                    <div>
                        <small> E-MAIL </small>
                        <strong> ${escaparHTML(agendamento.email || "—")}</strong>
                    </div>
                </div>

                <div class="titulo-servicos-agendamento">
                    <div class="linha-titulo"></div>
                    <h4>HORÁRIOS DOS SERVIÇOS</h4>
                    <div class="linha-titulo"></div>
                </div>

                <div class="lista-servicos-agendados">${listaServicosHTML}</div>

                <div class="rodape-card-agendamento">
                    <div class="resumo-primeiro-horario">
                        <small>PRIMEIRO HORÁRIO</small>
                        <strong>${escaparHTML(formatarData(primeiroServico?.data || ""))} às ${escaparHTML(primeiroServico?.hora || "—")}</strong>
                    </div>
                </div>
            `;

            const botoesCancelar = card.querySelectorAll(".botao-cancelar-servico");

            botoesCancelar.forEach(botao => {
                botao.addEventListener("click", () => {
                    const idAgendamento = botao.dataset.agendamentoId;
                    const indiceServico = Number(botao.dataset.servicoIndice);

                    cancelarApenasUmServico(idAgendamento, indiceServico);
                });
            });

            listaAgendamentos.appendChild(card);
        });
    }

    function cancelarApenasUmServico(idAgendamento, indiceServico) {
        const confirmar = confirm("Deseja cancelar somente este serviço?\n\n" + "O cancelamento ficará registrado no histórico.");

        if (!confirmar) {
            return;
        }

        let agendamentos = [];

        try {
            agendamentos = JSON.parse(localStorage.getItem("belezaArteAgendamentos")) || [];
        } catch (erro) {
            alert("Não foi possível carregar os agendamentos.");
            return;
        }

        if (!Array.isArray(agendamentos)) {
            alert("Os agendamentos estão inválidos.");
            return;
        }

        const indiceAgendamento = agendamentos.findIndex(agendamento =>
            String(agendamento.id) === String(idAgendamento));

        if (indiceAgendamento === -1) {
            alert("Agendamento não encontrado.");
            return;
        }

        const agendamento = agendamentos[indiceAgendamento];

        if (
            !Array.isArray(agendamento.servicos)) {
            alert("Este agendamento não possui serviços.");
            return;
        }

        if (indiceServico < 0 || indiceServico >= agendamento.servicos.length) {
            alert("Serviço não encontrado.");
            return;
        }

        const servicoCancelado = agendamento.servicos[indiceServico];

        if (String(servicoCancelado.profissionalId || "") !== String(profissionalAtual.id || "")) {
            alert("Você não pode cancelar este serviço.");
            return;
        }

        const registroCancelamento = registrarCancelamento({
            agendamento: agendamento,
            servico: servicoCancelado,
            canceladoPor: "PROFISSIONAL"
        });

        if (!registroCancelamento) {
            alert("Não foi possível registrar o cancelamento.");
            return;
        }

        agendamento.servicos.splice(indiceServico, 1);

        if (agendamento.servicos.length === 0) {
            agendamentos.splice(indiceAgendamento, 1);
        }

        try {
            localStorage.setItem("belezaArteAgendamentos", JSON.stringify(agendamentos));
        } catch (erro) {
            console.error(erro);
            alert("Erro ao salvar o cancelamento.");
            return;
        }

        salvarNotificacaoCancelamento(registroCancelamento, "CLIENTE");

        const nomeServico = servicoCancelado.servico || servicoCancelado.nomeServico || "Serviço";
        alert(`"${nomeServico}" foi cancelado com sucesso.\n\n` + "O cancelamento foi salvo no histórico.");
        window.location.reload();
    }

    if (botaoExcluirProfissional) {
        botaoExcluirProfissional.addEventListener("click", () => {
            const confirmar = confirm("Tem certeza que deseja excluir seu cadastro?\n\n" + "Essa ação removerá sua profissional da plataforma.");

            if (!confirmar) {
                return;
            }

            let profissionais = [];

            try {
                profissionais = JSON.parse(localStorage.getItem("belezaArteProfissionais")) || [];
            } catch (erro) {
                profissionais = [];
            }

            profissionais = profissionais.filter(profissional =>
                String(profissional.id) !== String(profissionalAtual.id));

            localStorage.setItem("belezaArteProfissionais", JSON.stringify(profissionais));
            localStorage.removeItem("belezaArteProfissionalAtual");
            alert("Profissional excluída com sucesso!");
            window.location.href = "index.html";
        });
    }
});

function formatarData(data) {
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

function criarDataHora(data, hora) {
    if (!data) {
        return new Date(8640000000000000);
    }

    const partes = String(data).split("-");

    if (partes.length !== 3) {
        return new Date(8640000000000000);
    }

    const ano = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    let horas = 0;
    let minutos = 0;

    if (hora) {
        const partesHora = String(hora).split(":");
        horas = Number(partesHora[0] || 0);
        minutos = Number(partesHora[1] || 0);
    }

    return new Date(ano, mes, dia, horas, minutos);
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escaparAtributo(valor) {
    return escaparHTML(valor);
}
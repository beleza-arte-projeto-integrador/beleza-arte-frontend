/*
 * Tela de agendamento do cliente (agendamento.html).
 * Só cuida da interface: renderizar etapas, ler campos e mostrar mensagens.
 * Toda regra e chamada à API fica em js/booking/booking-service.js.
 */
document.addEventListener("DOMContentLoaded", () => {
    const booking = window.bookingService;
    const { formatDate, formatTime } = window.appointmentApi.time;

    const paineis = document.querySelectorAll(".etapa-agendamento[data-painel]");
    const etapas = document.querySelectorAll(".etapas .etapa");
    const listaServicos = document.getElementById("lista-servicos");
    const containerProfissionais = document.getElementById("profissionais-por-servico");
    const containerAgenda = document.getElementById("agenda-por-servico");
    const nomeInput = document.getElementById("nome-cliente");
    const telefoneInput = document.getElementById("telefone-cliente");
    const emailInput = document.getElementById("email-cliente");
    const semAgendamento = document.getElementById("sem-agendamento");
    const conteudoResumo = document.getElementById("conteudo-resumo");
    const detalheServico = document.getElementById("detalhe-servico");
    const detalheProfissional = document.getElementById("detalhe-profissional");
    const detalheData = document.getElementById("detalhe-data");
    const detalheHora = document.getElementById("detalhe-hora");
    const detalhePreco = document.getElementById("detalhe-preco");
    const caixaConfirmacao = document.getElementById("caixa-confirmacao");
    const botaoConfirmar = document.getElementById("confirmar-agendamento");
    const listaMeusAgendamentos = document.getElementById("lista-meus-agendamentos");

    // ------------------------------------------------------------------
    // Estado da reserva em andamento
    // ------------------------------------------------------------------
    let etapaAtual = 1;
    let servicos = [];
    /** serviceId -> { service, professional, date, time } (na ordem do catálogo) */
    const escolhas = new Map();
    let renderizacaoProfissionais = 0;

    function escolhasOrdenadas() {
        return servicos.filter(servico => escolhas.has(Number(servico.id))).map(servico => escolhas.get(Number(servico.id)));
    }

    function outrasEscolhas(serviceId) {
        return escolhasOrdenadas().filter(escolha => Number(escolha.service.id) !== Number(serviceId) && escolha.date && escolha.time && escolha.professional);
    }

    function calcularTotal() {
        return escolhasOrdenadas().reduce((total, escolha) => total + (Number(escolha.service.price) || 0), 0);
    }

    // ------------------------------------------------------------------
    // Etapa 1: serviços
    // ------------------------------------------------------------------
    const IMAGENS_SERVICO = [
        [/corte|tesoura/, "images/servicos/servicos-corte.png"],
        [/depila/, "images/profissionais/depilacao.png"],
        [/mecha|color|tonaliz/, "images/profissionais/mechas-coloracao.png"],
        [/manicure|pedicure|unha|esmalt/, "images/profissionais/manicure.png"],
        [/escova|tratamento|hidrat/, "images/profissionais/escova-tratamentos.png"],
        [/pele|limpeza|estetica|facial/, "images/profissionais/limpeza-pele.png"],
        [/maquiagem|make/, "images/profissionais/maquiagem.png"],
        [/sobrancelha/, "images/profissionais/desing-sobrancelhas.png"],
        [/penteado/, "images/profissionais/penteados.png"]
    ];

    function imagemDoServico(servico) {
        const texto = normalizarTexto(`${servico.name} ${servico.category || ""}`);
        return IMAGENS_SERVICO.find(([regra]) => regra.test(texto))?.[1] || "images/servicos/servicos-tesoura.png";
    }

    async function carregarServicos() {
        mostrarAviso(listaServicos, "Carregando serviços...");
        try {
            servicos = await booking.loadServices();
        } catch (erro) {
            mostrarAviso(listaServicos, `Não foi possível carregar os serviços. ${erro.message}`);
            return;
        }
        if (!servicos.length) {
            mostrarAviso(listaServicos, "Nenhum serviço disponível no momento. Fale com a gente pelo WhatsApp.");
            return;
        }
        listaServicos.innerHTML = servicos.map(servico => `
            <label class="opcao-servico">
                <input type="checkbox" name="servico" value="${escaparHTML(servico.id)}">
                <span class="radio"></span>
                <img src="${escaparHTML(imagemDoServico(servico))}" alt="${escaparHTML(servico.name)}">
                <span class="informacao-servico">
                    <strong>${escaparHTML(servico.name)}</strong>
                    <small>${escaparHTML(servico.description || "")}${servico.description ? " · " : ""}${escaparHTML(booking.durationOf(servico))} min</small>
                </span>
                <span class="preco">${formatarPreco(servico.price)}</span>
            </label>`).join("");
    }

    listaServicos.addEventListener("change", event => {
        const input = event.target.closest('input[name="servico"]');
        if (!input) return;
        const id = Number(input.value);
        if (input.checked) {
            escolhas.set(id, { service: servicos.find(servico => Number(servico.id) === id), professional: null, date: "", time: "" });
        } else {
            escolhas.delete(id);
        }
        input.closest(".opcao-servico")?.classList.toggle("selecionado", input.checked);
        atualizarResumo();
    });

    // ------------------------------------------------------------------
    // Etapa 2: profissional por serviço
    // ------------------------------------------------------------------
    async function criarProfissionaisPorServico() {
        const rodada = ++renderizacaoProfissionais;
        const selecionadas = escolhasOrdenadas();
        mostrarAviso(containerProfissionais, "Carregando profissionais...");

        const resultados = await Promise.allSettled(selecionadas.map(escolha => booking.professionalsFor(escolha.service)));
        if (rodada !== renderizacaoProfissionais) return; // o usuário já saiu/voltou da etapa

        containerProfissionais.innerHTML = "";
        selecionadas.forEach((escolha, indice) => {
            const resultado = resultados[indice];
            const profissionais = resultado.status === "fulfilled" ? resultado.value : [];
            const bloco = document.createElement("div");
            bloco.className = "bloco-profissional-servico";

            let opcoes;
            if (resultado.status === "rejected") {
                opcoes = `<div class="aviso-sem-profissional">Não foi possível carregar as profissionais. ${escaparHTML(resultado.reason?.message || "")}</div>`;
            } else if (!profissionais.length) {
                opcoes = `<div class="aviso-sem-profissional">Nenhuma profissional disponível para este serviço. Fale com a gente pelo WhatsApp.</div>`;
            } else {
                opcoes = profissionais.map(profissional => `
                    <label class="opcao-profissional-servico">
                        <input type="radio" name="profissional-${escaparHTML(escolha.service.id)}" value="${escaparHTML(profissional.id)}"
                            data-servico="${escaparHTML(escolha.service.id)}" ${Number(escolha.professional?.id) === Number(profissional.id) ? "checked" : ""}>
                        <span class="foto-profissional-pequena">${escaparHTML(String(profissional.name || "?").charAt(0).toUpperCase())}</span>
                        <span class="info-profissional-servico">
                            <strong>${escaparHTML(profissional.name)}</strong>
                            <small class="especialidade-profissional">${escaparHTML(profissional.specialty || "Profissional")}</small>
                        </span>
                    </label>`).join("");
            }

            bloco.innerHTML = `
                <div class="titulo-servico-profissional">
                    <strong>${escaparHTML(escolha.service.name)}</strong>
                    <span>${profissionais.length} profissional(is)</span>
                </div>
                <div class="opcoes-profissionais-servico">${opcoes}</div>`;

            bloco.querySelectorAll('input[type="radio"]').forEach(radio => {
                radio.addEventListener("change", () => {
                    escolha.professional = profissionais.find(profissional => Number(profissional.id) === Number(radio.value)) || null;
                    escolha.time = ""; // a agenda muda com a profissional
                    atualizarResumo();
                });
            });
            containerProfissionais.appendChild(bloco);
        });
    }

    // ------------------------------------------------------------------
    // Etapa 3: data e horário
    // ------------------------------------------------------------------
    function criarAgendaPorServico() {
        containerAgenda.innerHTML = "";
        const hoje = booking.todayBrasilia();

        escolhasOrdenadas().forEach(escolha => {
            const bloco = document.createElement("div");
            bloco.className = "bloco-agenda-servico";
            bloco.dataset.servico = escolha.service.id;
            bloco.innerHTML = `
                <div class="cabecalho-agenda-servico">
                    <strong>${escaparHTML(escolha.service.name)}</strong>
                    <span>${escaparHTML(escolha.professional?.name || "Profissional não selecionada")} · ${escaparHTML(booking.durationOf(escolha.service))} min</span>
                </div>
                <div class="campos-agenda-servico">
                    <label>
                        <span>DATA</span>
                        <input type="date" class="data-servico" min="${hoje}" value="${escaparHTML(escolha.date)}">
                    </label>
                    <label>
                        <span>HORÁRIO</span>
                        <select class="hora-servico"><option value="">Escolha a data</option></select>
                    </label>
                </div>`;

            const dataInput = bloco.querySelector(".data-servico");
            const horaSelect = bloco.querySelector(".hora-servico");

            dataInput.addEventListener("change", () => {
                escolha.date = dataInput.value;
                escolha.time = "";
                atualizarHorarios(escolha, horaSelect);
                atualizarResumo();
            });
            horaSelect.addEventListener("change", () => {
                escolha.time = horaSelect.value;
                atualizarResumo();
                atualizarOutrosHorarios(escolha);
            });

            containerAgenda.appendChild(bloco);
            if (escolha.date) atualizarHorarios(escolha, horaSelect);
        });
    }

    async function atualizarHorarios(escolha, horaSelect) {
        const pedido = `${escolha.date}|${escolha.professional?.id}`;
        horaSelect.dataset.pedido = pedido;
        horaSelect.disabled = true;
        horaSelect.innerHTML = `<option value="">${escolha.date ? "Carregando..." : "Escolha a data"}</option>`;
        if (!escolha.date || !escolha.professional) return;

        if (escolha.date < booking.todayBrasilia()) {
            horaSelect.innerHTML = `<option value="">Data já passou</option>`;
            return;
        }

        let resultado;
        try {
            resultado = await booking.availableSlots(escolha, outrasEscolhas(escolha.service.id));
        } catch (erro) {
            if (horaSelect.dataset.pedido !== pedido) return;
            horaSelect.innerHTML = `<option value="">Erro ao carregar horários</option>`;
            horaSelect.title = erro.message;
            return;
        }
        if (horaSelect.dataset.pedido !== pedido) return; // chegou resposta de uma data antiga

        if (resultado.closed) {
            horaSelect.innerHTML = `<option value="">Fechado neste dia</option>`;
            return;
        }
        const livres = resultado.slots.filter(slot => slot.available);
        horaSelect.innerHTML = `<option value="">${livres.length ? "Selecione" : "Sem horários livres"}</option>`
            + resultado.slots.map(slot => `<option value="${slot.time}" ${slot.available ? "" : `disabled title="${escaparHTML(slot.reason)}"`}>${slot.time}${slot.available ? "" : " (indisponível)"}</option>`).join("");
        horaSelect.disabled = !livres.length;

        if (escolha.time && livres.some(slot => slot.time === escolha.time)) {
            horaSelect.value = escolha.time;
        } else if (escolha.time) {
            escolha.time = "";
            atualizarResumo();
        }
    }

    /** Escolher um horário pode ocupar a profissional/espaço de outro serviço no mesmo dia. */
    function atualizarOutrosHorarios(alterada) {
        containerAgenda.querySelectorAll(".bloco-agenda-servico").forEach(bloco => {
            const escolha = escolhas.get(Number(bloco.dataset.servico));
            if (!escolha || escolha === alterada || escolha.date !== alterada.date) return;
            atualizarHorarios(escolha, bloco.querySelector(".hora-servico"));
        });
    }

    // ------------------------------------------------------------------
    // Etapa 4: dados do cliente
    // ------------------------------------------------------------------
    function preencherClienteLembrado() {
        const cliente = booking.currentClient();
        if (!cliente) return;
        if (!nomeInput.value) nomeInput.value = cliente.name || "";
        if (!telefoneInput.value) telefoneInput.value = booking.formatPhone(cliente.phone);
        if (!emailInput.value) emailInput.value = cliente.email || "";
    }

    telefoneInput.addEventListener("input", () => {
        telefoneInput.value = booking.formatPhone(telefoneInput.value);
    });

    // ------------------------------------------------------------------
    // Navegação e validação
    // ------------------------------------------------------------------
    function mostrarEtapa(numero) {
        etapaAtual = numero;
        paineis.forEach(painel => painel.classList.toggle("ativa", Number(painel.dataset.painel) === numero));
        etapas.forEach(etapa => {
            const numeroEtapa = Number(etapa.dataset.etapa);
            etapa.classList.toggle("ativa", numeroEtapa === numero);
            etapa.classList.toggle("concluida", numeroEtapa < numero);
        });
        if (numero === 2) criarProfissionaisPorServico();
        if (numero === 3) criarAgendaPorServico();
        if (numero === 4) preencherClienteLembrado();
        if (numero === 5) montarConfirmacao();
        atualizarResumo();
    }

    async function validarEtapa(numero) {
        const selecionadas = escolhasOrdenadas();

        if (numero === 1 && !selecionadas.length) {
            alert("Escolha pelo menos um serviço para continuar.");
            return false;
        }

        if (numero === 2) {
            const semProfissional = selecionadas.find(escolha => !escolha.professional);
            if (semProfissional) {
                alert(`Escolha uma profissional para o serviço "${semProfissional.service.name}".`);
                return false;
            }
        }

        if (numero === 3) {
            const incompleta = selecionadas.find(escolha => !escolha.date || !escolha.time);
            if (incompleta) {
                alert(`Escolha ${incompleta.date ? "um horário" : "uma data"} para "${incompleta.service.name}".`);
                return false;
            }
            try {
                await booking.checkAvailability(selecionadas);
            } catch (erro) {
                alert(erro.message);
                criarAgendaPorServico(); // recarrega os horários atualizados
                return false;
            }
        }

        if (numero === 4) {
            if (!nomeInput.value.trim()) {
                alert("Digite seu nome completo.");
                nomeInput.focus();
                return false;
            }
            const digitos = booking.normalizePhone(telefoneInput.value);
            if (digitos.length < 10) {
                alert("Digite um telefone válido com DDD.");
                telefoneInput.focus();
                return false;
            }
            if (!emailInput.value.trim() || !emailInput.checkValidity()) {
                alert("Digite um e-mail válido.");
                emailInput.focus();
                return false;
            }
        }

        return true;
    }

    document.querySelectorAll(".botao-proximo").forEach(botao => {
        botao.addEventListener("click", async () => {
            if (botao.disabled) return;
            botao.disabled = true;
            try {
                if (await validarEtapa(etapaAtual)) mostrarEtapa(Number(botao.dataset.proximo));
            } finally {
                botao.disabled = false;
            }
        });
    });

    document.querySelectorAll(".botao-voltar").forEach(botao => {
        botao.addEventListener("click", () => mostrarEtapa(Number(botao.dataset.voltar)));
    });

    // ------------------------------------------------------------------
    // Resumo lateral e confirmação
    // ------------------------------------------------------------------
    function atualizarResumo() {
        const selecionadas = escolhasOrdenadas();
        if (!selecionadas.length) {
            semAgendamento.style.display = "block";
            conteudoResumo.classList.remove("visivel");
            return;
        }
        semAgendamento.style.display = "none";
        conteudoResumo.classList.add("visivel");

        const linhas = (filtro, texto) => selecionadas.filter(filtro).map(texto).join("<br>") || "—";
        detalheServico.innerHTML = linhas(() => true, escolha => escaparHTML(escolha.service.name));
        detalheProfissional.innerHTML = linhas(escolha => escolha.professional, escolha => `${escaparHTML(escolha.service.name)}: ${escaparHTML(escolha.professional.name)}`);
        detalheData.innerHTML = linhas(escolha => escolha.date, escolha => `${escaparHTML(escolha.service.name)}: ${formatarData(escolha.date)}`);
        detalheHora.innerHTML = linhas(escolha => escolha.time, escolha => `${escaparHTML(escolha.service.name)}: ${escaparHTML(escolha.time)}`);
        detalhePreco.textContent = formatarPreco(calcularTotal());
    }

    function linhaConfirmacao(rotulo, valor) {
        return `<div class="confirmacao-linha"><span>${escaparHTML(rotulo)}</span><strong>${escaparHTML(valor || "—")}</strong></div>`;
    }

    function montarConfirmacao() {
        caixaConfirmacao.innerHTML = escolhasOrdenadas().map(escolha =>
            linhaConfirmacao("Serviço", escolha.service.name)
            + linhaConfirmacao("Profissional", escolha.professional?.name)
            + linhaConfirmacao("Data", formatarData(escolha.date))
            + linhaConfirmacao("Horário", escolha.time)
        ).join("")
            + linhaConfirmacao("Nome", nomeInput.value.trim())
            + linhaConfirmacao("Telefone", telefoneInput.value)
            + linhaConfirmacao("E-mail", emailInput.value.trim())
            + linhaConfirmacao("Total", formatarPreco(calcularTotal()));
    }

    function reiniciarReserva() {
        escolhas.clear();
        listaServicos.querySelectorAll('input[name="servico"]').forEach(input => {
            input.checked = false;
            input.closest(".opcao-servico")?.classList.remove("selecionado");
        });
        mostrarEtapa(1);
    }

    botaoConfirmar.addEventListener("click", async () => {
        for (const etapa of [1, 2, 3, 4]) {
            if (!(await validarEtapa(etapa))) {
                mostrarEtapa(etapa);
                return;
            }
        }

        botaoConfirmar.disabled = true;
        try {
            await booking.book({
                client: { name: nomeInput.value, phone: telefoneInput.value, email: emailInput.value },
                choices: escolhasOrdenadas()
            });
        } catch (erro) {
            alert(`❌ ${erro.message}`);
            if (erro.choice) mostrarEtapa(3);
            return;
        } finally {
            botaoConfirmar.disabled = false;
        }

        alert("✅ AGENDAMENTO REALIZADO COM SUCESSO!\n\nSeu horário já está disponível em MEUS AGENDAMENTOS.");
        reiniciarReserva();
        await carregarMeusAgendamentos();
        document.getElementById("meus-agendamentos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // ------------------------------------------------------------------
    // Meus agendamentos
    // ------------------------------------------------------------------
    function mensagemMeusAgendamentos(titulo, texto) {
        listaMeusAgendamentos.innerHTML = `
            <div class="sem-agendamentos-cliente">
                <div class="icone">▣</div>
                <h3>${escaparHTML(titulo)}</h3>
                <p>${escaparHTML(texto)}</p>
            </div>`;
    }

    async function carregarMeusAgendamentos() {
        if (!booking.currentClient()) {
            mensagemMeusAgendamentos("Você ainda não possui agendamentos", "Seus horários aparecerão aqui depois do primeiro agendamento.");
            return;
        }
        mensagemMeusAgendamentos("Carregando...", "Buscando seus agendamentos.");

        let dados;
        let nomes;
        try {
            [dados, nomes] = await Promise.all([booking.myAppointments(), booking.lookupNames()]);
        } catch (erro) {
            mensagemMeusAgendamentos("Não foi possível carregar seus agendamentos", erro.message);
            return;
        }
        if (!dados.appointments.length) {
            mensagemMeusAgendamentos("Você ainda não possui agendamentos", "Seus horários aparecerão aqui depois do primeiro agendamento.");
            return;
        }

        listaMeusAgendamentos.innerHTML = "";
        dados.appointments.forEach((agendamento, indice) => {
            listaMeusAgendamentos.appendChild(criarCardAgendamento(agendamento, nomes, dados.client, indice === 0));
        });
    }

    function criarCardAgendamento(agendamento, nomes, cliente, primeiro) {
        const itens = window.appointmentApi.sortItems(agendamento.items);
        const inicio = itens[0]?.start_at;
        const podeCancelar = booking.canCancel(agendamento);
        const ehProximo = primeiro && podeCancelar;
        const servicosHtml = itens.length
            ? itens.map(item => `<p><strong>${escaparHTML(nomes.service(item.service_id))}</strong> · ${escaparHTML(nomes.professional(item.professional_id))} · ${escaparHTML(formatTime(item.start_at))}–${escaparHTML(formatTime(item.end_at))}</p>`).join("")
            : "<p>Nenhum serviço neste agendamento.</p>";

        const card = document.createElement("div");
        card.className = `card-meu-agendamento${ehProximo ? " proximo" : ""}`;
        card.innerHTML = `
            <div class="data-meu-agendamento">
                ${ehProximo ? `<span class="etiqueta-proximo">PRÓXIMO AGENDAMENTO</span>` : ""}
                <strong>${escaparHTML(inicio ? formatDate(inicio) : "—")}</strong>
                <span class="hora">${escaparHTML(inicio ? formatTime(inicio) : "—")}</span>
            </div>
            <div class="info-meu-agendamento">
                <h3>Agendamento #${escaparHTML(agendamento.id)}</h3>
                ${servicosHtml}
                <p><strong>Cliente:</strong> ${escaparHTML(cliente.name || "—")}</p>
                <p><strong>Total:</strong> ${formatarPreco(itens.reduce((total, item) => total + (Number(item.price) || 0), 0))}</p>
            </div>
            <div class="status-meu-agendamento">
                <span class="status">${escaparHTML(window.appointmentApi.statusLabel(agendamento.status))}</span>
                ${podeCancelar ? `<button type="button" class="botao-cancelar-cliente">CANCELAR AGENDAMENTO</button>` : ""}
            </div>`;

        card.querySelector(".botao-cancelar-cliente")?.addEventListener("click", () => cancelarAgendamento(agendamento));
        return card;
    }

    async function cancelarAgendamento(agendamento) {
        if (!confirm(`Tem certeza que deseja cancelar o agendamento #${agendamento.id}?`)) return;
        const motivo = prompt("Se quiser, conte o motivo do cancelamento (opcional):", "");
        if (motivo === null) return;
        try {
            await booking.cancel(agendamento.id, motivo);
        } catch (erro) {
            alert(`❌ Não foi possível cancelar: ${erro.message}`);
            return;
        }
        alert("✅ CANCELAMENTO REALIZADO!\n\nO salão foi avisado sobre o cancelamento.");
        carregarMeusAgendamentos();
    }

    // ------------------------------------------------------------------
    // Utilitários de exibição
    // ------------------------------------------------------------------
    function mostrarAviso(container, texto) {
        container.innerHTML = `<div class="aviso-sem-profissional">${escaparHTML(texto)}</div>`;
    }

    function normalizarTexto(texto) {
        return String(texto || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    }

    function formatarData(data) {
        const partes = String(data || "").split("-");
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : "—";
    }

    function formatarPreco(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    carregarServicos();
    atualizarResumo();
    carregarMeusAgendamentos();
});

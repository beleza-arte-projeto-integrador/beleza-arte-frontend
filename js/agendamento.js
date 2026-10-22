
document.addEventListener("DOMContentLoaded", () => {

    const paineis = document.querySelectorAll(".etapa-agendamento[data-painel]");
    const etapas = document.querySelectorAll(".etapas .etapa");
    const botoesProximo = document.querySelectorAll(".botao-proximo");
    const botoesVoltar = document.querySelectorAll(".botao-voltar");
    const servicos = document.querySelectorAll('input[name="servico"]');
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
    const containerProfissionais = document.getElementById("profissionais-por-servico");
    const containerAgenda = document.getElementById("agenda-por-servico");
    const listaMeusAgendamentos = document.getElementById("lista-meus-agendamentos");
    const botaoExcluirTodos = document.getElementById("botao-excluir-todos-agendamentos");

    let etapaAtual = 1;
    let clienteAtual = obterLocalStorage("belezaArteClienteAtual", null);

    const profissionaisPadrao = [
        {
            id: "padrao-anna", nome: "Anna", especialidade: "Cabeleireira", servicos: ["Mechas / Coloração", "Escova / Tratamentos"]
        },
        {
            id: "padrao-juliana", nome: "Juliana", especialidade: "Esteticista", servicos: ["Limpeza de pele", "Depilação"]
        },
        {
            id: "padrao-camila", nome: "Camila", especialidade: "Manicure", servicos: ["Manicure"]
        },
        {
            id: "padrao-marina", nome: "Marina", especialidade: "Maquiadora", servicos: ["Maquiagem", "Penteados"]
        },
        {
            id: "padrao-beatriz", nome: "Beatriz", especialidade: "Designer de Sobrancelhas", servicos: ["Design de sobrancelhas", "Depilação"]
        },
        {
            id: "padrao-carolina", nome: "Carolina", especialidade: "Depiladora", servicos: ["Depilação"]
        },
        {
            id: "padrao-sofia", nome: "Sofia", especialidade: "Cabeleireira", servicos: ["Mechas / Coloração", "Escova / Tratamentos", "Penteados"]
        },
        {
            id: "padrao-laura", nome: "Laura", especialidade: "Maquiadora", servicos: ["Maquiagem", "Penteados"]
        }
    ];

    function obterLocalStorage(chave, valorPadrao) {

        try {
            const valor = localStorage.getItem(chave);

            if (!valor) {
                return valorPadrao;
            }

            return JSON.parse(valor);
        }
        catch (erro) {
            console.error("Erro ao ler localStorage:", chave, erro);
            return valorPadrao;
        }
    }

    function salvarLocalStorage(chave, valor) {

        try {
            localStorage.setItem(chave, JSON.stringify(valor));
            return true;
        }
        catch (erro) {
            console.error("Erro ao salvar localStorage:", erro);
            return false;
        }
    }

    function obterProfissionaisCadastradas() {

        const profissionais = obterLocalStorage("belezaArteProfissionais", []);
        return Array.isArray(profissionais) ? profissionais : [];
    }

    function obterTodosProfissionais() {

        const cadastradas = obterProfissionaisCadastradas();
        return [...profissionaisPadrao, ...cadastradas];
    }

    function obterServicosSelecionados() {

        return Array.from(document.querySelectorAll('input[name="servico"]:checked'));
    }

    function calcularTotal() {

        return obterServicosSelecionados().reduce((total, servico) => {
            return (total + Number(servico.dataset.preco || 0));
        }, 0);
    }

    function normalizarTexto(texto) {

        return String(texto || "")
            .trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function profissionalFazServico(profissional, servicoSelecionado) {

        if (!profissional || !Array.isArray(profissional.servicos)) {
            return false;
        }

        const servico = normalizarTexto(servicoSelecionado);
        const servicosProfissional = profissional.servicos.map(item => normalizarTexto(item));

        if (servicosProfissional.includes(servico)) {
            return true;
        }

        if (servico === normalizarTexto("Mechas / Coloração")) {
            return (servicosProfissional.includes(normalizarTexto("Mechas")) || servicosProfissional.includes(normalizarTexto("Coloração")) || servicosProfissional.includes(normalizarTexto("Mechas / Coloração")));
        }

        if (servico === normalizarTexto("Escova / Tratamentos")) {
            return (servicosProfissional.includes(normalizarTexto("Escova")) || servicosProfissional.includes(normalizarTexto("Tratamentos")) || servicosProfissional.includes(normalizarTexto("Escova / Tratamentos")));
        }

        return false;
    }

    function mostrarEtapa(numero) {

        etapaAtual = numero;

        paineis.forEach(painel => {
            const numeroPainel = Number(painel.dataset.painel);
            painel.classList.toggle("ativa", numeroPainel === numero);
        });

        etapas.forEach(etapa => {
            const numeroEtapa = Number(etapa.dataset.etapa);

            etapa.classList.toggle("ativa", numeroEtapa === numero);
            etapa.classList.toggle("concluida", numeroEtapa < numero);
        });

        if (numero === 2) {
            criarProfissionaisPorServico();
        }

        if (numero === 3) {
            criarAgendaPorServico();
        }

        if (numero === 5) {
            montarConfirmacao();
        }

        atualizarResumo();
    }

    function criarProfissionaisPorServico() {

        if (!containerProfissionais) {
            return;
        }

        const servicosSelecionados = obterServicosSelecionados();
        containerProfissionais.innerHTML = "";

        if (servicosSelecionados.length === 0) {
            containerProfissionais.innerHTML = `

            <div class="aviso-sem-profissional">

                <strong> Nenhum serviço selecionado. </strong>
                <p> Volte e selecione pelo menos um serviço. </p>

            </div>
        `;

            return;
        }

        const selecoesAnteriores = {};

        document.querySelectorAll('[name^="profissional-"]:checked')
            .forEach(input => {
                selecoesAnteriores[input.dataset.servico] = input.value;
            });

        const profissionais = obterTodosProfissionais();

        servicosSelecionados.forEach((servico, index) => {

            const bloco = document.createElement("div");
            bloco.className = "bloco-profissional-servico";

            const profissionaisDisponiveis = profissionais.filter(profissional => profissionalFazServico(profissional, servico.value));
            const titulo = document.createElement("div");

            titulo.className = "titulo-servico-profissional";

            titulo.innerHTML = `

                <strong> ${escaparHTML(servico.value)} </strong>
                <span> ${profissionaisDisponiveis.length} profissional(is) </span>`;

            const lista = document.createElement("div");
            lista.className = "opcoes-profissionais-servico";

            if (profissionaisDisponiveis.length === 0) {
                lista.innerHTML = `
                    <div class="aviso-sem-profissional" > Nenhuma profissional cadastrada para realizar este serviço.</div>`;
            }

            profissionaisDisponiveis.forEach(profissional => {

                const label = document.createElement("label");
                label.className = "opcao-profissional-servico";

                const selecionado = selecoesAnteriores[servico.value] === profissional.nome;
                const servicosProfissional = Array.isArray(profissional.servicos) ? profissional.servicos : [];
                const listaServicos = servicosProfissional
                    .map(servicoProfissional => {

                        const destaque = normalizarTexto(servicoProfissional) === normalizarTexto(servico.value);

                        return `

            <span class="item-servico-realizado ${destaque ? "destaque" : ""}">
            ${escaparHTML(servicoProfissional)}

        </span>

    `;

                    })
                    .join("");

                label.innerHTML = `
                        <input type="radio" name="profissional-${index}" value="${escaparAtributo(profissional.nome)}" data-id="${escaparAtributo(profissional.id)}" data-servico="${escaparAtributo(servico.value)}" ${selecionado ? "checked" : ""}>
                        <span class="foto-profissional-pequena">

                            ${escaparHTML(profissional.nome.charAt(0).toUpperCase())}

                        </span>

                        <span class="info-profissional-servico">

                            <strong>${escaparHTML(profissional.nome)}</strong>
                            <small class="especialidade-profissional">

                                ${escaparHTML(profissional.especialidade || "Profissional")}

                            </small>
                            <small class="titulo-servicos-realizados"> SERVIÇOS REALIZADOS</small>
                            <span class="lista-servicos-realizados">

                                ${listaServicos || `<span class=" item-servico-realizado "> ${escaparHTML(servico.value)}</span>`}

                            </span>

                        </span>

                    `;

                lista.appendChild(label);
            });

            bloco.appendChild(titulo);
            bloco.appendChild(lista);
            containerProfissionais.appendChild(bloco);
        });
    }

    function obterServicosCorrespondentes(profissional, servicoSelecionado) {

        if (!profissional || !Array.isArray(profissional.servicos)) {
            return [];
        }

        const servico = normalizarTexto(servicoSelecionado);
        const servicosProfissional = profissional.servicos;
        const correspondentesDiretos = servicosProfissional.filter(item => normalizarTexto(item) === servico);

        if (correspondentesDiretos.length > 0) {
            return correspondentesDiretos;
        }

        if (
            servico === normalizarTexto("Mechas / Coloração")
        ) {
            return servicosProfissional.filter(item => {

                const itemNormalizado = normalizarTexto(item);

                return (itemNormalizado === normalizarTexto("Mechas") || itemNormalizado === normalizarTexto("Coloração") || itemNormalizado === normalizarTexto("Mechas / Coloração"));
            });
        }

        if (servico === normalizarTexto("Escova / Tratamentos")) {
            return servicosProfissional.filter(item => {

                const itemNormalizado = normalizarTexto(item);

                return (itemNormalizado === normalizarTexto("Escova") || itemNormalizado === normalizarTexto("Tratamentos") || itemNormalizado === normalizarTexto("Escova / Tratamentos"));
            });
        }

        return [];
    }

    function obterProfissionaisSelecionados() {

        const escolhidos = [];

        document.querySelectorAll('[name^="profissional-"]:checked').forEach(input => {
            escolhidos.push({

                servico: input.dataset.servico,
                profissional: input.value,
                profissionalId: input.dataset.id

            });
        });

        return escolhidos;
    }

    function obterProfissionalDoServico(servico) {

        const input = Array.from(document.querySelectorAll('[name^="profissional-"]:checked')).find(item => item.dataset.servico === servico.value);

        if (!input) {
            return null;
        }

        const profissional = obterTodosProfissionais().find(item => String(item.id) === String(input.dataset.id));

        return profissional || null;
    }

    function criarAgendaPorServico() {

        if (!containerAgenda) {
            return;
        }

        const servicosSelecionados = obterServicosSelecionados();
        const dadosAnteriores = {};

        document.querySelectorAll(".bloco-agenda-servico")
            .forEach(bloco => {

                const dataInput = bloco.querySelector(".data-servico");
                const horaInput = bloco.querySelector(".hora-servico");

                if (dataInput && horaInput) {
                    dadosAnteriores[dataInput.dataset.servico] = {

                        data: dataInput.value,
                        hora: horaInput.value

                    };
                }
            });

        containerAgenda.innerHTML = "";

        servicosSelecionados.forEach((servico, index) => {

            const profissional = obterProfissionalDoServico(servico);
            const bloco = document.createElement("div");

            bloco.className = "bloco-agenda-servico";

            const dados = dadosAnteriores[servico.value] || {};

            bloco.innerHTML = `

                    <div class="cabecalho-agenda-servico">

                        <strong> ${escaparHTML(servico.value)}</strong>
                        <span>${profissional ? escaparHTML(profissional.nome) : "Profissional não selecionado"}</span>

                    </div>

                    <div class="campos-agenda-servico">

                        <label>

                            <span>DATA</span>
                            <input type="date" class="data-servico" data-servico="${escaparAtributo(servico.value)}" value="${escaparAtributo(dados.data || "")}">

                        </label>

                        <label>

                            <span>HORÁRIO</span>

                            <select class="hora-servico" data-servico="${escaparAtributo(servico.value)}">

                                <option value=""> Selecione </option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>

                            </select>

                        </label>

                    </div>

                `;

            containerAgenda.appendChild(bloco);

            const horaSelect = bloco.querySelector(".hora-servico");

            if (horaSelect) {
                horaSelect.value = dados.hora || "";
            }
        });

        definirDataMinima();
    }

    function obterDataHoje() {

        const agora = new Date();
        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, "0");
        const dia = String(agora.getDate()).padStart(2, "0");

        return (`${ano}-${mes}-${dia}`);
    }

    function definirDataMinima() {

        const dataMinima = obterDataHoje();

        document.querySelectorAll(".data-servico").forEach(input => {

            input.min = dataMinima;

            input.addEventListener("change", () => {
                atualizarHorariosDisponiveis(input);
            });

            atualizarHorariosDisponiveis(input);
        });
    }

    function atualizarHorariosDisponiveis(dataInput) {

        const bloco = dataInput.closest(".bloco-agenda-servico");

        if (!bloco) {
            return;
        }

        const horaSelect = bloco.querySelector(".hora-servico");

        if (!horaSelect) {
            return;
        }

        const dataSelecionada = dataInput.value;

        Array.from(horaSelect.options).forEach(option => {
            option.disabled = false;
        });

        if (!dataSelecionada) {
            return;
        }

        const hoje = obterDataHoje();

        if (dataSelecionada > hoje) {
            return;
        }

        function atualizarHorariosDisponiveis(dataInput) {

            const bloco = dataInput.closest(".bloco-agenda-servico");

            if (!bloco) {
                return;
            }

            const horaSelect = bloco.querySelector(".hora-servico");

            if (!horaSelect) {
                return;
            }

            const dataSelecionada = dataInput.value;
            const servico = dataInput.dataset.servico;
            const checkboxServico = Array.from(document.querySelectorAll('input[name="servico"]:checked')).find(input => input.value === servico);
            const profissional = checkboxServico ? obterProfissionalDoServico(checkboxServico) : null;
            const profissionalId = profissional ? String(profissional.id) : "";

            Array.from(horaSelect.options).forEach(option => {

                option.disabled = false;
                option.removeAttribute("title");

            });

            if (!dataSelecionada) {
                return;
            }

            const agendamentosSalvos = obterAgendamentosSalvos();
            const horariosOcupados = [];

            agendamentosSalvos.forEach(agendamento => {

                if (!Array.isArray(agendamento.servicos)) {
                    return;
                }

                agendamento.servicos.forEach(servicoSalvo => {

                    if (String(servicoSalvo.data || "") === String(dataSelecionada) && String(servicoSalvo.profissionalId || "") === String(profissionalId) && servicoSalvo.hora) {
                        horariosOcupados.push(String(servicoSalvo.hora));
                    }
                });
            });

            const hoje = obterDataHoje();
            const agora = new Date();

            Array.from(horaSelect.options).forEach(option => {

                if (!option.value) {
                    return;
                }

                if (horariosOcupados.includes(option.value)) {

                    option.disabled = true;
                    option.title = "Este horário já está ocupado.";

                    return;
                }

                if (dataSelecionada === hoje) {

                    const partes = option.value.split(":");
                    const horario = new Date();

                    horario.setHours(Number(partes[0]), Number(partes[1]), 0, 0);

                    if (horario <= agora) {

                        option.disabled = true;
                        option.title = "Este horário já passou.";

                    }
                }
            });

            if (horaSelect.value && horaSelect.options[horaSelect.selectedIndex]?.disabled) {
                horaSelect.value = "";
            }
        }

        const agora = new Date();

        Array.from(horaSelect.options).forEach(option => {

            if (!option.value) {
                return;
            }

            const partes = option.value.split(":");
            const horario = new Date();

            horario.setHours(Number(partes[0]), Number(partes[1]), 0, 0);

            if (horario <= agora) {
                option.disabled = true;
            }
        });

        if (horaSelect.value && horaSelect.options[horaSelect.selectedIndex]?.disabled) {
            horaSelect.value = "";
        }
    }

    function obterAgendamentos() {

        const resultado = [];
        const servicosSelecionados = obterServicosSelecionados();

        servicosSelecionados.forEach(servico => {

            const dataInput = Array.from(document.querySelectorAll(".data-servico")).find(input => input.dataset.servico === servico.value);
            const horaInput = Array.from(document.querySelectorAll(".hora-servico")).find(input => input.dataset.servico === servico.value);
            const profissional = obterProfissionalDoServico(servico);

            resultado.push({

                servico: servico.value,
                preco: Number(servico.dataset.preco || 0),
                profissional: profissional ? profissional.nome : "",
                profissionalId: profissional ? profissional.id : "",
                especialidade: profissional ? profissional.especialidade : "",
                data: dataInput ? dataInput.value : "",
                hora: horaInput ? horaInput.value : ""

            });
        });

        return resultado;
    }

    function obterAgendamentosSalvos() {

        const agendamentos = obterLocalStorage("belezaArteAgendamentos", []);

        return Array.isArray(agendamentos) ? agendamentos : [];
    }

    function validarEtapa(numero) {

        if (numero === 1) {

            if (obterServicosSelecionados().length === 0) {

                alert("Escolha pelo menos um serviço para continuar.");

                return false;
            }
        }

        if (numero === 2) {

            const selecionados = obterServicosSelecionados();

            for (const servico of selecionados) {

                const profissional = obterProfissionalDoServico(servico);

                if (!profissional) {

                    alert(`Escolha uma profissional para o serviço "${servico.value}".`);

                    return false;
                }
            }
        }

        if (numero === 3) {

            const agendamentos = obterAgendamentos();
            const dataHoje = obterDataHoje();
            const agora = new Date();

            for (const agendamento of agendamentos) {

                if (!agendamento.data) {

                    alert(`Escolha uma data para "${agendamento.servico}".`);

                    return false;
                }

                if (agendamento.data < dataHoje) {

                    alert(`A data escolhida para "${agendamento.servico}" já passou.`);

                    return false;
                }

                if (!agendamento.hora) {

                    alert(`Escolha um horário para "${agendamento.servico}".`);

                    return false;
                }

                if (agendamento.data === dataHoje) {

                    const [hora, minuto] = agendamento.hora.split(":").map(Number);

                    const horario = new Date();

                    horario.setHours(hora, minuto, 0, 0);

                    if (horario <= agora) {

                        alert(`O horário ${agendamento.hora} para "${agendamento.servico}" já passou.`);

                        return false;
                    }
                }
            }

            for (let i = 0; i < agendamentos.length; i++) {

                for (let j = i + 1; j < agendamentos.length; j++) {

                    const a = agendamentos[i];
                    const b = agendamentos[j];

                    if (a.profissionalId && b.profissionalId && a.profissionalId === b.profissionalId && a.data === b.data && a.hora === b.hora) {

                        alert(`A profissional ${a.profissional} não pode realizar dois serviços no mesmo horário.`);

                        return false;
                    }
                }
            }
        }

        if (numero === 4) {

            if (!nomeInput || !nomeInput.value.trim()) {

                alert("Digite seu nome completo.");
                nomeInput?.focus();

                return false;
            }

            if (!telefoneInput || !telefoneInput.value.trim()) {

                alert("Digite seu telefone.");
                telefoneInput?.focus();

                return false;
            }

            if (!emailInput || !emailInput.value.trim()) {

                alert("Digite seu e-mail.");
                emailInput?.focus();

                return false;
            }

            if (!emailInput.checkValidity()) {

                alert("Digite um e-mail válido.");
                emailInput.focus();

                return false;
            }
        }

        return true;
    }

    function atualizarResumo() {

        if (!semAgendamento || !conteudoResumo) {
            return;
        }

        const selecionados = obterServicosSelecionados();

        if (selecionados.length === 0) {

            semAgendamento.style.display = "block";
            conteudoResumo.classList.remove("visivel");

            return;
        }

        semAgendamento.style.display = "none";
        conteudoResumo.classList.add("visivel");

        detalheServico.innerHTML = selecionados.map(servico => escaparHTML(servico.value)).join("<br>");

        const profissionais = obterProfissionaisSelecionados();

        detalheProfissional.innerHTML = profissionais.length ? profissionais.map(item => `${escaparHTML(item.servico)} : ${escaparHTML(item.profissional)}`).join("<br>") : "—";

        const agendamentos = obterAgendamentos();

        detalheData.innerHTML = agendamentos.filter(item => item.data).map(item => `${escaparHTML(item.servico)}: ${formatarData(item.data)}`).join("<br>") || "—";
        detalheHora.innerHTML = agendamentos.filter(item => item.hora).map(item => `${escaparHTML(item.servico)}: ${escaparHTML(item.hora)}`).join("<br>") || "—";
        detalhePreco.textContent = formatarPreco(calcularTotal());
    }

    function formatarData(data) {

        if (!data) {
            return "—";
        }

        const partes = String(data).split("-");

        if (partes.length !== 3) {
            return data;
        }

        return (partes[2] + "/" + partes[1] + "/" + partes[0]);
    }

    function formatarPreco(valor) {

        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function montarConfirmacao() {

        if (!caixaConfirmacao) {
            return;
        }

        const selecionados = obterServicosSelecionados();
        const agendamentos = obterAgendamentos();

        let html = "";

        selecionados.forEach(servico => {

            const agendamento = agendamentos.find(item => item.servico === servico.value);

            html += `
                    <div class="confirmacao-linha">

                        <span> Serviço</span>
                        <strong> ${escaparHTML(servico.value)}</strong>

                    </div>


                    <div class="confirmacao-linha">

                        <span> Profissional</span>
                        <strong> ${agendamento?.profissional ? escaparHTML(agendamento.profissional) : "—"}</strong>

                    </div>

                    <div class="confirmacao-linha">

                        <span> Data</span>
                        <strong> ${agendamento?.data ? formatarData(agendamento.data) : "—"}</strong>

                    </div>

                    <div class="confirmacao-linha">

                        <span> Horário </span>
                        <strong> ${agendamento?.hora || "—"}</strong>

                    </div>`;
        });

        html += `

            <div class="confirmacao-linha">

                <span> Nome</span>
                <strong> ${escaparHTML(nomeInput?.value || "—")} </strong>

            </div>


            <div class="confirmacao-linha">

                <span> Telefone </span>
                <strong> ${escaparHTML(telefoneInput?.value || "—")} </strong>

            </div>


            <div class="confirmacao-linha">

                <span> E-mail</span>
                <strong>${escaparHTML(emailInput?.value || "—")}</strong>

            </div>

            <div class="confirmacao-linha">

                <span> Total</span>
                <strong> ${formatarPreco(calcularTotal())}</strong>

            </div>`;

        caixaConfirmacao.innerHTML = html;
    }

    function verificarHorarioJaAgendado() {

        const agendamentosSalvos = obterAgendamentosSalvos();
        const atuais = obterAgendamentos();

        for (const atual of atuais) {

            if (!atual.data || !atual.hora || !atual.profissionalId) {
                continue;
            }

            for (const agendamentoSalvo of agendamentosSalvos) {

                if (!Array.isArray(agendamentoSalvo.servicos)) {
                    continue;
                }

                for (const salvo of agendamentoSalvo.servicos) {

                    const mesmoHorario =
                        String(salvo.data || "") ===
                        String(atual.data) &&
                        String(salvo.hora || "") ===
                        String(atual.hora) &&
                        String(salvo.profissionalId || "") ===
                        String(atual.profissionalId);

                    if (mesmoHorario) {

                        return {
                            ocupado: true,
                            servico: atual.servico,
                            data: atual.data,
                            hora: atual.hora,
                            profissional: atual.profissional

                        };
                    }
                }
            }
        }

        return {
            ocupado: false
        };
    }

    function salvarAgendamento() {

        const servicosAgendados = obterAgendamentos();

        if (servicosAgendados.length === 0) {

            console.error("Nenhum serviço encontrado.");

            return null;
        }

        const cliente = {

            id: clienteAtual?.id || ("cliente_" + Date.now()), nome: nomeInput.value.trim(), telefone: telefoneInput.value.trim(), email: emailInput.value.trim()

        };

        clienteAtual = cliente;

        salvarLocalStorage("belezaArteClienteAtual", cliente);

        const novoAgendamento = {

            id: Date.now(), clienteId: cliente.id, nome: cliente.nome, telefone: cliente.telefone, email: cliente.email, servicos: servicosAgendados, status: "Agendado", criadoEm: new Date().toISOString()

        };

        const agendamentosSalvos = obterAgendamentosSalvos();

        agendamentosSalvos.push(novoAgendamento);

        const salvou = salvarLocalStorage("belezaArteAgendamentos", agendamentosSalvos);

        if (!salvou) {
            return null;
        }

        return novoAgendamento;
    }

    if (botaoConfirmar) {

        botaoConfirmar.addEventListener("click", () => {

            if (!validarEtapa(4)) {

                mostrarEtapa(4);

                return;
            }

            if (!validarEtapa(3)) {

                mostrarEtapa(3);

                return;
            }

            const verificacao = verificarHorarioJaAgendado();

            if (verificacao.ocupado) {

                alert("⚠️ HORÁRIO JÁ AGENDADO!\n\n" + "Este horário já foi escolhido.\n\n" + "Serviço: " + verificacao.servico + "\nProfissional: " + verificacao.profissional + "\nData: " + formatarData(verificacao.data) + "\nHorário: " + verificacao.hora + "\n\nEscolha outro horário.");

                mostrarEtapa(3);

                return;
            }

            const novoAgendamento = salvarAgendamento();

            if (!novoAgendamento) {

                alert("❌ Não foi possível realizar o agendamento.");

                return;
            }

            alert("✅ AGENDAMENTO REALIZADO COM SUCESSO!\n\n" + "Seu horário foi confirmado e já está disponível " + "em MEUS AGENDAMENTOS.");

            carregarMeusAgendamentos();

            const secao = document.getElementById("meus-agendamentos");

            if (secao) {
                secao.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        });
    }

    botoesProximo.forEach(botao => {

        botao.addEventListener("click", () => {

            if (!validarEtapa(etapaAtual)) {
                return;
            }

            const proxima = Number(botao.dataset.proximo);

            mostrarEtapa(proxima);
        });
    });

    botoesVoltar.forEach(botao => {

        botao.addEventListener("click", () => {

            const voltarPara = Number(botao.dataset.voltar);

            mostrarEtapa(voltarPara);
        });
    });

    servicos.forEach(input => {

        input.addEventListener("change", () => {

            atualizarCardsServicos();

            if (etapaAtual === 2) {
                criarProfissionaisPorServico();
            }

            if (etapaAtual === 3) {
                criarAgendaPorServico();
            }

            atualizarResumo();
        });
    });

    function atualizarCardsServicos() {

        document.querySelectorAll(".opcao-servico").forEach(card => {

            const checkbox = card.querySelector('input[name="servico"]');

            if (!checkbox) {
                return;
            }

            card.classList.toggle("selecionado", checkbox.checked);
        });
    }

    function carregarMeusAgendamentos() {

        if (!listaMeusAgendamentos) {
            return;
        }

        const agendamentos = obterAgendamentosSalvos();
        const cliente = obterLocalStorage("belezaArteClienteAtual", null);

        let meusAgendamentos = [];

        if (cliente?.id) {

            meusAgendamentos = agendamentos.filter(agendamento => String(agendamento.clienteId) === String(cliente.id));
        }

        if (meusAgendamentos.length === 0 && cliente) {

            meusAgendamentos = agendamentos.filter(agendamento => {

                const mesmoEmail = cliente.email && agendamento.email && normalizarTexto(cliente.email) === normalizarTexto(agendamento.email);
                const mesmoTelefone = cliente.telefone && agendamento.telefone && somenteNumeros(cliente.telefone) === somenteNumeros(agendamento.telefone);
                const mesmoNome = cliente.nome && agendamento.nome && normalizarTexto(cliente.nome) === normalizarTexto(agendamento.nome);

                return (mesmoEmail || mesmoTelefone || mesmoNome);
            });
        }

        meusAgendamentos = Array.from(new Map(meusAgendamentos.map(agendamento => [agendamento.id, agendamento])).values());

        const itens = [];

        meusAgendamentos.forEach(agendamento => {

            if (!Array.isArray(agendamento.servicos)) {
                return;
            }

            agendamento.servicos.forEach(servico => {

                itens.push({

                    agendamento: agendamento,
                    servico: servico

                });
            });
        });

        const agora = new Date();

        itens.sort((a, b) => {

            const dataA = obterDataHoraServico(a.servico);
            const dataB = obterDataHoraServico(b.servico);
            const tempoA = dataA.getTime();
            const tempoB = dataB.getTime();
            const agoraTempo = agora.getTime();
            const futuroA = tempoA >= agoraTempo;
            const futuroB = tempoB >= agoraTempo;

            if (futuroA && futuroB) {
                return (tempoA - tempoB);
            }

            if (futuroA && !futuroB) {
                return -1;
            }

            if (!futuroA && futuroB) {
                return 1;
            }

            return (tempoB - tempoA);
        });

        renderizarMeusAgendamentos(itens, listaMeusAgendamentos);

        if (botaoExcluirTodos) {
            botaoExcluirTodos.disabled = itens.length === 0;
        }
    }

    function obterDataHoraServico(servico) {

        if (!servico || !servico.data) {
            return new Date("9999-12-31T23:59:59");
        }

        const data = String(servico.data);
        const hora = servico.hora || "00:00";

        if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {

            const [ano, mes, dia] = data.split("-").map(Number);
            const [h, m] = hora.split(":").map(Number);

            return new Date(ano, mes - 1, dia, h || 0, m || 0, 0, 0);
        }

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {

            const [dia, mes, ano] = data.split("/").map(Number);
            const [h, m] = hora.split(":").map(Number);

            return new Date(ano, mes - 1, dia, h || 0, m || 0, 0, 0);
        }

        return new Date(data + "T" + hora);
    }

    function renderizarMeusAgendamentos(itens, lista) {

        lista.innerHTML = "";

        if (itens.length === 0) {

            lista.innerHTML = `

                <div class="sem-agendamentos-cliente">
                    <div class="icone"> ▣ </div>
                    <h3> Você ainda não possui agendamentos </h3>
                    <p> Seus horários confirmados aparecerão aqui. </p>
                </div>`;

            return;
        }

        const agora = new Date();

        itens.forEach((item, indice) => {

            const agendamento = item.agendamento;
            const servico = item.servico;
            const dataHora = obterDataHoraServico(servico);
            const ehProximo = indice === 0 && dataHora.getTime() >= agora.getTime();
            const card = document.createElement("div");

            card.className = "card-meu-agendamento";

            if (ehProximo) {
                card.classList.add("proximo");
            }

            const nomeServico = servico.servico || "Serviço";
            const profissional = servico.profissional || "Profissional";
            const status = agendamento.status || "Agendado";

            card.innerHTML = `

                    <div class="data-meu-agendamento">

                        ${ehProximo ? `<span class="etiqueta-proximo"> PRÓXIMO AGENDAMENTO</span>` : ""}

                        <strong>${formatarData(servico.data)}</strong>
                        <span class="hora"> ${escaparHTML(servico.hora || "—")} </span>

                    </div>

                    <div class="info-meu-agendamento">

                        <h3> ${escaparHTML(nomeServico)} </h3>

                        <p>
                            <strong> Profissional: </strong>
                            ${escaparHTML(profissional)}
                        </p>

                        <p>
                            <strong> Cliente: </strong>
                            ${escaparHTML(agendamento.nome || "—")}
                        </p>

                        <p> 
                            <strong> Telefone: </strong>
                            ${escaparHTML(agendamento.telefone || "—")}
                        </p>

                    </div>


                    <div class="status-meu-agendamento">

                        <span class="status">${escaparHTML(status)}</span>
                       <button type="button" class="botao-cancelar-cliente" data-id="${escaparAtributo(agendamento.id)}" data-servico="${escaparAtributo(servico.servico)}"> CANCELAR AGENDAMENTO </button>
                    
                       </div>`;

            const botaoCancelar = card.querySelector(".botao-cancelar-cliente");

            if (botaoCancelar) {

                botaoCancelar.addEventListener("click", () => {

                    cancelarAgendamentoCliente(agendamento.id, servico.servico);
                });
            }

            lista.appendChild(card);
        });
    }

    function cancelarAgendamentoCliente(id, servicoNome) {

        const confirmar = confirm(`Tem certeza que deseja cancelar o serviço "${servicoNome}"?`);

        if (!confirmar) {
            return;
        }

        let agendamentos = obterAgendamentosSalvos();

        const indiceAgendamento = agendamentos.findIndex(agendamento => String(agendamento.id) === String(id));

        if (indiceAgendamento === -1) {

            alert("❌ Agendamento não encontrado.");

            return;
        }

        const agendamento = agendamentos[indiceAgendamento];

        if (!Array.isArray(agendamento.servicos)) {

            alert("❌ Este agendamento não possui serviços.");

            return;
        }

        const indiceServico = agendamento.servicos.findIndex(servico => normalizarTexto(servico.servico) === normalizarTexto(servicoNome));

        if (indiceServico === -1) {

            alert("❌ Serviço não encontrado.");

            return;
        }

        const servicoCancelado = agendamento.servicos[indiceServico];

        const registroCancelamento = registrarCancelamento({

            agendamento: agendamento,
            servico: servicoCancelado,
            canceladoPor: "CLIENTE"

        });

        if (!registroCancelamento) {

            alert("❌ Não foi possível registrar o cancelamento.");

            return;
        }

        salvarNotificacaoCancelamento(registroCancelamento, "PROFISSIONAL");

        agendamento.servicos.splice(indiceServico, 1);

        if (agendamento.servicos.length === 0) {
            agendamentos.splice(indiceAgendamento, 1);
        }

        const salvou = salvarLocalStorage("belezaArteAgendamentos", agendamentos);

        if (!salvou) {

            alert("❌ Não foi possível cancelar o agendamento.");

            return;
        }

        carregarMeusAgendamentos();

        alert(`✅ CANCELAMENTO REALIZADO!\n\n` + `O serviço "${servicoNome}" foi cancelado com sucesso.\n\n` + "A profissional foi notificada sobre o cancelamento.");
    }

    function excluirTodosAgendamentosCliente() {

        const cliente = obterLocalStorage("belezaArteClienteAtual", null);

        if (!cliente) {

            alert("Não foi possível identificar seus agendamentos.");

            return;
        }

        const agendamentos = obterAgendamentosSalvos();

        let meusAgendamentos = agendamentos.filter(agendamento => {

            if (cliente.id && agendamento.clienteId) {
                return String(agendamento.clienteId) === String(cliente.id);
            }

            if (cliente.email && agendamento.email) {
                return (normalizarTexto(cliente.email) === normalizarTexto(agendamento.email));
            }

            if (cliente.telefone && agendamento.telefone) {
                return (somenteNumeros(cliente.telefone) === somenteNumeros(agendamento.telefone));
            }

            if (cliente.nome && agendamento.nome) {
                return (normalizarTexto(cliente.nome) === normalizarTexto(agendamento.nome));
            }

            return false;
        });

        if (
            meusAgendamentos.length === 0
        ) {

            alert("Você não possui agendamentos para excluir.");

            return;
        }

        const quantidade = meusAgendamentos.length;

        const confirmar = confirm("⚠️ EXCLUIR TODOS OS AGENDAMENTOS?\n\n" + "Foram encontrados " + quantidade + " agendamento(s) seu(s).\n\n" + "Todos eles serão removidos permanentemente.\n\n" + "Deseja realmente continuar?");

        if (!confirmar) {
            return;
        }

        const novosAgendamentos = agendamentos.filter(agendamento => {

            const pertenceAoCliente = meusAgendamentos.some(meuAgendamento =>
                String(meuAgendamento.id) === String(agendamento.id)
            );

            return !pertenceAoCliente;
        });

        const salvou = salvarLocalStorage("belezaArteAgendamentos", novosAgendamentos);

        if (!salvou) {

            alert("❌ Não foi possível excluir os agendamentos.");

            return;
        }

        carregarMeusAgendamentos();

        alert("✅ TODOS OS SEUS AGENDAMENTOS FORAM EXCLUÍDOS!\n\n" + quantidade + " agendamento(s) foram removidos.");
    }

    function somenteNumeros(valor) {

        return String(valor || "")
            .replace(/\D/g, "");
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

    if (botaoExcluirTodos) {

        botaoExcluirTodos.addEventListener("click", () => {
            excluirTodosAgendamentosCliente();
        });
    }

    atualizarCardsServicos();
    atualizarResumo();
    carregarMeusAgendamentos();

});
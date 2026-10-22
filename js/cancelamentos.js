const CHAVE_CANCELAMENTOS = "belezaArteCancelamentos";
const CHAVE_NOTIFICACAO_CANCELAMENTO = "belezaArteNotificacaoCancelamento";

function obterCancelamentos() {
    try {
        const dados = localStorage.getItem(CHAVE_CANCELAMENTOS);

        if (!dados) {
            return [];
        }

        const resultado = JSON.parse(dados);
        
        return Array.isArray(resultado) ? resultado : [];
    } catch (erro) {
        console.error("Erro ao ler histórico de cancelamentos:", erro);
        return [];

    }

}

function salvarCancelamentos(cancelamentos) {
    try {
        localStorage.setItem(CHAVE_CANCELAMENTOS, JSON.stringify(cancelamentos));
        return true;
    } catch (erro) {
        console.error("Erro ao salvar histórico:", erro);
        return false;
    }

}

function formatarDataCancelamento(data) {
    if (!data) {
        return "—";
    }

    const valor = String(data);

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
    }

    return valor;
}

function obterDataHoraCancelamento() {
    const agora = new Date();

    return {
        data: agora.toLocaleDateString("pt-BR"),
        hora: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        timestamp: Date.now()
    };
}

function registrarCancelamento({
    agendamento, servico, canceladoPor = "CLIENTE"

}) {

    if (!agendamento) {
        console.error("Não foi possível registrar o cancelamento: agendamento inexistente.");
        return null;

    }

    if (!servico) {
        console.error("Não foi possível registrar o cancelamento: serviço inexistente.");
        return null;

    }

    const cancelamentos = obterCancelamentos();
    const agora = obterDataHoraCancelamento();

    const registro = {
        id: "cancelamento-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
        agendamentoId: agendamento.id || null,
        clienteId: agendamento.clienteId || null,
        cliente: agendamento.nome || "Cliente",
        telefone: agendamento.telefone || "",
        email: agendamento.email || "",
        profissionalId: servico.profissionalId || null,
        profissional: servico.profissional || "Profissional",
        servico: servico.servico || servico.nomeServico || "Serviço",
        data: servico.data || "",
        hora: servico.hora || "",
        canceladoPor: canceladoPor,
        status: "CANCELADO",
        dataCancelamento: agora.data,
        horaCancelamento: agora.hora,
        timestamp: agora.timestamp

    };

    cancelamentos.unshift(registro);

    const salvo = salvarCancelamentos(cancelamentos);

    if (!salvo) {
        return null;
    }

    console.log("Cancelamento registrado:", registro);
    return registro;

}

function salvarNotificacaoCancelamento(registro, destinatario) {
    if (!registro) {
        return null;
    }

    const notificacao = {
        id: "notificacao-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
        destinatario: destinatario,
        registro: registro,
        criadaEm: Date.now(),
        lida: false

    };

    let notificacoes = [];

    try {
        notificacoes = JSON.parse(localStorage.getItem("belezaArteNotificacoesCancelamento")) || [];
    } catch (erro) {
        notificacoes = [];

    }

    if (!Array.isArray(notificacoes)) {
        notificacoes = [];

    }

    notificacoes.unshift(notificacao);

    try {
        localStorage.setItem("belezaArteNotificacoesCancelamento", JSON.stringify(notificacoes));
    } catch (erro) {
        console.error("Erro ao salvar notificação:", erro);
        return null;
    }

    return notificacao;
}

function obterNotificacaoCancelamento() {
    try {
        const dados = localStorage.getItem(CHAVE_NOTIFICACAO_CANCELAMENTO);

        if (!dados) {
            return null;
        }

        return JSON.parse(dados);
    } catch (erro) {
        console.error("Erro ao ler notificação:", erro);
        return null;

    }

}

function removerNotificacaoCancelamento() {
    localStorage.removeItem(CHAVE_NOTIFICACAO_CANCELAMENTO);

}

function escaparHTMLCancelamento(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
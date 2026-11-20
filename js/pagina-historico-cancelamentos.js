// Histórico geral de cancelamentos (todos os agendamentos com status CANCELADO).
// Requer js/api/appointment-api.js e js/cancelamentos.js.
document.addEventListener("DOMContentLoaded", () => {
    const lista = document.getElementById("lista-historico");

    if (!lista) {
        return;
    }

    carregarHistorico(lista);
});

async function carregarHistorico(lista) {
    mensagemHistorico(lista, "↻", "Carregando...", "Buscando os cancelamentos na API.");

    try {
        const [cancelamentos, nomes] = await Promise.all([
            carregarCancelamentos(),
            carregarNomesAgenda()
        ]);

        if (cancelamentos.length === 0) {
            mensagemHistorico(lista, "✓", "Nenhum cancelamento", "Ainda não existem cancelamentos registrados.");
            return;
        }

        lista.innerHTML = "";
        cancelamentos.forEach(agendamento => {
            lista.appendChild(criarCardCancelamento(agendamento, nomes));
        });
    } catch (erro) {
        mensagemHistorico(lista, "!", "Não foi possível carregar o histórico", erro.message || "Tente novamente mais tarde.");
    }
}

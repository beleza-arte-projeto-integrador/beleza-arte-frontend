// Histórico de cancelamentos da profissional logada (agendamentos CANCELADO com itens dela).
// Requer js/api/appointment-api.js e js/cancelamentos.js.
document.addEventListener("DOMContentLoaded", async () => {
    const listaHistorico = document.getElementById("lista-historico");

    if (!listaHistorico) {
        return;
    }

    const profissionalAtual = obterProfissionalAtual();

    if (!profissionalAtual) {
        mensagemHistorico(listaHistorico, "🔒", "Profissional não logada", "Entre na sua conta profissional para visualizar o histórico.");
        return;
    }

    mensagemHistorico(listaHistorico, "↻", "Carregando...", "Buscando os cancelamentos na API.");

    try {
        const [cancelamentos, nomes] = await Promise.all([
            carregarCancelamentos(profissionalAtual.id),
            carregarNomesAgenda()
        ]);

        if (cancelamentos.length === 0) {
            mensagemHistorico(listaHistorico, "↻", "Nenhum cancelamento", "Ainda não existem desistências ou cancelamentos registrados.");
            return;
        }

        listaHistorico.innerHTML = "";
        cancelamentos.forEach(agendamento => {
            listaHistorico.appendChild(criarCardCancelamento(agendamento, nomes, profissionalAtual.id));
        });
    } catch (erro) {
        mensagemHistorico(listaHistorico, "!", "Não foi possível carregar o histórico", erro.message || "Tente novamente mais tarde.");
    }
});

// Protege as páginas da área da profissional. Carregar depois de professional-api.js
// e antes do script da página.
// 1. Sem profissional logada: volta para o login na hora.
// 2. Confere no backend se o cadastro ainda existe e está ativo; se não, desloga.
//    Se a API estiver fora do ar, a sessão é mantida (não dá para confirmar nada).
(function () {
    const CHAVE = "belezaArteProfissionalAtual";
    const LOGIN = "login-profissional.html";

    function sair(aviso) {
        localStorage.removeItem(CHAVE);
        if (aviso) alert(aviso);
        window.location.replace(LOGIN);
    }

    let atual = null;
    try {
        atual = JSON.parse(localStorage.getItem(CHAVE));
    } catch {
        atual = null;
    }

    if (!atual || atual.id === undefined || atual.id === null) {
        sair();
        return;
    }

    if (!window.professionalApi) return;

    professionalApi.findById(atual.id).then(profissional => {
        if (!profissional) {
            sair("Seu cadastro não foi encontrado. Faça login novamente.");
        } else if (profissional.active === false) {
            sair("Seu cadastro está inativo. Procure a administração do salão.");
        } else {
            localStorage.setItem(CHAVE, JSON.stringify(professionalApi.withoutPassword(profissional)));
        }
    }).catch(erro => {
        console.warn("Não foi possível validar a profissional logada:", erro);
    });
})();

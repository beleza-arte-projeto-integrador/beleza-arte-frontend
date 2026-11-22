// Aviso fixo "Modo demonstração", colocado pelo server.js em todas as páginas
// HTML enquanto o mock estiver ligado. As páginas em si não são alteradas.

const MESSAGES = {
    hybrid: "Agendamentos, itens, pagamentos e relatório são simulados. Clientes, profissionais, serviços e recursos vêm do backend.",
    offline: "Todos os dados são simulados (sem backend). Eles voltam ao estado inicial quando o servidor é reiniciado."
};

function bannerHtml(mode) {
    return `
<div id="demo-mode-banner" role="status" style="position:fixed;left:16px;bottom:16px;z-index:2147483647;max-width:min(420px,calc(100vw - 32px));display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:#3b2a00;color:#fff7e0;border:1px solid #f0b429;box-shadow:0 4px 16px rgba(0,0,0,.25);font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;">
  <div><strong style="display:block;color:#f0b429;">Modo demonstração</strong>${MESSAGES[mode]}</div>
  <button type="button" aria-label="Fechar aviso" onclick="this.parentElement.remove()" style="background:none;border:0;color:inherit;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>
</div>
`;
}

module.exports = { bannerHtml };

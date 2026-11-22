/*
 * Modal de avisos no visual do site (substitui alert, confirm e prompt).
 *
 *   await avisoModal.mostrar({ tipo: "sucesso", titulo: "Pronto!", texto: "..." });
 *   const { confirmado, valor } = await avisoModal.confirmar({
 *       titulo: "Cancelar?", texto: "...", campo: { rotulo: "Motivo (opcional)" }
 *   });
 *
 * tipo: "sucesso" | "erro" | "aviso" (padrão). Os textos entram como texto puro.
 */
(function () {
    const ICONES = { sucesso: "✓", erro: "!", aviso: "!" };
    let elementos = null;
    let fecharAtual = null;

    function criar() {
        const modal = document.createElement("div");
        modal.className = "aviso-modal";
        modal.hidden = true;
        modal.innerHTML = `
            <div class="aviso-modal-fundo" data-fechar></div>
            <div class="aviso-modal-card" role="dialog" aria-modal="true" aria-labelledby="aviso-modal-titulo" aria-describedby="aviso-modal-texto">
                <span class="aviso-modal-icone" aria-hidden="true"></span>
                <h2 id="aviso-modal-titulo"></h2>
                <span class="aviso-modal-linha" aria-hidden="true"></span>
                <p id="aviso-modal-texto"></p>
                <label class="aviso-modal-campo" hidden>
                    <span></span>
                    <textarea rows="3"></textarea>
                </label>
                <div class="aviso-modal-botoes">
                    <button type="button" class="aviso-modal-secundario" hidden></button>
                    <button type="button" class="aviso-modal-principal"></button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        modal.addEventListener("click", evento => {
            if (evento.target.hasAttribute("data-fechar")) fecharAtual?.(false);
        });
        document.addEventListener("keydown", evento => {
            if (evento.key === "Escape" && !modal.hidden) fecharAtual?.(false);
        });

        return {
            modal,
            card: modal.querySelector(".aviso-modal-card"),
            icone: modal.querySelector(".aviso-modal-icone"),
            titulo: modal.querySelector("#aviso-modal-titulo"),
            texto: modal.querySelector("#aviso-modal-texto"),
            campo: modal.querySelector(".aviso-modal-campo"),
            rotulo: modal.querySelector(".aviso-modal-campo span"),
            textarea: modal.querySelector(".aviso-modal-campo textarea"),
            secundario: modal.querySelector(".aviso-modal-secundario"),
            principal: modal.querySelector(".aviso-modal-principal")
        };
    }

    function abrir({ tipo = "aviso", titulo, texto = "", botao = "OK", cancelar = null, campo = null }) {
        if (!elementos) elementos = criar();
        fecharAtual?.(false); // só um aviso por vez

        const e = elementos;
        const focoAnterior = document.activeElement;
        e.card.className = `aviso-modal-card ${tipo}`;
        e.icone.textContent = ICONES[tipo] || ICONES.aviso;
        e.titulo.textContent = titulo;
        e.texto.textContent = texto;
        e.texto.hidden = !texto;
        e.principal.textContent = botao;
        e.secundario.textContent = cancelar || "";
        e.secundario.hidden = !cancelar;
        e.campo.hidden = !campo;
        e.rotulo.textContent = campo?.rotulo || "";
        e.textarea.placeholder = campo?.placeholder || "";
        e.textarea.value = "";

        return new Promise(resolve => {
            function fechar(confirmado) {
                e.modal.hidden = true;
                document.body.classList.remove("aviso-modal-aberto");
                e.principal.onclick = null;
                e.secundario.onclick = null;
                fecharAtual = null;
                focoAnterior?.focus?.({ preventScroll: true });
                resolve({ confirmado, valor: e.textarea.value.trim() });
            }
            fecharAtual = fechar;
            e.principal.onclick = () => fechar(true);
            e.secundario.onclick = () => fechar(false);

            e.modal.hidden = false;
            document.body.classList.add("aviso-modal-aberto");
            (campo ? e.textarea : e.principal).focus();
        });
    }

    window.avisoModal = {
        /** Aviso com um botão. Resolve quando for fechado. */
        mostrar: opcoes => abrir(opcoes).then(() => undefined),
        /** Pergunta com dois botões (e campo de texto opcional). */
        confirmar: ({ confirmar = "CONFIRMAR", cancelar = "VOLTAR", ...opcoes }) =>
            abrir({ ...opcoes, botao: confirmar, cancelar })
    };
})();

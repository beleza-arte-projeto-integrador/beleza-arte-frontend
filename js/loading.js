/*
 * Indicador global de carregamento.
 * Intercepta window.fetch e exibe um overlay enquanto houver requisições pendentes.
 * Deve ser carregado no <head>, antes dos scripts de API.
 *
 * Uso manual (opcional): Loading.show() / Loading.hide()
 * Para ignorar uma requisição específica: fetch(url, { skipLoading: true })
 */
(function () {
    "use strict";

    const SHOW_DELAY_MS = 250;  // só aparece se demorar mais que isso (evita piscar)
    const MIN_VISIBLE_MS = 300; // depois de aparecer, fica visível pelo menos esse tempo

    let pending = 0;
    let showTimer = null;
    let visibleSince = 0;
    let overlay = null;

    const css = `
        .global-loading {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: rgba(9, 9, 9, 0.6);
            backdrop-filter: blur(2px);
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        .global-loading.is-visible {
            opacity: 1;
            visibility: visible;
        }
        .global-loading__spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(214, 160, 56, 0.25);
            border-top-color: #d6a038;
            border-radius: 50%;
            animation: global-loading-spin 0.8s linear infinite;
        }
        .global-loading__text {
            color: #fff;
            font-family: 'Poppins', Arial, sans-serif;
            font-size: 0.95rem;
            letter-spacing: 0.5px;
        }
        @keyframes global-loading-spin {
            to { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
            .global-loading__spinner { animation-duration: 2s; }
        }
    `;

    function ensureOverlay() {
        if (overlay) return overlay;
        if (!document.body) return null;

        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);

        overlay = document.createElement("div");
        overlay.className = "global-loading";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.innerHTML =
            '<div class="global-loading__spinner" aria-hidden="true"></div>' +
            '<span class="global-loading__text">Carregando...</span>';
        document.body.appendChild(overlay);
        return overlay;
    }

    function reveal() {
        showTimer = null;
        if (pending === 0) return;
        const el = ensureOverlay();
        if (!el) {
            // body ainda não existe; tenta de novo quando o DOM estiver pronto
            document.addEventListener("DOMContentLoaded", reveal, { once: true });
            return;
        }
        el.classList.add("is-visible");
        visibleSince = Date.now();
    }

    function conceal() {
        if (!overlay || !overlay.classList.contains("is-visible")) return;
        const elapsed = Date.now() - visibleSince;
        const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
        setTimeout(() => {
            if (pending === 0) overlay.classList.remove("is-visible");
        }, wait);
    }

    function start() {
        pending += 1;
        if (pending === 1 && !showTimer) {
            showTimer = setTimeout(reveal, SHOW_DELAY_MS);
        }
    }

    function stop() {
        pending = Math.max(0, pending - 1);
        if (pending === 0) {
            if (showTimer) {
                clearTimeout(showTimer);
                showTimer = null;
            }
            conceal();
        }
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
        if (init && init.skipLoading) {
            return originalFetch(input, init);
        }
        start();
        let result;
        try {
            result = originalFetch(input, init);
        } catch (error) {
            stop();
            throw error;
        }
        return result.finally(stop);
    };

    window.Loading = { show: start, hide: stop };
})();

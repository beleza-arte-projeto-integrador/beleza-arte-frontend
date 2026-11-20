document.addEventListener("DOMContentLoaded", () => {
    const api = window.paymentApi;
    const fmt = api.format;

    const list = document.getElementById("payment-list");
    const count = document.getElementById("payment-count");
    const loading = document.getElementById("payment-loading");
    const statusFilter = document.getElementById("payment-status-filter");
    const exportButton = document.getElementById("export-payments");
    const notifications = document.getElementById("payment-notifications");

    const monthInput = document.getElementById("payment-month");
    const summaryLoading = document.getElementById("summary-loading");
    const summaryError = document.getElementById("summary-error");
    const metrics = {
        receivedLabel: document.getElementById("metric-received-label"),
        received: document.getElementById("metric-received"),
        receivedChange: document.getElementById("metric-received-change"),
        pending: document.getElementById("metric-pending"),
        pendingCount: document.getElementById("metric-pending-count"),
        rate: document.getElementById("metric-rate"),
        rateNote: document.getElementById("metric-rate-note")
    };

    const revenueTabs = [...document.querySelectorAll(".revenue-tabs button[data-period]")];
    const revenue = {
        range: document.getElementById("revenue-range"),
        received: document.getElementById("revenue-received"),
        previous: document.getElementById("revenue-previous"),
        change: document.getElementById("revenue-change")
    };

    const payModal = document.getElementById("payment-pay-modal");
    const payForm = document.getElementById("payment-pay-form");
    const payMethod = document.getElementById("payment-pay-method");
    const confirmPayment = document.getElementById("confirm-payment");
    const payDetails = {
        client: document.getElementById("payment-pay-client"),
        services: document.getElementById("payment-pay-services"),
        date: document.getElementById("payment-pay-date"),
        amount: document.getElementById("payment-pay-amount")
    };

    /** @type {PaymentListItem[]} */
    let payments = [];
    /** @type {PaymentListItem|null} */
    let pendingPayment = null;
    let paying = false;
    let revenuePeriod = "DAY";
    // Contadores para descartar respostas antigas quando o filtro muda rápido.
    let listRequest = 0;
    let summaryRequest = 0;
    let revenueRequest = 0;

    function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]); }

    function showMessage(text, type = "info") {
        const titles = { success: "Tudo certo", error: "Algo deu errado", info: "Aviso" };
        const icons = { success: "✓", error: "!", info: "i" };
        const notification = document.createElement("div");
        notification.className = `service-notification ${type}`;
        notification.innerHTML = `<span class="service-notification-icon">${icons[type]}</span><span class="service-notification-content"><strong class="service-notification-title">${titles[type]}</strong><span class="service-notification-text">${escapeHtml(text)}</span></span><button class="service-notification-close" type="button" aria-label="Fechar notificação">×</button>`;
        notification.querySelector("button").addEventListener("click", () => notification.remove());
        notifications.appendChild(notification);
        window.setTimeout(() => notification.remove(), type === "error" ? 7000 : 4500);
    }

    function setLoading(value) {
        loading.hidden = !value;
        statusFilter.disabled = value;
        exportButton.disabled = value;
        list.querySelectorAll("button").forEach(button => { button.disabled = value || paying; });
    }

    // ------------------------------------------------------------------
    // Tabela de pagamentos
    // ------------------------------------------------------------------
    function renderPayments() {
        const filterLabel = statusFilter.value ? ` (${api.statusLabel(statusFilter.value).toLowerCase()})` : "";
        count.textContent = `${payments.length} pagamento${payments.length === 1 ? "" : "s"} encontrado${payments.length === 1 ? "" : "s"}${filterLabel}`;
        if (!payments.length) {
            list.innerHTML = `<div class="empty-payments"><strong>Nenhum pagamento encontrado</strong><span>${statusFilter.value ? "Altere o filtro de status para ver outros pagamentos." : "Os pagamentos aparecem aqui quando itens são adicionados a um agendamento."}</span></div>`;
            return;
        }
        list.innerHTML = payments.map(payment => {
            const paidAt = payment.paidAt ? `<small>Pago em ${escapeHtml(fmt.dateTime(payment.paidAt))}</small>` : "";
            const action = api.isPending(payment)
                ? `<button type="button" data-action="pay" data-id="${escapeHtml(payment.id)}"${paying ? " disabled" : ""}>REGISTRAR PAGAMENTO</button>`
                : `<span class="no-action" aria-hidden="true">—</span>`;
            return `<div class="table-row">`
                + `<strong>${escapeHtml(payment.clientName || "—")}<small>Agendamento #${escapeHtml(payment.idAppointment)}</small></strong>`
                + `<span>${escapeHtml(fmt.dateTime(payment.appointmentDate))}</span>`
                + `<span>${escapeHtml(payment.services || "—")}</span>`
                + `<strong>${escapeHtml(fmt.currency(payment.amount))}</strong>`
                + `<span>${escapeHtml(api.methodLabel(payment.method))}${paidAt}</span>`
                + `<span class="tag ${escapeHtml(api.statusTag(payment.status))}">${escapeHtml(api.statusLabel(payment.status))}</span>`
                + `<div class="payment-actions">${action}</div>`
                + `</div>`;
        }).join("");
    }

    function renderPaymentsError(message) {
        count.textContent = "Não foi possível carregar os pagamentos.";
        list.innerHTML = `<div class="empty-payments error"><strong>Não foi possível carregar os pagamentos</strong><span>${escapeHtml(message)}</span><button class="outline-button" type="button" data-action="retry">TENTAR NOVAMENTE</button></div>`;
    }

    async function loadPayments() {
        const requestId = ++listRequest;
        setLoading(true);
        try {
            const result = await api.listPayments(statusFilter.value);
            if (requestId !== listRequest) return;
            payments = result;
            renderPayments();
        } catch (error) {
            if (requestId !== listRequest) return;
            payments = [];
            const message = error.message || "Não foi possível carregar os pagamentos.";
            renderPaymentsError(message);
            showMessage(message, "error");
        } finally {
            if (requestId === listRequest) setLoading(false);
        }
    }

    // ------------------------------------------------------------------
    // Cards de métricas
    // ------------------------------------------------------------------
    function setChange(element, percent, suffix) {
        element.classList.remove("positive", "negative", "neutral", "warning");
        if (percent === null || percent === undefined || !Number.isFinite(Number(percent))) {
            element.classList.add("neutral");
            element.innerHTML = `— <span>${escapeHtml(suffix)}</span>`;
            return;
        }
        const value = Number(percent);
        const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
        element.classList.add(value > 0 ? "positive" : value < 0 ? "negative" : "neutral");
        element.innerHTML = `${arrow} ${escapeHtml(fmt.percent(Math.abs(value)))} <span>${escapeHtml(suffix)}</span>`;
    }

    /** @param {PaymentSummary} summary */
    function renderSummary(summary) {
        const month = summary.month || monthInput.value;
        metrics.receivedLabel.textContent = month === fmt.currentMonth() ? "RECEBIDO ESTE MÊS" : `RECEBIDO EM ${fmt.month(month)}`;
        metrics.received.textContent = fmt.currency(summary.receivedMonth);
        setChange(metrics.receivedChange, summary.receivedChangePercent, "vs. mês anterior");

        metrics.pending.textContent = fmt.currency(summary.pendingAmount);
        const pendingCount = Number(summary.pendingAppointments) || 0;
        metrics.pendingCount.textContent = `${String(pendingCount).padStart(2, "0")} atendimento${pendingCount === 1 ? "" : "s"}`;

        metrics.rate.textContent = fmt.percent(summary.receiptRatePercent);
        metrics.rateNote.textContent = summary.receiptRatePercent === null || summary.receiptRatePercent === undefined
            ? "Sem cobranças no mês"
            : `Referente a ${fmt.month(month)}`;
    }

    function clearSummary() {
        Object.entries(metrics).forEach(([key, element]) => {
            if (key === "receivedLabel") return;
            element.classList?.remove("positive", "negative");
            element.textContent = "—";
        });
    }

    async function loadSummary() {
        const requestId = ++summaryRequest;
        summaryLoading.hidden = false;
        summaryError.hidden = true;
        try {
            const summary = await api.getSummary(monthInput.value || undefined);
            if (requestId !== summaryRequest) return;
            renderSummary(summary || {});
        } catch (error) {
            if (requestId !== summaryRequest) return;
            clearSummary();
            summaryError.textContent = error.message || "Não foi possível carregar as métricas.";
            summaryError.hidden = false;
        } finally {
            if (requestId === summaryRequest) summaryLoading.hidden = true;
        }
    }

    // ------------------------------------------------------------------
    // Faturamento por período
    // ------------------------------------------------------------------
    function selectTab(period) {
        revenueTabs.forEach(tab => {
            const active = tab.dataset.period === period;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
    }

    /** @param {PaymentRevenue} data */
    function renderRevenue(data) {
        revenue.received.textContent = fmt.currency(data.received);
        revenue.previous.textContent = fmt.currency(data.receivedPrevious);
        setChange(revenue.change, data.changePercent, "");
        const start = fmt.date(data.start);
        const end = fmt.date(data.end);
        revenue.range.textContent = start === "—"
            ? "Valores recebidos no período"
            : start === end ? `Recebido em ${start}` : `Recebido de ${start} a ${end}`;
    }

    async function loadRevenue(period = revenuePeriod) {
        revenuePeriod = period;
        selectTab(period);
        const requestId = ++revenueRequest;
        try {
            const data = await api.getRevenue(period);
            if (requestId !== revenueRequest) return;
            renderRevenue(data || {});
        } catch (error) {
            if (requestId !== revenueRequest) return;
            revenue.received.textContent = "—";
            revenue.previous.textContent = "—";
            setChange(revenue.change, null, "");
            revenue.range.textContent = error.message || "Não foi possível carregar o faturamento.";
        }
    }

    // ------------------------------------------------------------------
    // Registrar pagamento
    // ------------------------------------------------------------------
    function fillMethodOptions() {
        payMethod.innerHTML = api.METHOD_LIST
            .map(method => `<option value="${escapeHtml(method)}">${escapeHtml(api.methodLabel(method))}</option>`)
            .join("");
    }

    /** @param {PaymentListItem} payment */
    function openPayModal(payment) {
        pendingPayment = payment;
        payDetails.client.textContent = payment.clientName || "—";
        payDetails.services.textContent = payment.services || "—";
        payDetails.date.textContent = fmt.dateTime(payment.appointmentDate);
        payDetails.amount.textContent = fmt.currency(payment.amount);
        payMethod.value = api.METHOD_LIST.includes(String(payment.method || "").toUpperCase())
            ? String(payment.method).toUpperCase()
            : api.METHOD.PIX;
        confirmPayment.disabled = false;
        payModal.hidden = false;
        payMethod.focus();
    }

    function closePayModal() {
        if (paying) return;
        payModal.hidden = true;
        pendingPayment = null;
    }

    function setPaying(value) {
        paying = value;
        confirmPayment.disabled = value;
        confirmPayment.textContent = value ? "REGISTRANDO..." : "CONFIRMAR PAGAMENTO";
        list.querySelectorAll('button[data-action="pay"]').forEach(button => { button.disabled = value; });
    }

    payForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!pendingPayment || paying) return;
        const payment = pendingPayment;
        setPaying(true);
        try {
            await api.payPayment(payment.id, payMethod.value);
            setPaying(false);
            closePayModal();
            showMessage(`Pagamento de ${fmt.currency(payment.amount)} registrado (${api.methodLabel(payMethod.value)}).`, "success");
            await Promise.all([loadPayments(), loadSummary(), loadRevenue()]);
        } catch (error) {
            setPaying(false);
            showMessage(error.message || "Não foi possível registrar o pagamento.", "error");
        }
    });

    document.querySelectorAll("[data-close-payment-modal]").forEach(button => button.addEventListener("click", closePayModal));
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !payModal.hidden) closePayModal();
    });

    list.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        if (button.dataset.action === "retry") { loadPayments(); return; }
        if (button.dataset.action !== "pay" || paying) return;
        const payment = payments.find(item => String(item.id) === button.dataset.id);
        if (payment && api.isPending(payment)) openPayModal(payment);
    });

    // ------------------------------------------------------------------
    // Exportar CSV (linhas que estão na tela)
    // ------------------------------------------------------------------
    function csvCell(value) {
        let text = String(value ?? "");
        // Evita que o Excel interprete o conteúdo como fórmula.
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }

    function exportCsv() {
        if (!payments.length) {
            showMessage("Não há pagamentos na tela para exportar.", "info");
            return;
        }
        const header = ["ID", "Agendamento", "Cliente", "Data do atendimento", "Serviço(s)", "Valor (R$)", "Forma", "Status", "Pago em", "Criado em"];
        const rows = payments.map(payment => [
            payment.id,
            payment.idAppointment,
            payment.clientName || "",
            fmt.dateTime(payment.appointmentDate),
            payment.services || "",
            fmt.decimal(payment.amount),
            api.methodLabel(payment.method),
            api.statusLabel(payment.status),
            payment.paidAt ? fmt.dateTime(payment.paidAt) : "",
            payment.created ? fmt.dateTime(payment.created) : ""
        ]);
        const csv = [header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `pagamentos-${monthInput.value || fmt.currentMonth()}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showMessage(`Relatório exportado com ${payments.length} pagamento${payments.length === 1 ? "" : "s"}.`, "success");
    }

    // ------------------------------------------------------------------
    // Eventos e carga inicial
    // ------------------------------------------------------------------
    statusFilter.addEventListener("change", () => loadPayments());
    monthInput.addEventListener("change", () => {
        if (!monthInput.value) monthInput.value = fmt.currentMonth();
        loadSummary();
    });
    revenueTabs.forEach(tab => tab.addEventListener("click", () => loadRevenue(tab.dataset.period)));
    exportButton.addEventListener("click", exportCsv);

    fillMethodOptions();
    monthInput.value = fmt.currentMonth();
    monthInput.max = fmt.currentMonth();
    loadPayments();
    loadSummary();
    loadRevenue();
});

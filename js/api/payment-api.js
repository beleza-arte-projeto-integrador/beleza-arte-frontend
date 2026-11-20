(function () {
    const STATUS = Object.freeze({
        PENDENTE: "PENDENTE",
        PAGO: "PAGO",
        CANCELADO: "CANCELADO",
        ESTORNADO: "ESTORNADO"
    });

    /** @type {PaymentStatus[]} */
    const STATUS_LIST = [STATUS.PENDENTE, STATUS.PAGO, STATUS.CANCELADO, STATUS.ESTORNADO];

    const STATUS_LABELS = Object.freeze({
        PENDENTE: "Pendente",
        PAGO: "Pago",
        CANCELADO: "Cancelado",
        ESTORNADO: "Estornado"
    });

    // Classes de tag já existentes em css/painel-admin.css.
    const STATUS_TAGS = Object.freeze({
        PENDENTE: "waiting",
        PAGO: "paid",
        CANCELADO: "cancelled",
        ESTORNADO: "cancelled"
    });

    const METHOD = Object.freeze({
        PIX: "PIX",
        CARTAO_CREDITO: "CARTAO_CREDITO",
        CARTAO_DEBITO: "CARTAO_DEBITO",
        DINHEIRO: "DINHEIRO"
    });

    /** @type {PaymentMethod[]} */
    const METHOD_LIST = [METHOD.PIX, METHOD.CARTAO_CREDITO, METHOD.CARTAO_DEBITO, METHOD.DINHEIRO];

    const METHOD_LABELS = Object.freeze({
        PIX: "Pix",
        CARTAO_CREDITO: "Cartão de crédito",
        CARTAO_DEBITO: "Cartão de débito",
        DINHEIRO: "Dinheiro"
    });

    /** @type {RevenuePeriod[]} */
    const PERIOD_LIST = ["DAY", "LAST_7_DAYS", "MONTH", "YEAR"];

    const PERIOD_LABELS = Object.freeze({
        DAY: "Hoje",
        LAST_7_DAYS: "7 dias",
        MONTH: "Mês",
        YEAR: "Ano"
    });

    // Nas buscas por agendamento/status, "nada encontrado" vem como 422 com esta mensagem.
    const NOT_FOUND_PREFIX = "Could not find payment";

    /** @param {string} path @param {RequestInit} [options] */
    async function request(path, options = {}) {
        let response;
        try {
            response = await fetch(`/api${path}`, {
                ...options,
                headers: options.body
                    ? { "Content-Type": "application/json", ...options.headers }
                    : options.headers
            });
        } catch {
            throw new Error("Não foi possível conectar ao servidor. Verifique se a API está disponível.");
        }

        const responseText = await response.text();
        let data = null;
        if (responseText) {
            try {
                data = JSON.parse(responseText);
            } catch {
                data = responseText;
            }
        }

        if (!response.ok) {
            const detail = typeof data === "string"
                ? data
                : data?.message || data?.error || data?.detail;
            let message;
            if (response.status === 422) {
                // Regra de negócio: mostra a mensagem do backend como veio.
                message = detail || "Não foi possível concluir a operação. Confira os dados informados.";
            } else if (response.status === 404) {
                message = "Pagamento não encontrado.";
            } else if (response.status === 502) {
                message = "Não foi possível conectar ao servidor. Verifique se a API está disponível.";
            } else if (response.status >= 500) {
                message = "O servidor encontrou um erro. Tente novamente mais tarde.";
            } else {
                message = detail || `Não foi possível concluir a operação (HTTP ${response.status}).`;
            }
            const error = new Error(message);
            error.status = response.status;
            error.backendMessage = typeof detail === "string" ? detail : "";
            throw error;
        }
        return data;
    }

    /** @param {unknown} data @returns {any[]} */
    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.content)) return data.content;
        if (Array.isArray(data?.data)) return data.data;
        if (data && typeof data === "object" && "id" in data) return [data];
        return [];
    }

    /** @param {any} error */
    function isNotFound(error) {
        if (error?.status === 404) return true;
        return error?.status === 422 && String(error.backendMessage || error.message || "").startsWith(NOT_FOUND_PREFIX);
    }

    /** @param {string} path */
    function search(path) {
        return request(path)
            .then(normalizeList)
            .catch(error => {
                if (isNotFound(error)) return [];
                throw error;
            });
    }

    function validId(value) {
        return Number.isInteger(Number(value)) && Number(value) > 0;
    }

    function normalizeStatus(status) {
        return String(status || "").trim().toUpperCase();
    }

    /**
     * Lista os pagamentos (com cliente e serviços). Sem status lista todos.
     * @param {PaymentStatus|""} [status]
     * @returns {Promise<PaymentListItem[]>}
     */
    function listPayments(status) {
        const value = normalizeStatus(status);
        if (value && !STATUS_LIST.includes(value)) {
            return Promise.reject(new Error("Status de pagamento inválido."));
        }
        const query = value ? `?status=${encodeURIComponent(value)}` : "";
        return request(`/listPayments${query}`).then(normalizeList);
    }

    /**
     * Métricas do mês. Sem month o backend usa o mês atual.
     * @param {string} [month] YYYY-MM
     * @returns {Promise<PaymentSummary>}
     */
    function getSummary(month) {
        if (month && !/^\d{4}-\d{2}$/.test(month)) {
            return Promise.reject(new Error("Informe o mês no formato AAAA-MM."));
        }
        const query = month ? `?month=${encodeURIComponent(month)}` : "";
        return request(`/searchSummaryPayments${query}`);
    }

    /**
     * Faturamento recebido em um período. Sem date o backend usa hoje.
     * @param {RevenuePeriod} period
     * @param {string} [date] YYYY-MM-DD
     * @returns {Promise<PaymentRevenue>}
     */
    function getRevenue(period, date) {
        const value = String(period || "").toUpperCase();
        if (!PERIOD_LIST.includes(value)) {
            return Promise.reject(new Error("Período de faturamento inválido."));
        }
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return Promise.reject(new Error("Informe a data no formato AAAA-MM-DD."));
        }
        const params = new URLSearchParams({ period: value });
        if (date) params.set("date", date);
        return request(`/searchRevenuePayments?${params.toString()}`);
    }

    /**
     * Registra o pagamento de um PENDENTE. Outros status → 422 com a mensagem do backend.
     * @param {number} id
     * @param {PaymentMethod} method
     * @returns {Promise<Payment>}
     */
    function payPayment(id, method) {
        if (!validId(id)) {
            return Promise.reject(new Error("O identificador do pagamento é obrigatório."));
        }
        const value = String(method || "").toUpperCase();
        if (!METHOD_LIST.includes(value)) {
            return Promise.reject(new Error("Selecione uma forma de pagamento válida."));
        }
        /** @type {PaymentPayPayload} */
        const payload = { id: Number(id), method: /** @type {PaymentMethod} */ (value) };
        return request("/payPayments", {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    /** @param {number|string} idAppointment @returns {Promise<Payment[]>} */
    function searchPaymentsByAppointment(idAppointment) {
        if (!validId(idAppointment)) {
            return Promise.reject(new Error("O identificador do agendamento é obrigatório."));
        }
        return search(`/searchAppointmentPayments?idAppointment=${encodeURIComponent(idAppointment)}`);
    }

    /** @param {PaymentStatus} status @returns {Promise<Payment[]>} */
    function searchPaymentsByStatus(status) {
        const value = normalizeStatus(status);
        if (!STATUS_LIST.includes(value)) {
            return Promise.reject(new Error("Status de pagamento inválido."));
        }
        return search(`/searchStatusPayments?status=${encodeURIComponent(value)}`);
    }

    function statusLabel(status) {
        return STATUS_LABELS[normalizeStatus(status)] || String(status || "—");
    }

    function statusTag(status) {
        return STATUS_TAGS[normalizeStatus(status)] || "waiting";
    }

    function methodLabel(method) {
        return METHOD_LABELS[String(method || "").toUpperCase()] || String(method || "—");
    }

    function isPending(payment) {
        return normalizeStatus(payment?.status) === STATUS.PENDENTE;
    }

    // ------------------------------------------------------------------
    // Formatação: moeda em BRL e datas no horário de Brasília (UTC-03:00,
    // sem horário de verão), mesma lógica de appointmentApi.time.
    // ------------------------------------------------------------------
    const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const decimalFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const percentFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
    const BRASILIA_OFFSET_MINUTES = -180;
    const pad = value => String(value).padStart(2, "0");

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function formatCurrency(value) {
        const number = toNumber(value);
        return number === null ? "—" : currencyFormatter.format(number);
    }

    /** Valor sem "R$", com vírgula decimal (para o CSV abrir como número no Excel). */
    function formatDecimal(value) {
        const number = toNumber(value);
        return number === null ? "" : decimalFormatter.format(number);
    }

    /** 16.53 -> "16,5%". null/undefined -> "—". */
    function formatPercent(value) {
        if (value === null || value === undefined || value === "") return "—";
        const number = toNumber(value);
        return number === null ? "—" : `${percentFormatter.format(number)}%`;
    }

    /** @param {string} iso */
    function brasiliaParts(iso) {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        const shifted = new Date(date.getTime() + BRASILIA_OFFSET_MINUTES * 60000);
        return {
            date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
            time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
        };
    }

    /** "2026-11-20" (data pura) ou ISO com fuso -> "20/11/2026" */
    function formatDate(value) {
        const plain = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (plain) return `${plain[3]}/${plain[2]}/${plain[1]}`;
        const parts = brasiliaParts(value);
        if (!parts) return "—";
        const [year, month, day] = parts.date.split("-");
        return `${day}/${month}/${year}`;
    }

    /** ISO com fuso -> "20/11/2026 14:00" (Brasília) */
    function formatDateTime(iso) {
        const parts = brasiliaParts(iso);
        return parts ? `${formatDate(iso)} ${parts.time}` : "—";
    }

    /** Mês atual em Brasília, "YYYY-MM". */
    function currentMonth() {
        return brasiliaParts(new Date().toISOString()).date.slice(0, 7);
    }

    /** "2026-11" -> "11/2026" */
    function formatMonth(month) {
        const match = String(month || "").match(/^(\d{4})-(\d{2})/);
        return match ? `${match[2]}/${match[1]}` : String(month || "—");
    }

    window.paymentApi = {
        STATUS,
        STATUS_LIST,
        STATUS_LABELS,
        METHOD,
        METHOD_LIST,
        METHOD_LABELS,
        PERIOD_LIST,
        PERIOD_LABELS,
        listPayments,
        getSummary,
        getRevenue,
        payPayment,
        searchPaymentsByAppointment,
        searchPaymentsByStatus,
        isNotFound,
        isPending,
        statusLabel,
        statusTag,
        methodLabel,
        format: {
            currency: formatCurrency,
            decimal: formatDecimal,
            percent: formatPercent,
            date: formatDate,
            dateTime: formatDateTime,
            month: formatMonth,
            currentMonth
        }
    };
})();

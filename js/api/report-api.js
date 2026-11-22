(function () {
    // Período máximo aceito pelo backend (contando o dia inicial e o final).
    const MAX_PERIOD_DAYS = 366;
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
    const NETWORK_ERROR = "Não foi possível conectar ao servidor. Verifique se a API está disponível.";

    /** @param {string} path */
    async function request(path) {
        let response;
        try {
            response = await fetch(`/api${path}`);
        } catch {
            throw new Error(NETWORK_ERROR);
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
            const detail = typeof data === "string" ? "" : data?.message || "";
            let message;
            if (response.status === 422) {
                // Validação do backend: mostra o "message" como veio.
                message = detail || "Não foi possível gerar o relatório. Confira os filtros informados.";
            } else if (response.status === 502 || response.status === 503 || response.status === 504) {
                message = NETWORK_ERROR;
            } else if (response.status >= 500) {
                message = "O servidor encontrou um erro. Tente novamente mais tarde.";
            } else {
                message = detail || `Não foi possível gerar o relatório (HTTP ${response.status}).`;
            }
            const error = new Error(message);
            error.status = response.status;
            error.code = typeof data === "object" && data ? data.code : undefined;
            throw error;
        }
        return data;
    }

    // ------------------------------------------------------------------
    // Datas como texto YYYY-MM-DD. Nada de toISOString(): ele converte para
    // UTC e pode voltar um dia. "Hoje" é calculado no horário de Brasília.
    // ------------------------------------------------------------------
    const pad = value => String(value).padStart(2, "0");

    /** Data de hoje em Brasília, "YYYY-MM-DD". */
    function today() {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
        }).formatToParts(new Date());
        const get = type => parts.find(part => part.type === type).value;
        return `${get("year")}-${get("month")}-${get("day")}`;
    }

    /** Primeiro e último dia do mês atual (Brasília). */
    function currentMonthRange() {
        const [year, month] = today().split("-").map(Number);
        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        return {
            startDate: `${year}-${pad(month)}-01`,
            endDate: `${year}-${pad(month)}-${pad(lastDay)}`
        };
    }

    /** "YYYY-MM-DD" -> nº de dias desde 1970 (UTC puro, sem fuso). null se inválida. */
    function dayNumber(value) {
        if (!DATE_PATTERN.test(String(value || ""))) return null;
        const [year, month, day] = value.split("-").map(Number);
        const time = Date.UTC(year, month - 1, day);
        const check = new Date(time);
        if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
            return null;
        }
        return time / 86400000;
    }

    /**
     * Valida os filtros. Retorna a mensagem de erro ou "" se estiver tudo certo.
     * @param {ManagementReportFilters} filters
     */
    function validateFilters(filters) {
        const start = dayNumber(filters?.startDate);
        const end = dayNumber(filters?.endDate);
        if (start === null) return "Informe uma data inicial válida.";
        if (end === null) return "Informe uma data final válida.";
        if (end < start) return "A data final não pode ser anterior à data inicial.";
        if (end - start + 1 > MAX_PERIOD_DAYS) return `O período pode ter no máximo ${MAX_PERIOD_DAYS} dias.`;
        const id = filters.idProfessional;
        if (id !== null && id !== undefined && id !== "" && !(Number.isInteger(Number(id)) && Number(id) > 0)) {
            return "Profissional inválido.";
        }
        return "";
    }

    /**
     * Busca o relatório gerencial do período (salão inteiro ou de uma profissional).
     * @param {ManagementReportFilters} filters
     * @returns {Promise<ManagementReport>}
     */
    function getManagementReport(filters) {
        const validation = validateFilters(filters);
        if (validation) return Promise.reject(new Error(validation));

        const params = new URLSearchParams({ startDate: filters.startDate, endDate: filters.endDate });
        const id = filters.idProfessional;
        if (id !== null && id !== undefined && id !== "") params.set("idProfessional", String(Number(id)));
        return request(`/searchManagementReport?${params.toString()}`);
    }

    // ------------------------------------------------------------------
    // Formatação
    // ------------------------------------------------------------------
    const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const percentFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const integerFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
    const hoursFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

    function toNumber(value) {
        if (value === null || value === undefined || value === "") return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function formatCurrency(value) {
        const number = toNumber(value);
        return number === null ? "—" : currencyFormatter.format(number);
    }

    /** 12.5 -> "12,5%" (o valor já vem em percentual). */
    function formatPercent(value) {
        const number = toNumber(value);
        return number === null ? "—" : `${percentFormatter.format(number)}%`;
    }

    function formatInteger(value) {
        const number = toNumber(value);
        return number === null ? "—" : integerFormatter.format(number);
    }

    /** 9600 -> "160 h"; 90 -> "1,5 h" */
    function formatHours(minutes) {
        const number = toNumber(minutes);
        return number === null ? "—" : `${hoursFormatter.format(number / 60)} h`;
    }

    /** "2026-11-01" -> "01/11/2026" */
    function formatDate(value) {
        const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
    }

    window.reportApi = {
        MAX_PERIOD_DAYS,
        WEEKDAY_LABELS: Object.freeze(["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]),
        getManagementReport,
        validateFilters,
        today,
        currentMonthRange,
        format: {
            currency: formatCurrency,
            percent: formatPercent,
            integer: formatInteger,
            hours: formatHours,
            date: formatDate
        }
    };
})();

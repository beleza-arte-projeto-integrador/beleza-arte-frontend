document.addEventListener("DOMContentLoaded", () => {
    const api = window.reportApi;
    const fmt = api.format;

    const form = document.getElementById("report-filters");
    const startInput = document.getElementById("report-start");
    const endInput = document.getElementById("report-end");
    const professionalSelect = document.getElementById("report-professional");
    const professionalNote = document.getElementById("report-professional-note");
    const submitButton = document.getElementById("report-submit");
    const loading = document.getElementById("report-loading");
    const errorBox = document.getElementById("report-error");
    const emptyBox = document.getElementById("report-empty");
    const content = document.getElementById("report-content");
    const periodLabel = document.getElementById("report-period");
    const todayLabel = document.getElementById("today-label");

    // Evita que uma resposta antiga sobrescreva a mais recente.
    let lastRequest = 0;

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
        })[char]);
    }

    function setText(id, value) {
        document.getElementById(id).textContent = value;
    }

    function showError(message) {
        errorBox.textContent = message;
        errorBox.hidden = !message;
    }

    function setLoading(isLoading) {
        loading.hidden = !isLoading;
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "GERANDO..." : "GERAR RELATÓRIO";
        content.setAttribute("aria-busy", String(isLoading));
    }

    function renderToday() {
        const label = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long"
        }).format(new Date());
        todayLabel.textContent = label.toUpperCase();
    }

    // O backend não tem listagem de profissionais: professionalApi.list() faz dezenas
    // de buscas (serviços por duração/categoria e profissionais por especialidade).
    // Por isso a lista é carregada depois do relatório e sem o overlay global.
    async function loadProfessionals() {
        if (!window.professionalApi) return;
        professionalSelect.disabled = true;
        professionalNote.textContent = "Carregando lista de profissionais...";
        professionalNote.hidden = false;
        try {
            const list = () => window.professionalApi.list();
            const professionals = await (window.Loading?.quietly ? window.Loading.quietly(list) : list());
            professionalNote.hidden = true;
            professionals
                .filter(item => item && item.id !== undefined && item.id !== null)
                .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"))
                .forEach(item => {
                    const option = document.createElement("option");
                    option.value = String(item.id);
                    option.textContent = item.name || `Profissional #${item.id}`;
                    professionalSelect.appendChild(option);
                });
        } catch {
            professionalNote.textContent = "Não foi possível carregar as profissionais. O relatório será do salão inteiro.";
            professionalNote.hidden = false;
        } finally {
            professionalSelect.disabled = false;
        }
    }

    // ------------------------------------------------------------------
    // Indicadores
    // ------------------------------------------------------------------
    function renderMetrics(report) {
        setText("metric-total", fmt.integer(report.totalAppointments));
        setText("metric-total-note", `${fmt.integer(report.totalServices)} serviço(s) válido(s)`);
        setText("metric-completed", fmt.integer(report.completedAppointments));
        setText("metric-cancelled", fmt.integer(report.cancelledAppointments));
        setText("metric-cancelled-rate", `${fmt.percent(report.cancellationRate)} dos agendamentos`);
        setText("metric-noshow", fmt.integer(report.noShowAppointments));
        setText("metric-noshow-rate", `${fmt.percent(report.noShowRate)} dos agendamentos`);
        setText("metric-expected", fmt.currency(report.expectedRevenue));
        setText("metric-completed-revenue", fmt.currency(report.completedRevenue));
        setText("metric-ticket", fmt.currency(report.averageTicket));
        setText("metric-clients", fmt.integer(report.uniqueClients));

        const occupancy = document.getElementById("metric-occupancy");
        const occupancyNote = document.getElementById("metric-occupancy-note");
        if (report.occupancyRate === null || report.occupancyRate === undefined) {
            occupancy.textContent = "—";
            occupancyNote.textContent = "Sem expediente cadastrado";
            occupancyNote.className = "warning";
        } else {
            occupancy.textContent = fmt.percent(report.occupancyRate);
            occupancyNote.textContent = `${fmt.hours(report.bookedMinutes)} de ${fmt.hours(report.availableMinutes)} disponíveis`;
            occupancyNote.className = "neutral";
        }
    }

    // ------------------------------------------------------------------
    // Tabelas
    // ------------------------------------------------------------------
    function renderServices(services) {
        const list = document.getElementById("report-services");
        if (!services.length) {
            list.innerHTML = '<p class="report-table-empty">Nenhum serviço no período.</p>';
            return;
        }
        list.innerHTML = services.map((service, index) => `
            <div class="table-row">
                <span><b class="report-rank">${index + 1}º</b>${escapeHtml(service.name)}</span>
                <span>${fmt.integer(service.quantity)}</span>
                <span>${fmt.currency(service.revenue)}</span>
            </div>`).join("");
    }

    function renderProfessionals(professionals) {
        const list = document.getElementById("report-professionals");
        if (!professionals.length) {
            list.innerHTML = '<p class="report-table-empty">Nenhuma profissional com atendimento no período.</p>';
            return;
        }
        list.innerHTML = professionals.map(item => `
            <div class="table-row">
                <span>${escapeHtml(item.name)}</span>
                <span>${fmt.integer(item.services)}</span>
                <span>${fmt.currency(item.revenue)}</span>
                <span>${fmt.integer(item.cancelledServices)}</span>
                <span>${fmt.integer(item.noShowServices)}</span>
            </div>`).join("");
    }

    // ------------------------------------------------------------------
    // Gráficos de barras (HTML + CSS, sem biblioteca)
    // ------------------------------------------------------------------
    /** @param {HTMLElement} container @param {{label: string, value: number}[]} items */
    function renderBars(container, items, emptyMessage) {
        const max = Math.max(0, ...items.map(item => item.value));
        if (!items.length || max === 0) {
            container.innerHTML = `<p class="report-table-empty">${escapeHtml(emptyMessage)}</p>`;
            return;
        }
        const peakIndex = items.findIndex(item => item.value === max);
        container.innerHTML = `<div class="bar-chart" role="list">${items.map((item, index) => {
            const height = item.value > 0 ? Math.max(2, (item.value / max) * 100) : 0;
            const text = `${item.label}: ${fmt.integer(item.value)} serviço(s)`;
            return `
                <div class="bar-col" role="listitem" tabindex="0" aria-label="${escapeHtml(text)}" data-tooltip="${escapeHtml(text)}">
                    <div class="bar-track">
                        ${index === peakIndex ? `<span class="bar-value">${fmt.integer(item.value)}</span>` : ""}
                        <i class="bar" style="height:${height}%"></i>
                    </div>
                    <span class="bar-label">${escapeHtml(item.label)}</span>
                </div>`;
        }).join("")}</div>`;
    }

    function renderCharts(report) {
        const weekday = Array.isArray(report.servicesByWeekday) ? report.servicesByWeekday : [];
        renderBars(
            document.getElementById("chart-weekday"),
            api.WEEKDAY_LABELS.map((label, index) => ({ label, value: Number(weekday[index]) || 0 })),
            "Nenhum serviço no período."
        );

        const byHour = report.servicesByHour && typeof report.servicesByHour === "object" ? report.servicesByHour : {};
        renderBars(
            document.getElementById("chart-hour"),
            Object.entries(byHour).map(([label, value]) => ({ label, value: Number(value) || 0 })),
            "Nenhum serviço no período."
        );
    }

    // ------------------------------------------------------------------
    // Fluxo
    // ------------------------------------------------------------------
    function render(report, professionalName) {
        const scope = professionalName ? ` · ${professionalName}` : " · Salão inteiro";
        periodLabel.textContent = `${fmt.date(report.startDate)} a ${fmt.date(report.endDate)}${scope}`;

        if (!Number(report.totalAppointments)) {
            content.hidden = true;
            emptyBox.hidden = false;
            return;
        }
        emptyBox.hidden = true;
        renderMetrics(report);
        renderServices(Array.isArray(report.services) ? report.services : []);
        renderProfessionals(Array.isArray(report.professionals) ? report.professionals : []);
        renderCharts(report);
        content.hidden = false;
    }

    async function generate() {
        const filters = {
            startDate: startInput.value,
            endDate: endInput.value,
            idProfessional: professionalSelect.value ? Number(professionalSelect.value) : null
        };

        const validation = api.validateFilters(filters);
        if (validation) {
            showError(validation);
            return;
        }

        const requestId = ++lastRequest;
        const professionalName = filters.idProfessional
            ? professionalSelect.options[professionalSelect.selectedIndex].textContent
            : "";
        showError("");
        setLoading(true);
        try {
            const report = await api.getManagementReport(filters);
            if (requestId !== lastRequest) return;
            render(report, professionalName);
        } catch (error) {
            if (requestId !== lastRequest) return;
            content.hidden = true;
            emptyBox.hidden = true;
            showError(error.message || "Não foi possível gerar o relatório.");
        } finally {
            if (requestId === lastRequest) setLoading(false);
        }
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        generate();
    });

    const range = api.currentMonthRange();
    startInput.value = range.startDate;
    endInput.value = range.endDate;
    renderToday();
    // generate() não rejeita (mostra o erro na tela), então a lista carrega mesmo se o relatório falhar.
    generate().then(loadProfessionals);
});

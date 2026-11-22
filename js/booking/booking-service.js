/*
 * Regras do agendamento feito pelo CLIENTE (agendamento.html).
 *
 * A tela (js/agendamento.js) só fala com este módulo; aqui ficam as chamadas
 * às APIs, o cálculo de horários livres e a gravação. Se um dia o backend tiver
 * uma rota pública de agendamento, basta trocar a implementação deste arquivo.
 *
 * Requer, carregados antes: js/api/appointment-api.js, appointments-items-api.js,
 * client-api.js, service-api.js, professional-api.js e resource-api.js.
 *
 * LIMITAÇÕES CONHECIDAS (decisão consciente, sem alterar o backend):
 * 1. Concorrência: os horários livres são verificados no navegador (e de novo
 *    logo antes de gravar). Dois clientes confirmando o mesmo horário no mesmo
 *    instante ainda podem conseguir; só o backend consegue impedir isso.
 * 2. Gravação em várias chamadas: cria o agendamento e depois um item por
 *    serviço. Se um item falhar, o agendamento é excluído (os itens vão junto,
 *    ON DELETE CASCADE). Se essa exclusão também falhar, sobra um agendamento
 *    incompleto, que o admin consegue ver e excluir.
 * 3. Recurso (sala/cadeira): o cliente não escolhe. É usado o primeiro recurso
 *    ativo livre no intervalo; não há vínculo entre tipo de recurso e serviço.
 * 4. Sem autenticação: o cliente é identificado pelo telefone e o id fica no
 *    localStorage deste navegador. Em outro aparelho, "Meus agendamentos" só
 *    aparece depois de um novo agendamento com o mesmo telefone.
 */
(function () {
    const api = () => window.appointmentApi;
    const STORAGE_CLIENT_KEY = "belezaArteClienteAtual";

    // Mesmo horário exibido no rodapé do site. Índice = dia da semana (0 = domingo).
    const BUSINESS_HOURS = [null, ["09:00", "20:00"], ["09:00", "20:00"], ["09:00", "20:00"], ["09:00", "20:00"], ["09:00", "20:00"], ["09:00", "18:00"]];
    const SLOT_STEP_MINUTES = 30;
    const DEFAULT_DURATION_MINUTES = 60;

    // ------------------------------------------------------------------
    // Catálogo (serviços, profissionais e recursos)
    // ------------------------------------------------------------------
    let servicesPromise = null;
    let resourcesPromise = null;
    let allProfessionalsPromise = null;
    const professionalsByService = new Map();

    /** Serviços cadastrados, ordenados por categoria e nome. */
    function loadServices() {
        if (!servicesPromise) {
            servicesPromise = window.serviceApi.list()
                .then(services => services
                    .filter(service => service && service.id && service.name)
                    .sort((a, b) => String(a.category || "").localeCompare(String(b.category || ""), "pt-BR")
                        || String(a.name).localeCompare(String(b.name), "pt-BR")))
                .catch(error => {
                    servicesPromise = null;
                    throw error;
                });
        }
        return servicesPromise;
    }

    function durationOf(service) {
        const minutes = Number(service?.duration_minutes);
        return minutes > 0 ? minutes : DEFAULT_DURATION_MINUTES;
    }

    /** Profissionais ativos que fazem o serviço (especialidade = nome do serviço). */
    function professionalsFor(service) {
        const key = String(service?.name || "");
        if (!professionalsByService.has(key)) {
            const promise = window.professionalApi.search("specialty", key)
                .then(list => list
                    .filter(professional => professional.active !== false)
                    .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR")))
                .catch(error => {
                    professionalsByService.delete(key);
                    throw error;
                });
            professionalsByService.set(key, promise);
        }
        return professionalsByService.get(key);
    }

    function loadActiveResources() {
        if (!resourcesPromise) {
            resourcesPromise = window.resourceApi.search("active", "true")
                .then(list => list.filter(resource => resource.active !== false))
                .catch(error => {
                    resourcesPromise = null;
                    throw error;
                });
        }
        return resourcesPromise;
    }

    /** Só para mostrar nomes em "Meus agendamentos". */
    function loadAllProfessionals() {
        if (!allProfessionalsPromise) {
            allProfessionalsPromise = window.professionalApi.list().catch(() => {
                allProfessionalsPromise = null;
                return [];
            });
        }
        return allProfessionalsPromise;
    }

    // ------------------------------------------------------------------
    // Datas (sempre no horário de Brasília)
    // ------------------------------------------------------------------
    function todayBrasilia() {
        return api().time.brasiliaParts(new Date().toISOString()).date;
    }

    function toMinutes(time) {
        const [hours, minutes] = String(time).split(":").map(Number);
        return hours * 60 + minutes;
    }

    function fromMinutes(total) {
        return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }

    function weekday(date) {
        const [year, month, day] = String(date).split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    }

    function businessHours(date) {
        return BUSINESS_HOURS[weekday(date)] || null;
    }

    /** Intervalo ISO (-03:00) de um item escolhido na tela. */
    function intervalOf(choice) {
        const { toBrasiliaIso, addMinutesLocal } = api().time;
        const startLocal = `${choice.date}T${choice.time}`;
        return {
            start: toBrasiliaIso(startLocal),
            end: toBrasiliaIso(addMinutesLocal(startLocal, durationOf(choice.service)))
        };
    }

    // ------------------------------------------------------------------
    // Disponibilidade
    // ------------------------------------------------------------------

    /** Itens já gravados no dia, de agendamentos que ainda ocupam a agenda. */
    async function busyItemsOn(date) {
        const appointments = await api().searchAppointmentsByDate(date);
        return appointments
            .filter(appointment => String(appointment.status || "").toUpperCase() !== api().STATUS.CANCELADO)
            .flatMap(appointment => appointment.items || []);
    }

    function overlapsItem(interval, item) {
        return api().time.overlaps(interval.start, interval.end, item.start_at, item.end_at);
    }

    /** Recursos ativos sem item gravado no intervalo. */
    function freeResources(interval, resources, busyItems) {
        return resources.filter(resource => !busyItems.some(item =>
            Number(item.resource_id) === Number(resource.id) && overlapsItem(interval, item)));
    }

    /**
     * Motivo pelo qual o horário não pode ser usado, ou "" se estiver livre.
     * `others` são os outros serviços já escolhidos nesta mesma reserva.
     */
    function unavailableReason(choice, interval, { busyItems, resources, others }) {
        const hours = businessHours(choice.date);
        if (!hours) return "O salão não abre neste dia.";
        const startMin = toMinutes(choice.time);
        if (startMin < toMinutes(hours[0]) || startMin + durationOf(choice.service) > toMinutes(hours[1])) {
            return "Fora do horário de atendimento.";
        }
        if (new Date(interval.start).getTime() <= Date.now()) return "Este horário já passou.";

        const professionalId = Number(choice.professional?.id);
        const professionalBusy = busyItems.some(item => Number(item.professional_id) === professionalId && overlapsItem(interval, item));
        const othersOverlapping = others.map(other => ({ other, interval: intervalOf(other) }))
            .filter(entry => api().time.overlaps(interval.start, interval.end, entry.interval.start, entry.interval.end));
        if (professionalBusy || othersOverlapping.some(entry => Number(entry.other.professional?.id) === professionalId)) {
            return "A profissional já está ocupada neste horário.";
        }
        if (freeResources(interval, resources, busyItems).length <= othersOverlapping.length) {
            return "Não há espaço livre no salão neste horário.";
        }
        return "";
    }

    /**
     * Horários do dia para um serviço/profissional.
     * @param {{service: object, professional: object, date: string}} choice
     * @param {Array} others outros serviços já escolhidos nesta reserva
     * @returns {Promise<{closed: boolean, slots: {time: string, available: boolean, reason: string}[]}>}
     */
    async function availableSlots(choice, others = []) {
        const hours = businessHours(choice.date);
        if (!hours) return { closed: true, slots: [] };

        const [busyItems, resources] = await Promise.all([busyItemsOn(choice.date), loadActiveResources()]);
        const context = { busyItems, resources, others: others.filter(other => other.date === choice.date) };
        const last = toMinutes(hours[1]) - durationOf(choice.service);
        const slots = [];
        for (let minute = toMinutes(hours[0]); minute <= last; minute += SLOT_STEP_MINUTES) {
            const candidate = { ...choice, time: fromMinutes(minute) };
            const reason = unavailableReason(candidate, intervalOf(candidate), context);
            slots.push({ time: candidate.time, available: !reason, reason });
        }
        return { closed: false, slots };
    }

    /**
     * Confere a reserva inteira com dados atualizados da API e escolhe um
     * recurso livre para cada serviço.
     * @returns {Promise<Array<{choice: object, interval: object, resourceId: number}>>}
     */
    async function planBooking(choices) {
        const resources = await loadActiveResources();
        if (!resources.length) throw new Error("O salão ainda não tem espaços (recursos) cadastrados. Agende pelo WhatsApp.");

        const dates = [...new Set(choices.map(choice => choice.date))];
        const busyByDate = new Map(await Promise.all(dates.map(async date => [date, await busyItemsOn(date)])));

        const plan = [];
        for (const choice of choices) {
            const interval = intervalOf(choice);
            const busyItems = busyByDate.get(choice.date);
            // Os itens já planejados entram como ocupados para não repetir recurso.
            const planned = plan.filter(entry => entry.choice.date === choice.date).map(entry => ({
                professional_id: entry.choice.professional.id,
                resource_id: entry.resourceId,
                start_at: entry.interval.start,
                end_at: entry.interval.end
            }));
            const reason = unavailableReason(choice, interval, { busyItems: [...busyItems, ...planned], resources, others: [] });
            if (reason) {
                const error = new Error(`${choice.service.name} em ${api().time.formatDate(interval.start)} às ${choice.time}: ${reason} Escolha outro horário.`);
                error.choice = choice;
                throw error;
            }
            const resource = freeResources(interval, resources, [...busyItems, ...planned])[0];
            plan.push({ choice, interval, resourceId: Number(resource.id) });
        }
        return plan;
    }

    /** Só valida (usado ao sair da etapa de data e horário). */
    async function checkAvailability(choices) {
        await planBooking(choices);
    }

    // ------------------------------------------------------------------
    // Cliente
    // ------------------------------------------------------------------
    function normalizePhone(value) {
        return String(value || "").replace(/\D/g, "").slice(0, 11);
    }

    function formatPhone(value) {
        const digits = normalizePhone(value);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    async function findClientByPhone(phone) {
        const found = await window.clientApi.search("phone", phone);
        return found.find(client => normalizePhone(client.phone) === phone) || null;
    }

    /** Usa o cadastro existente com o mesmo telefone ou cria um novo. */
    async function findOrCreateClient({ name, phone, email }) {
        const digits = normalizePhone(phone);
        const existing = await findClientByPhone(digits);
        if (existing) return existing;

        try {
            const created = await window.clientApi.create({ name: name.trim(), phone: digits, email: email.trim() });
            if (created?.id) return created;
        } catch (error) {
            // 409 = outro cadastro com este telefone apareceu entre a busca e a criação.
            if (error.status !== 409) throw error;
        }
        const client = await findClientByPhone(digits);
        if (!client) throw new Error("Não foi possível identificar seu cadastro. Tente novamente.");
        return client;
    }

    function rememberClient(client) {
        try {
            localStorage.setItem(STORAGE_CLIENT_KEY, JSON.stringify({ id: Number(client.id), name: client.name || "", phone: client.phone || "", email: client.email || "" }));
        } catch {
            // Sem localStorage o agendamento funciona; só "Meus agendamentos" não lembra o cliente.
        }
    }

    /** Cliente lembrado neste navegador ({ id, name, phone, email }) ou null. */
    function currentClient() {
        try {
            const value = JSON.parse(localStorage.getItem(STORAGE_CLIENT_KEY));
            return Number(value?.id) > 0 ? value : null;
        } catch {
            return null;
        }
    }

    // ------------------------------------------------------------------
    // Gravação
    // ------------------------------------------------------------------

    /**
     * Grava a reserva completa.
     * @param {{client: {name: string, phone: string, email: string}, choices: Array, notes?: string}} data
     * @returns {Promise<object>} agendamento criado (com items)
     */
    async function book({ client, choices, notes }) {
        if (!choices?.length) throw new Error("Escolha pelo menos um serviço.");

        const plan = await planBooking(choices);
        const savedClient = await findOrCreateClient(client);
        rememberClient(savedClient);

        const appointment = await api().createAppointment({ idClient: Number(savedClient.id), notes });
        const appointmentId = Number(appointment?.id);
        if (!appointmentId) throw new Error("Não foi possível confirmar o agendamento. Tente novamente.");

        const items = [];
        try {
            for (const entry of plan) {
                items.push(await window.appointmentsItemsApi.create({
                    appointment_id: appointmentId,
                    service_id: Number(entry.choice.service.id),
                    professional_id: Number(entry.choice.professional.id),
                    resource_id: entry.resourceId,
                    start_at: entry.interval.start,
                    end_at: entry.interval.end,
                    price: Number(entry.choice.service.price) || 0
                }));
            }
        } catch (error) {
            await api().deleteAppointment(appointmentId).catch(rollbackError => {
                console.error(`[Agendamento] Não foi possível desfazer o agendamento #${appointmentId}:`, rollbackError);
            });
            throw new Error(`Não foi possível concluir o agendamento: ${error.message}`);
        }
        return { ...appointment, items };
    }

    // ------------------------------------------------------------------
    // Meus agendamentos
    // ------------------------------------------------------------------
    const CANCELLABLE = ["AGENDADO", "CONFIRMADO"];

    function firstStart(appointment) {
        const items = api().sortItems(appointment.items);
        return items.length ? new Date(items[0].start_at).getTime() : Number.MAX_SAFE_INTEGER;
    }

    /** O cliente só cancela agendamentos ativos que ainda não começaram. */
    function canCancel(appointment) {
        return CANCELLABLE.includes(String(appointment.status || "").toUpperCase()) && firstStart(appointment) > Date.now();
    }

    /**
     * Agendamentos do cliente lembrado: próximos primeiro (do mais perto ao mais
     * longe), depois os passados/encerrados (do mais recente ao mais antigo).
     */
    async function myAppointments() {
        const client = currentClient();
        if (!client) return { client: null, appointments: [] };
        const appointments = await api().searchAppointmentsByClient(client.id);
        const now = Date.now();
        const isUpcoming = appointment => canCancel(appointment) || (CANCELLABLE.includes(String(appointment.status).toUpperCase()) && firstStart(appointment) >= now);
        appointments.sort((a, b) => {
            const upA = isUpcoming(a);
            const upB = isUpcoming(b);
            if (upA !== upB) return upA ? -1 : 1;
            return upA ? firstStart(a) - firstStart(b) : firstStart(b) - firstStart(a);
        });
        return { client, appointments };
    }

    /** Nomes de serviços e profissionais por id, para exibir os itens. */
    async function lookupNames() {
        const [services, professionals] = await Promise.all([loadServices().catch(() => []), loadAllProfessionals()]);
        return {
            service: id => services.find(service => Number(service.id) === Number(id))?.name || `Serviço #${id}`,
            professional: id => professionals.find(professional => Number(professional.id) === Number(id))?.name || `Profissional #${id}`
        };
    }

    function cancel(appointmentId, reason) {
        return api().cancelAppointment(appointmentId, "CLIENTE", reason);
    }

    window.bookingService = {
        loadServices,
        professionalsFor,
        durationOf,
        todayBrasilia,
        availableSlots,
        checkAvailability,
        book,
        currentClient,
        myAppointments,
        lookupNames,
        canCancel,
        cancel,
        normalizePhone,
        formatPhone
    };
})();

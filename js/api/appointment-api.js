(function () {
                                                                                   const STATUS = Object.freeze({
        AGENDADO: "AGENDADO",
        CONFIRMADO: "CONFIRMADO",
        CONCLUIDO: "CONCLUIDO",
        CANCELADO: "CANCELADO",
        NAO_COMPARECEU: "NAO_COMPARECEU"
    });

    /** @type {AppointmentStatus[]} */
    const STATUS_LIST = [STATUS.AGENDADO, STATUS.CONFIRMADO, STATUS.CONCLUIDO, STATUS.CANCELADO, STATUS.NAO_COMPARECEU];

    const STATUS_LABELS = Object.freeze({
        AGENDADO: "Agendado",
        CONFIRMADO: "Confirmado",
        CONCLUIDO: "Concluído",
        CANCELADO: "Cancelado",
        NAO_COMPARECEU: "Não compareceu"
    });

    // Mesmo ciclo de vida do backend (AppointmentsService.NEXT_STATUS).
    const NEXT_STATUS = Object.freeze({
        AGENDADO: [STATUS.CONFIRMADO, STATUS.CANCELADO],
        CONFIRMADO: [STATUS.CONCLUIDO, STATUS.CANCELADO, STATUS.NAO_COMPARECEU],
        CONCLUIDO: [],
        CANCELADO: [],
        NAO_COMPARECEU: []
    });

    const CANCELLED_BY_LABELS = Object.freeze({ CLIENTE: "Cliente", SALAO: "Salão" });

    // Quando uma busca não encontra nada o backend responde 422 com esta mensagem (não 404 nem []).
    const NOT_FOUND_PREFIX = "Could not find appointment";

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
                message = "Agendamento não encontrado.";
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

    /** @param {unknown} data @returns {Appointment[]} */
    function normalizeList(data) {
        const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.content)
                ? data.content
                : Array.isArray(data?.data)
                    ? data.data
                    : data && typeof data === "object" && ("id" in data || "idClient" in data)
                        ? [data]
                        : [];
        return list.map(appointment => ({ ...appointment, items: Array.isArray(appointment?.items) ? appointment.items : [] }));
    }

    /** @param {any} error */
    function isNotFound(error) {
        if (error?.status === 404) return true;
        return error?.status === 422 && String(error.backendMessage || error.message || "").startsWith(NOT_FOUND_PREFIX);
    }

    /** @param {string} path @returns {Promise<Appointment[]>} */
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

    /**
     * @param {AppointmentCreatePayload} data
     * @returns {Promise<Appointment>}
     */
    function createAppointment(data) {
        if (!validId(data?.idClient)) {
            return Promise.reject(new Error("Selecione um cliente válido para o agendamento."));
        }
        const payload = {
            idClient: Number(data.idClient),
            ...(typeof data.notes === "string" && data.notes.trim() ? { notes: data.notes.trim() } : {})
        };
        return request("/createAppointments", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    /**
     * Campos omitidos (undefined) são mantidos pelo backend. notes "" apaga as observações.
     * @param {AppointmentUpdatePayload} data
     * @returns {Promise<Appointment>}
     */
    function updateAppointment(data) {
        if (!validId(data?.id)) {
            return Promise.reject(new Error("O identificador do agendamento é obrigatório."));
        }
        const payload = { id: Number(data.id) };
        if (data.idClient !== undefined && data.idClient !== null && data.idClient !== "") {
            if (!validId(data.idClient)) return Promise.reject(new Error("Cliente inválido."));
            payload.idClient = Number(data.idClient);
        }
        if (typeof data.notes === "string") payload.notes = data.notes.trim();
        if (data.status) payload.status = String(data.status).toUpperCase();
        if (data.cancelledBy) payload.cancelledBy = String(data.cancelledBy).toUpperCase();
        if (typeof data.cancelReason === "string" && data.cancelReason.trim()) payload.cancelReason = data.cancelReason.trim();
        return request("/updateAppointments", {
            method: "PUT",
            body: JSON.stringify(payload)
        });
    }

    /** @param {number} id */
    function confirmAppointment(id) {
        return updateAppointment({ id, status: STATUS.CONFIRMADO });
    }

    /** @param {number} id */
    function completeAppointment(id) {
        return updateAppointment({ id, status: STATUS.CONCLUIDO });
    }

    /** @param {number} id */
    function noShowAppointment(id) {
        return updateAppointment({ id, status: STATUS.NAO_COMPARECEU });
    }

    /**
     * @param {number} id
     * @param {CancelledBy} cancelledBy
     * @param {string} [cancelReason]
     */
    function cancelAppointment(id, cancelledBy, cancelReason) {
        const by = String(cancelledBy || "").toUpperCase();
        if (!CANCELLED_BY_LABELS[by]) {
            return Promise.reject(new Error("Informe quem cancelou o agendamento: CLIENTE ou SALAO."));
        }
        return updateAppointment({ id, status: STATUS.CANCELADO, cancelledBy: by, cancelReason });
    }

    /** O banco apaga os itens junto (ON DELETE CASCADE). @param {number} id */
    function deleteAppointment(id) {
        if (!validId(id)) {
            return Promise.reject(new Error("O identificador do agendamento é obrigatório."));
        }
        return request(`/deleteAppointments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    }

    /** @param {number|string} idClient */
    function searchAppointmentsByClient(idClient) {
        return search(`/searchClientAppointments?idClient=${encodeURIComponent(idClient)}`);
    }

    /** @param {number|string} idProfessional */
    function searchAppointmentsByProfessional(idProfessional) {
        return search(`/searchProfessionalAppointments?idProfessional=${encodeURIComponent(idProfessional)}`);
    }

    /** @param {number|string} idService */
    function searchAppointmentsByService(idService) {
        return search(`/searchServiceAppointments?idService=${encodeURIComponent(idService)}`);
    }

    /** @param {string} date YYYY-MM-DD (dia no horário de Brasília) */
    function searchAppointmentsByDate(date) {
        return search(`/searchDateAppointments?date=${encodeURIComponent(date)}`);
    }

    /** @param {AppointmentStatus} status */
    function searchAppointmentsByStatus(status) {
        return search(`/searchStatusAppointments?status=${encodeURIComponent(status)}`);
    }

    /** @param {string} notes */
    function searchAppointmentsByNotes(notes) {
        return search(`/searchNotesAppointments?notes=${encodeURIComponent(notes)}`);
    }

    /** @param {number} price */
    function searchAppointmentsByPrice(price) {
        return search(`/searchPriceAppointments?price=${encodeURIComponent(price)}`);
    }

    /** @param {string} startAt ISO 8601 com fuso */
    function searchAppointmentsByTime(startAt) {
        return search(`/searchTimeAppointments?startAt=${encodeURIComponent(startAt)}`);
    }

    /** @param {string} created ISO 8601 com fuso */
    function searchAppointmentsByCreated(created) {
        return search(`/searchCreatedAppointments?created=${encodeURIComponent(created)}`);
    }

    /**
     * Não existe rota que lista todos: junta uma busca por status para cada um dos 5 status.
     * @returns {Promise<Appointment[]>}
     */
    async function listAllAppointments() {
        const groups = await Promise.all(STATUS_LIST.map(searchAppointmentsByStatus));
        return mergeAppointments(groups);
    }

    /** Junta listas de agendamentos sem duplicar (por id), do mais recente para o mais antigo. */
    function mergeAppointments(groups) {
        const found = new Map();
        groups.forEach(group => group.forEach(appointment => found.set(Number(appointment.id), appointment)));
        return [...found.values()].sort((a, b) => Number(b.id) - Number(a.id));
    }

    function isFinalStatus(status) {
        return NEXT_STATUS[String(status || "").toUpperCase()]?.length === 0;
    }

    function canChangeTo(currentStatus, nextStatus) {
        return (NEXT_STATUS[String(currentStatus || "").toUpperCase()] || []).includes(nextStatus);
    }

    function statusLabel(status) {
        return STATUS_LABELS[String(status || "").toUpperCase()] || String(status || "—");
    }

    function cancelledByLabel(cancelledBy) {
        return CANCELLED_BY_LABELS[String(cancelledBy || "").toUpperCase()] || String(cancelledBy || "—");
    }

    // ------------------------------------------------------------------
    // Datas no horário de Brasília (UTC-03:00, sem horário de verão).
    // O backend pode devolver as datas em outro fuso (ex.: UTC "Z"); sempre
    // convertemos para Brasília ao exibir e enviamos com "-03:00".
    // ------------------------------------------------------------------
    const BRASILIA_OFFSET_MINUTES = -180;
    const pad = value => String(value).padStart(2, "0");

    /** @param {string} iso @returns {{date: string, time: string, local: string} | null} */
    function brasiliaParts(iso) {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return null;
        const shifted = new Date(date.getTime() + BRASILIA_OFFSET_MINUTES * 60000);
        const day = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
        const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
        return { date: day, time, local: `${day}T${time}` };
    }

    /** "2026-11-20T14:00" (datetime-local) ou ("2026-11-20", "14:00") -> "2026-11-20T14:00:00-03:00" */
    function toBrasiliaIso(dateOrLocal, time) {
        const local = time ? `${dateOrLocal}T${time}` : String(dateOrLocal || "");
        const match = local.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
        if (!match) return "";
        return `${match[1]}T${match[2]}:${match[3]}:00-03:00`;
    }

    /** Soma minutos a um "YYYY-MM-DDTHH:mm" local e devolve no mesmo formato. */
    function addMinutesLocal(local, minutes) {
        const match = String(local || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!match || !Number.isFinite(Number(minutes))) return "";
        const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])));
        date.setUTCMinutes(date.getUTCMinutes() + Number(minutes));
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
    }

    function formatDate(iso) {
        const parts = brasiliaParts(iso);
        if (!parts) return "—";
        const [year, month, day] = parts.date.split("-");
        return `${day}/${month}/${year}`;
    }

    function formatTime(iso) {
        return brasiliaParts(iso)?.time || "—";
    }

    function formatDateTime(iso) {
        const parts = brasiliaParts(iso);
        return parts ? `${formatDate(iso)} ${parts.time}` : "—";
    }

    /** Intervalos [start, end) se sobrepõem? Aceita ISO com qualquer fuso. */
    function overlaps(startA, endA, startB, endB) {
        const a0 = new Date(startA).getTime();
        const a1 = new Date(endA).getTime();
        const b0 = new Date(startB).getTime();
        const b1 = new Date(endB || startB).getTime();
        if ([a0, a1, b0, b1].some(Number.isNaN)) return false;
        return a0 < b1 && a1 > b0;
    }

    function sortItems(items) {
        return [...(items || [])].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    }

    window.appointmentApi = {
        STATUS,
        STATUS_LIST,
        STATUS_LABELS,
        NEXT_STATUS,
        CANCELLED_BY_LABELS,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        confirmAppointment,
        completeAppointment,
        noShowAppointment,
        cancelAppointment,
        searchAppointmentsByClient,
        searchAppointmentsByProfessional,
        searchAppointmentsByService,
        searchAppointmentsByDate,
        searchAppointmentsByStatus,
        searchAppointmentsByNotes,
        searchAppointmentsByPrice,
        searchAppointmentsByTime,
        searchAppointmentsByCreated,
        listAllAppointments,
        mergeAppointments,
        isNotFound,
        isFinalStatus,
        canChangeTo,
        statusLabel,
        cancelledByLabel,
        sortItems,
        time: {
            brasiliaParts,
            toBrasiliaIso,
            addMinutesLocal,
            formatDate,
            formatTime,
            formatDateTime,
            overlaps
        }
    };
})();

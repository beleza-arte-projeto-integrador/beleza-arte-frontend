// Agendamentos (visitas) — mesmas regras do AppointmentsService do backend:
// - todo agendamento novo começa como AGENDADO e precisa de um cliente existente;
// - o cliente não muda; observações vazias apagam; status segue o ciclo de vida;
// - para CANCELADO é obrigatório informar quem cancelou (CLIENTE ou SALAO);
// - excluir apaga os itens junto (ON DELETE CASCADE), mas não se houver pagamentos;
// - buscas sem resultado respondem 422 com a mensagem "Could not find appointment...".

const { businessError, requiredParam, toId } = require("../lib/http");
const time = require("../lib/time");

const NOT_FOUND = "Could not find appointment!, The requested appointment was not found in the system!";
const INVALID_STATUS = "Invalid status, Use AGENDADO, CONFIRMADO, CONCLUIDO, CANCELADO or NAO_COMPARECEU";
const NEXT_STATUS = {
    AGENDADO: ["CONFIRMADO", "CANCELADO"],
    CONFIRMADO: ["CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"],
    CONCLUIDO: [],
    CANCELADO: [],
    NAO_COMPARECEU: []
};
const CANCELLED_BY = ["CLIENTE", "SALAO"];

const normalize = value => (value === null || value === undefined || String(value).trim() === "") ? null : String(value).trim().toUpperCase();
const blankToNull = value => (value === null || value === undefined || String(value).trim() === "") ? null : String(value).trim();
const sameInstant = (a, b) => Date.parse(a) === Date.parse(b);

function itemToDto(item) {
    return { ...item, price: Number(item.price) };
}

function appointmentRoutes({ store, catalog, paymentRules }) {
    const itemsOf = appointmentId => store.all("items")
        .filter(item => item.appointment_id === appointmentId)
        .sort((a, b) => a.id - b.id);

    const toDto = appointment => ({
        id: appointment.id,
        idClient: appointment.idClient,
        status: appointment.status,
        notes: appointment.notes,
        cancelledBy: appointment.cancelledBy,
        cancelReason: appointment.cancelReason,
        cancelledAt: appointment.cancelledAt,
        created: appointment.created,
        updated: appointment.updated,
        items: itemsOf(appointment.id).map(itemToDto)
    });

    /** Agendamentos com algum item que atende ao filtro. */
    const withItem = predicate => store.all("appointments")
        .filter(appointment => itemsOf(appointment.id).some(predicate));

    function listOrNotFound(appointments) {
        if (!appointments.length) throw businessError(NOT_FOUND);
        return { data: [...appointments].sort((a, b) => a.id - b.id).map(toDto) };
    }

    async function clientExists(idClient) {
        const clients = await catalog.clients();
        return clients.some(client => Number(client.id) === idClient);
    }

    return [
        {
            method: "POST",
            path: "/createAppointments",
            async handler({ body }) {
                const idClient = toId(body.idClient);
                if (!idClient) throw businessError("Invalid appointment, The client is required");
                if (!(await clientExists(idClient))) {
                    // No modo híbrido o cliente pode ter acabado de ser cadastrado no backend: tenta de novo sem cache.
                    catalog.refresh?.("clients");
                    if (!(await clientExists(idClient))) throw businessError("Could not create appointment, Check if the client exists");
                }
                const appointment = store.insert("appointments", {
                    idClient,
                    status: "AGENDADO",
                    notes: blankToNull(body.notes),
                    cancelledBy: null,
                    cancelReason: null,
                    cancelledAt: null,
                    created: time.nowIso(),
                    updated: null
                });
                return { status: 201, data: toDto(appointment) };
            }
        },
        {
            method: "PUT",
            path: "/updateAppointments",
            async handler({ body }) {
                if (body.id === undefined || body.id === null) throw businessError("Could not update appointment, The appointment id is required");
                const appointment = store.find("appointments", body.id);
                if (!appointment) throw businessError("Could not update appointment, Check if the appointment exists");

                if (body.idClient !== undefined && body.idClient !== null && Number(body.idClient) !== appointment.idClient) {
                    throw businessError("Could not update appointment, The client of an appointment cannot be changed");
                }

                const changes = {};
                if (body.notes !== undefined && body.notes !== null) changes.notes = blankToNull(body.notes);

                const newStatus = normalize(body.status);
                if (newStatus && newStatus !== appointment.status) {
                    if (!NEXT_STATUS[newStatus]) throw businessError(INVALID_STATUS);
                    if (!NEXT_STATUS[appointment.status].includes(newStatus)) {
                        throw businessError(`Could not update appointment, The status cannot change from ${appointment.status} to ${newStatus}`);
                    }
                    if (newStatus === "CANCELADO") {
                        const cancelledBy = normalize(body.cancelledBy);
                        if (!cancelledBy || !CANCELLED_BY.includes(cancelledBy)) {
                            throw businessError("Could not cancel appointment, Inform who cancelled it: CLIENTE or SALAO");
                        }
                        changes.cancelledBy = cancelledBy;
                        changes.cancelReason = blankToNull(body.cancelReason);
                        changes.cancelledAt = time.nowIso();
                    }
                    changes.status = newStatus;
                }

                changes.updated = time.nowIso();
                store.update("appointments", appointment.id, changes);
                if (newStatus === "CANCELADO") paymentRules.cancelPayments(appointment.id);
                return { data: toDto(appointment) };
            }
        },
        {
            method: "DELETE",
            path: "/deleteAppointments",
            async handler({ query }) {
                const id = toId(query.get("id"));
                if (!id || !store.find("appointments", id)) throw businessError("Could not delete appointment, Check if the appointment exists");
                // No banco, payments.appointment_id não tem ON DELETE CASCADE.
                if (store.all("payments").some(payment => payment.appointmentId === id)) {
                    throw businessError("Could not delete appointment, Check if the appointment has payments");
                }
                store.removeWhere("items", item => item.appointment_id === id);
                store.remove("appointments", id);
                return { status: 204 };
            }
        },
        {
            method: "GET",
            path: "/searchClientAppointments",
            async handler({ query }) {
                const idClient = Number(requiredParam(query, "idClient"));
                return listOrNotFound(store.all("appointments").filter(appointment => appointment.idClient === idClient));
            }
        },
        {
            method: "GET",
            path: "/searchProfessionalAppointments",
            async handler({ query }) {
                const id = Number(requiredParam(query, "idProfessional"));
                return listOrNotFound(withItem(item => Number(item.professional_id) === id));
            }
        },
        {
            method: "GET",
            path: "/searchServiceAppointments",
            async handler({ query }) {
                const id = Number(requiredParam(query, "idService"));
                return listOrNotFound(withItem(item => Number(item.service_id) === id));
            }
        },
        {
            method: "GET",
            path: "/searchDateAppointments",
            async handler({ query }) {
                const date = requiredParam(query, "date");
                if (!time.isValidDay(date)) throw businessError("Invalid date, Use the format YYYY-MM-DD");
                const start = time.startOfDay(date);
                const end = time.startOfDay(time.addDays(date, 1));
                return listOrNotFound(withItem(item => {
                    const startAt = Date.parse(item.start_at);
                    return startAt >= start && startAt < end;
                }));
            }
        },
        {
            method: "GET",
            path: "/searchStatusAppointments",
            async handler({ query }) {
                const status = normalize(requiredParam(query, "status"));
                if (!status || !NEXT_STATUS[status]) throw businessError(INVALID_STATUS);
                return listOrNotFound(store.all("appointments").filter(appointment => appointment.status === status));
            }
        },
        {
            method: "GET",
            path: "/searchNotesAppointments",
            async handler({ query }) {
                const notes = String(requiredParam(query, "notes")).toLowerCase();
                return listOrNotFound(store.all("appointments").filter(appointment => String(appointment.notes || "").toLowerCase().includes(notes)));
            }
        },
        {
            method: "GET",
            path: "/searchPriceAppointments",
            async handler({ query }) {
                const price = Number(requiredParam(query, "price"));
                return listOrNotFound(withItem(item => Number(item.price) === price));
            }
        },
        {
            method: "GET",
            path: "/searchTimeAppointments",
            async handler({ query }) {
                const startAt = requiredParam(query, "startAt");
                return listOrNotFound(withItem(item => sameInstant(item.start_at, startAt)));
            }
        },
        {
            method: "GET",
            path: "/searchCreatedAppointments",
            async handler({ query }) {
                const created = requiredParam(query, "created");
                return listOrNotFound(store.all("appointments").filter(appointment => sameInstant(appointment.created, created)));
            }
        }
    ];
}

module.exports = { appointmentRoutes, itemToDto };

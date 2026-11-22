// Itens (serviços) de um agendamento — rotas em /appointmentsItems, como no
// AppointmentsItemsController. Criar, alterar ou excluir um item recalcula o
// pagamento pendente do agendamento (generatePayments), como no backend.

const { businessError, toId } = require("../lib/http");
const { itemToDto } = require("./appointments");

const REQUIRED = ["appointment_id", "service_id", "professional_id", "resource_id", "start_at", "end_at", "price"];

function readItem(body) {
    return {
        appointment_id: Number(body.appointment_id),
        service_id: Number(body.service_id),
        professional_id: Number(body.professional_id),
        resource_id: Number(body.resource_id),
        start_at: String(body.start_at),
        end_at: String(body.end_at),
        price: Number(body.price)
    };
}

function appointmentItemRoutes({ store, paymentRules }) {
    const missingField = body => REQUIRED.some(field => body[field] === undefined || body[field] === null || body[field] === "");

    function assertAppointment(appointmentId) {
        // No banco, appointment_items.appointment_id é chave estrangeira.
        if (!store.find("appointments", appointmentId)) {
            throw businessError("Erro: Verifique se todos os itens foram preenchidos corretamente");
        }
    }

    const search = predicate => ({ data: store.all("items").filter(predicate).sort((a, b) => a.id - b.id).map(itemToDto) });

    return [
        {
            method: "POST",
            path: "/appointmentsItems/createAppointmentsItems",
            async handler({ body }) {
                if (missingField(body)) throw businessError("Erro: Campo não preenchido");
                const item = readItem(body);
                assertAppointment(item.appointment_id);
                const saved = store.insert("items", item);
                paymentRules.generatePayments(saved.appointment_id);
                return { status: 201, data: itemToDto(saved) };
            }
        },
        {
            method: "PUT",
            path: "/appointmentsItems/updateAppointmentsItems",
            async handler({ body }) {
                const existing = store.find("items", body.id);
                if (!existing || missingField(body)) throw businessError("Erro: Verifique se todos os itens foram preenchidos corretamente");
                const item = readItem(body);
                assertAppointment(item.appointment_id);
                const previousAppointmentId = existing.appointment_id;
                store.update("items", existing.id, item);
                paymentRules.generatePayments(item.appointment_id);
                if (previousAppointmentId !== item.appointment_id) paymentRules.generatePayments(previousAppointmentId);
                return { data: itemToDto(existing) };
            }
        },
        {
            method: "DELETE",
            path: "/appointmentsItems/deleteAppointmentsItems",
            async handler({ query }) {
                const item = store.find("items", toId(query.get("id")));
                if (item) {
                    store.remove("items", item.id);
                    paymentRules.generatePayments(item.appointment_id);
                }
                return { status: 204 };
            }
        },
        {
            method: "GET",
            path: "/appointmentsItems/searchStartDate",
            async handler({ query }) {
                const value = Date.parse(query.get("start_at"));
                return search(item => Date.parse(item.start_at) === value);
            }
        },
        {
            method: "GET",
            path: "/appointmentsItems/searchEndDate",
            async handler({ query }) {
                const value = Date.parse(query.get("end_at"));
                return search(item => Date.parse(item.end_at) === value);
            }
        },
        {
            method: "GET",
            path: "/appointmentsItems/searchPrice",
            async handler({ query }) {
                const value = Number(query.get("price"));
                return search(item => Number(item.price) === value);
            }
        }
    ];
}

module.exports = { appointmentItemRoutes };

// Pagamentos — mesmas regras do PaymentsService do backend:
// - o pagamento não é criado pela tela: ele é gerado/recalculado sempre que um
//   item do agendamento é criado, alterado ou excluído (generatePayments);
// - ao cancelar o agendamento, os pagamentos PENDENTE viram CANCELADO;
// - só um pagamento PENDENTE pode ser pago.

const { businessError, requiredParam } = require("../lib/http");
const time = require("../lib/time");

const STATUS = ["PENDENTE", "PAGO", "CANCELADO", "ESTORNADO"];
const METHODS = ["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO"];
const PERIODS = ["DAY", "LAST_7_DAYS", "MONTH", "YEAR"];
const DEFAULT_METHOD = "PIX";
const NOT_FOUND = "Could not find payment!, The requested payment was not found in the system!";
const INVALID_STATUS = "Invalid status, Use PENDENTE, PAGO, CANCELADO or ESTORNADO";

const normalize = value => (value === null || value === undefined || String(value).trim() === "") ? null : String(value).trim().toUpperCase();
const money = value => Math.round(Number(value) * 100) / 100;
const sum = (list, pick = row => row.amount) => money(list.reduce((total, row) => total + Number(pick(row) || 0), 0));
/** Variação percentual sem casas decimais (HALF_UP), como no backend. */
const changePercent = (current, previous) => (previous === 0 ? null : Math.round(((current - previous) * 100) / previous));

function toDto(payment) {
    return {
        id: payment.id,
        idAppointment: payment.appointmentId,
        amount: money(payment.amount),
        method: payment.method,
        status: payment.status,
        paidAt: payment.paidAt,
        created: payment.created
    };
}

function createPaymentRules(store) {
    /** Recalcula o pagamento pendente do agendamento a partir da soma dos itens. */
    function generatePayments(appointmentId) {
        const appointment = store.find("appointments", appointmentId);
        if (!appointment || appointment.status === "CANCELADO") return;

        const payments = store.all("payments").filter(payment => payment.appointmentId === appointment.id);
        const pendings = payments.filter(payment => payment.status === "PENDENTE");
        const current = pendings.reduce((latest, payment) => (!latest || payment.id > latest.id ? payment : latest), null);

        const itemsTotal = sum(store.all("items").filter(item => item.appointment_id === appointment.id), item => item.price);
        const paid = sum(payments.filter(payment => payment.status === "PAGO"));
        const otherPending = sum(pendings.filter(payment => payment !== current));
        const outstanding = money(itemsTotal - paid - otherPending);

        if (outstanding > 0) {
            if (current) {
                if (money(current.amount) !== outstanding) current.amount = outstanding;
            } else {
                store.insert("payments", {
                    appointmentId: appointment.id,
                    amount: outstanding,
                    method: DEFAULT_METHOD,
                    status: "PENDENTE",
                    paidAt: null,
                    created: time.nowIso()
                });
            }
        } else if (current) {
            store.remove("payments", current.id);
        }
    }

    function cancelPayments(appointmentId) {
        store.all("payments")
            .filter(payment => payment.appointmentId === Number(appointmentId) && payment.status === "PENDENTE")
            .forEach(payment => { payment.status = "CANCELADO"; });
    }

    return { generatePayments, cancelPayments };
}

function paymentRoutes({ store, names }) {
    const paidBetween = (start, end) => sum(store.all("payments").filter(payment => {
        if (payment.status !== "PAGO" || !payment.paidAt) return false;
        const paidAt = Date.parse(payment.paidAt);
        return paidAt >= start && paidAt < end;
    }));

    const createdBetween = (status, start, end) => sum(store.all("payments").filter(payment => {
        const created = Date.parse(payment.created);
        return payment.status === status && created >= start && created < end;
    }));

    function listOrNotFound(payments) {
        if (!payments.length) throw businessError(NOT_FOUND);
        return payments.sort((a, b) => a.id - b.id).map(toDto);
    }

    return [
        {
            method: "GET",
            path: "/listPayments",
            async handler({ query }) {
                const status = normalize(query.get("status"));
                if (status && !STATUS.includes(status)) throw businessError(INVALID_STATUS);

                const [clientNames, serviceNames] = await Promise.all([names.clients(), names.services()]);
                const rows = store.all("payments")
                    .filter(payment => !status || payment.status === status)
                    .map(payment => {
                        const appointment = store.find("appointments", payment.appointmentId);
                        const items = store.all("items")
                            .filter(item => item.appointment_id === payment.appointmentId)
                            .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at));
                        return {
                            ...toDto(payment),
                            clientName: appointment ? (clientNames.get(Number(appointment.idClient)) || `Cliente ${appointment.idClient}`) : null,
                            services: items.length ? items.map(item => serviceNames.get(Number(item.service_id)) || `Serviço ${item.service_id}`).join(" + ") : null,
                            appointmentDate: items.length ? items[0].start_at : null
                        };
                    });
                // Mais recentes primeiro: pelo pagamento (ou pela criação, se ainda não foi pago).
                rows.sort((a, b) => Date.parse(b.paidAt || b.created) - Date.parse(a.paidAt || a.created) || b.id - a.id);
                return { data: rows };
            }
        },
        {
            method: "GET",
            path: "/searchSummaryPayments",
            async handler({ query }) {
                const month = query.get("month") || time.today().slice(0, 7);
                if (!/^\d{4}-\d{2}$/.test(month)) throw businessError("Invalid month, Use the format YYYY-MM");

                const firstDay = `${month}-01`;
                const start = time.startOfDay(firstDay);
                const end = time.startOfDay(time.addMonths(firstDay, 1));
                const previousStart = time.startOfDay(time.addMonths(firstDay, -1));

                const received = paidBetween(start, end);
                const receivedPrevious = paidBetween(previousStart, start);
                const paidCreated = createdBetween("PAGO", start, end);
                const pendingCreated = createdBetween("PENDENTE", start, end);
                const pending = store.all("payments").filter(payment => payment.status === "PENDENTE");

                return {
                    data: {
                        month,
                        receivedMonth: received,
                        receivedPreviousMonth: receivedPrevious,
                        receivedChangePercent: changePercent(received, receivedPrevious),
                        pendingAmount: sum(pending),
                        pendingAppointments: new Set(pending.map(payment => payment.appointmentId)).size,
                        receiptRatePercent: paidCreated + pendingCreated === 0 ? null : Math.round((paidCreated * 100) / (paidCreated + pendingCreated))
                    }
                };
            }
        },
        {
            method: "GET",
            path: "/searchRevenuePayments",
            async handler({ query }) {
                const period = normalize(query.get("period"));
                if (!period || !PERIODS.includes(period)) throw businessError("Invalid period, Use DAY, LAST_7_DAYS, MONTH or YEAR");
                const reference = query.get("date") || time.today();
                if (!time.isValidDay(reference)) throw businessError("Invalid date, Use the format YYYY-MM-DD");

                let start;
                let end;
                let previousStart;
                if (period === "DAY") {
                    start = reference;
                    end = time.addDays(reference, 1);
                    previousStart = time.addDays(reference, -1);
                } else if (period === "LAST_7_DAYS") {
                    start = time.addDays(reference, -6);
                    end = time.addDays(reference, 1);
                    previousStart = time.addDays(start, -7);
                } else if (period === "MONTH") {
                    start = `${reference.slice(0, 7)}-01`;
                    end = time.addMonths(start, 1);
                    previousStart = time.addMonths(start, -1);
                } else {
                    start = `${reference.slice(0, 4)}-01-01`;
                    end = time.addMonths(start, 12);
                    previousStart = time.addMonths(start, -12);
                }

                const received = paidBetween(time.startOfDay(start), time.startOfDay(end));
                const receivedPrevious = paidBetween(time.startOfDay(previousStart), time.startOfDay(start));
                return {
                    data: {
                        period,
                        start,
                        end: time.addDays(end, -1),
                        received,
                        receivedPrevious,
                        changePercent: changePercent(received, receivedPrevious)
                    }
                };
            }
        },
        {
            method: "PUT",
            path: "/payPayments",
            async handler({ body }) {
                if (!body || body.id === undefined || body.id === null) throw businessError("Could not pay, The payment id is required");
                const method = normalize(body.method);
                if (!method || !METHODS.includes(method)) throw businessError("Invalid method, Use PIX, CARTAO_CREDITO, CARTAO_DEBITO or DINHEIRO");
                const payment = store.find("payments", body.id);
                if (!payment) throw businessError("Could not pay, Check if the payment exists");
                if (payment.status !== "PENDENTE") {
                    throw businessError(`Could not pay, Only PENDENTE payments can be paid and this one is ${payment.status}`);
                }
                store.update("payments", payment.id, { method, status: "PAGO", paidAt: time.nowIso() });
                return { data: toDto(payment) };
            }
        },
        {
            method: "GET",
            path: "/searchAppointmentPayments",
            async handler({ query }) {
                const idAppointment = Number(requiredParam(query, "idAppointment"));
                return { data: listOrNotFound(store.all("payments").filter(payment => payment.appointmentId === idAppointment)) };
            }
        },
        {
            method: "GET",
            path: "/searchStatusPayments",
            async handler({ query }) {
                const status = normalize(requiredParam(query, "status"));
                if (!status || !STATUS.includes(status)) throw businessError(INVALID_STATUS);
                return { data: listOrNotFound(store.all("payments").filter(payment => payment.status === status)) };
            }
        }
    ];
}

module.exports = { paymentRoutes, createPaymentRules };

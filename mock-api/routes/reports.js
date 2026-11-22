// Relatório gerencial — mesmo cálculo do ManagementReportsService do backend.
// Considera os itens que começam no período (horário de Brasília); um
// agendamento conta uma vez, mesmo com vários serviços.

const { MockHttpError } = require("../lib/http");
const time = require("../lib/time");

const MAX_DAYS = 366;

const money = value => Math.round(Number(value) * 100) / 100;
/** Percentual com 1 casa decimal (1 de 8 = 12.5). */
const percent = (part, total) => (total === 0 ? 0 : Math.round((part * 1000) / total) / 10);

function validationError(code, message) {
    return new MockHttpError(422, message, { code });
}

function reportRoutes({ store, catalog, names }) {
    async function availableMinutes(startDate, endDate, idProfessional) {
        const ranges = await catalog.availability();
        const byWeekday = [0, 0, 0, 0, 0, 0, 0];
        ranges
            .filter(range => idProfessional === null || Number(range.professionalId) === idProfessional)
            .forEach(range => {
                const [startHour, startMinute] = range.startTime.split(":").map(Number);
                const [endHour, endMinute] = range.endTime.split(":").map(Number);
                const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                if (minutes > 0) byWeekday[range.weekday] += minutes;
            });
        let total = 0;
        for (let day = startDate; day <= endDate; day = time.addDays(day, 1)) {
            total += byWeekday[time.weekdayOf(day)];
        }
        return total;
    }

    return [
        {
            method: "GET",
            path: "/searchManagementReport",
            async handler({ query }) {
                const startDate = query.get("startDate");
                const endDate = query.get("endDate");
                const rawProfessional = query.get("idProfessional");
                const idProfessional = rawProfessional === null || rawProfessional === "" ? null : Number(rawProfessional);

                if (!time.isValidDay(startDate) || !time.isValidDay(endDate)) {
                    throw validationError("INVALID_DATE", "The start date and the end date are required.");
                }
                if (endDate < startDate) throw validationError("INVALID_PERIOD", "The end date must be on or after the start date.");
                const days = Math.round((time.startOfDay(endDate) - time.startOfDay(startDate)) / time.DAY_MS) + 1;
                if (days > MAX_DAYS) throw validationError("PERIOD_TOO_LONG", `The period can have at most ${MAX_DAYS} days.`);

                const start = time.startOfDay(startDate);
                const end = time.startOfDay(time.addDays(endDate, 1));
                const [serviceNames, professionalNames] = await Promise.all([names.services(), names.professionals()]);

                let totalAppointments = 0;
                let completedAppointments = 0;
                let cancelledAppointments = 0;
                let noShowAppointments = 0;
                let validAppointments = 0;
                let totalServices = 0;
                let bookedMinutes = 0;
                let expectedRevenue = 0;
                let completedRevenue = 0;
                const clients = new Set();
                const services = new Map();
                const professionals = new Map();
                const servicesByWeekday = [0, 0, 0, 0, 0, 0, 0];
                const servicesByHour = {};

                store.all("appointments").forEach(appointment => {
                    const items = store.all("items").filter(item => {
                        if (item.appointment_id !== appointment.id) return false;
                        const startAt = Date.parse(item.start_at);
                        return startAt >= start && startAt < end
                            && (idProfessional === null || Number(item.professional_id) === idProfessional);
                    });
                    if (!items.length) return;

                    const status = String(appointment.status || "").toUpperCase();
                    const cancelled = status === "CANCELADO";
                    const noShow = status === "NAO_COMPARECEU";

                    totalAppointments++;
                    if (cancelled) cancelledAppointments++;
                    else if (noShow) noShowAppointments++;
                    else {
                        validAppointments++;
                        clients.add(appointment.idClient);
                    }
                    if (status === "CONCLUIDO") completedAppointments++;

                    items.forEach(item => {
                        const professionalId = Number(item.professional_id);
                        if (!professionals.has(professionalId)) {
                            professionals.set(professionalId, {
                                idProfessional: professionalId,
                                name: professionalNames.get(professionalId) || `Professional ${professionalId}`,
                                services: 0,
                                revenue: 0,
                                cancelledServices: 0,
                                noShowServices: 0
                            });
                        }
                        const professional = professionals.get(professionalId);
                        if (cancelled) { professional.cancelledServices++; return; }
                        if (noShow) { professional.noShowServices++; return; }

                        const price = Number(item.price) || 0;
                        totalServices++;
                        expectedRevenue += price;
                        if (status === "CONCLUIDO") completedRevenue += price;
                        professional.services++;
                        professional.revenue += price;

                        const serviceId = Number(item.service_id);
                        if (!services.has(serviceId)) {
                            services.set(serviceId, { idService: serviceId, name: serviceNames.get(serviceId) || `Service ${serviceId}`, quantity: 0, revenue: 0 });
                        }
                        const service = services.get(serviceId);
                        service.quantity++;
                        service.revenue += price;

                        servicesByWeekday[time.weekdayOf(time.dayOf(item.start_at))]++;
                        const hour = time.timeOf(item.start_at);
                        servicesByHour[hour] = (servicesByHour[hour] || 0) + 1;

                        const minutes = (Date.parse(item.end_at) - Date.parse(item.start_at)) / 60000;
                        if (minutes > 0) bookedMinutes += minutes;
                    });
                });

                const available = await availableMinutes(startDate, endDate, idProfessional);
                const byName = (a, b) => String(a.name).localeCompare(String(b.name));
                const serviceRanking = [...services.values()]
                    .map(service => ({ ...service, revenue: money(service.revenue) }))
                    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || byName(a, b));
                const professionalRanking = [...professionals.values()]
                    .map(professional => ({ ...professional, revenue: money(professional.revenue) }))
                    .sort((a, b) => b.services - a.services || b.revenue - a.revenue || byName(a, b));
                const sortedHours = Object.fromEntries(Object.keys(servicesByHour).sort().map(hour => [hour, servicesByHour[hour]]));

                return {
                    data: {
                        startDate,
                        endDate,
                        idProfessional,
                        totalAppointments,
                        completedAppointments,
                        cancelledAppointments,
                        noShowAppointments,
                        cancellationRate: percent(cancelledAppointments, totalAppointments),
                        noShowRate: percent(noShowAppointments, totalAppointments),
                        totalServices,
                        expectedRevenue: money(expectedRevenue),
                        completedRevenue: money(completedRevenue),
                        averageTicket: validAppointments === 0 ? 0 : money(expectedRevenue / validAppointments),
                        uniqueClients: clients.size,
                        availableMinutes: available,
                        bookedMinutes,
                        occupancyRate: available === 0 ? null : percent(bookedMinutes, available),
                        services: serviceRanking,
                        professionals: professionalRanking,
                        servicesByWeekday,
                        servicesByHour: sortedHours
                    }
                };
            }
        }
    ];
}

module.exports = { reportRoutes };

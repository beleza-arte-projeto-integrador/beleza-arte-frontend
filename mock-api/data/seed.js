// Dados iniciais do modo demonstração.
//
// Baseados no script de dados de teste do backend
// (beleza-arte-back/docker/postgres/init/02-dados-de-teste.sql), com as
// mesmas pessoas, serviços, recursos e um agendamento de cada status.
// As datas são relativas ao dia em que o servidor sobe (passado e futuro),
// como no script SQL.
//
// Diferenças em relação ao SQL, para a jornada funcionar na tela:
// - A especialidade de cada profissional é o NOME de um serviço, porque o
//   agendamento do cliente procura profissionais por especialidade = serviço.
// - Duas profissionais a mais (Renata e Paula) para todos os serviços terem
//   alguém que os atenda.
// - Alguns atendimentos concluídos e pagos a mais, para o relatório e os
//   pagamentos terem números para mostrar.

const time = require("../lib/time");

const SERVICES = [
    { id: 1, name: "Corte", description: "Corte de cabelo feminino ou masculino.", category: "Cabelo", duration_minutes: 45, price: 50 },
    { id: 2, name: "Mechas / Coloração", description: "Mechas, luzes ou coloração completa.", category: "Cabelo", duration_minutes: 180, price: 250 },
    { id: 3, name: "Escova / Tratamentos", description: "Escova modeladora e tratamentos capilares.", category: "Cabelo", duration_minutes: 60, price: 120 },
    { id: 4, name: "Penteados", description: "Penteados para festas e eventos.", category: "Cabelo", duration_minutes: 60, price: 150 },
    { id: 5, name: "Manicure", description: "Cutilagem e esmaltação das mãos.", category: "Unhas", duration_minutes: 45, price: 60 },
    { id: 6, name: "Limpeza de pele", description: "Limpeza de pele profunda com extração.", category: "Estética", duration_minutes: 90, price: 150 },
    { id: 7, name: "Depilação", description: "Depilação com cera.", category: "Estética", duration_minutes: 60, price: 120 },
    { id: 8, name: "Design de sobrancelhas", description: "Design de sobrancelhas com pinça ou linha.", category: "Estética", duration_minutes: 30, price: 45 },
    { id: 9, name: "Maquiagem", description: "Maquiagem social para eventos.", category: "Maquiagem", duration_minutes: 60, price: 200 }
];

const PROFESSIONALS = [
    [1, "Anna Souza", "Mechas / Coloração", 12, "anna", true],
    [2, "Juliana Lima", "Limpeza de pele", 6, "juliana", true],
    [3, "Camila Rocha", "Manicure", 4, "camila", true],
    [4, "Marina Alves", "Maquiagem", 8, "marina", true],
    [5, "Beatriz Costa", "Design de sobrancelhas", 5, "beatriz", true],
    [6, "Carolina Mendes", "Depilação", 3, "carolina", true],
    [7, "Sofia Ribeiro", "Corte", 10, "sofia", true],
    [8, "Laura Martins", "Penteados", 2, "laura", false],
    [9, "Carol Dias", "Manicure", 1, "carol", true],
    [10, "Renata Prado", "Penteados", 7, "renata", true],
    [11, "Paula Nunes", "Escova / Tratamentos", 9, "paula", true]
];

const RESOURCES = [
    { id: 1, name: "Cadeira 1", type: "CADEIRA", active: true },
    { id: 2, name: "Cadeira 2", type: "CADEIRA", active: true },
    { id: 3, name: "Cadeira 3", type: "CADEIRA", active: true },
    { id: 4, name: "Cabine de estética", type: "CABINE", active: true },
    { id: 5, name: "Bancada de manicure", type: "EQUIPAMENTO", active: true },
    { id: 6, name: "Cadeira 4", type: "CADEIRA", active: false }
];

const CLIENTS = [
    [1, "Camila Rodrigues", "61981110001", "camila.rodrigues@email.test", 60],
    [2, "Maria das Graças", "61981110002", "maria.gracas@email.test", 50],
    [3, "Fernanda Oliveira", "61981110003", "fernanda.oliveira@email.test", 40],
    [4, "Patrícia Gomes", "61981110004", "patricia.gomes@email.test", 30],
    [5, "Ricardo Pereira", "61981110005", "ricardo.pereira@email.test", 20],
    [6, "Juliana Freitas", "61981110006", "juliana.freitas@email.test", 15]
];

// [id, cliente, status, observações, cancelado por, motivo, cancelado há (dias), criado há (dias)]
const APPOINTMENTS = [
    [1, 1, "CONCLUIDO", "Retoque de mechas.", null, null, null, 10],
    [2, 2, "CONCLUIDO", "Cliente pediu confirmação por ligação.", null, null, null, 5],
    [3, 3, "CANCELADO", null, "CLIENTE", "Imprevisto no trabalho.", 2, 6],
    [4, 4, "NAO_COMPARECEU", null, null, null, null, 4],
    [5, 6, "CONFIRMADO", "Prova de maquiagem e penteado para o casamento.", null, null, null, 3],
    [6, 5, "AGENDADO", null, null, null, null, 1],
    [7, 1, "AGENDADO", "Agendado pelo celular.", null, null, null, 0],
    [8, 2, "CANCELADO", null, "SALAO", "Profissional com atestado médico.", 1, 4],
    [9, 5, "CONCLUIDO", null, null, null, null, 4],
    [10, 3, "CONCLUIDO", "Manicure e sobrancelhas no mesmo horário.", null, null, null, 8],
    [11, 6, "CONCLUIDO", null, null, null, null, 9],
    [12, 2, "CONCLUIDO", null, null, null, null, 15],
    [13, 4, "CANCELADO", null, "CLIENTE", "Viagem de última hora.", 1, 3],
    [14, 1, "CONFIRMADO", null, null, null, null, 2]
];

// [agendamento, serviço, profissional, recurso, dias a partir de hoje, hora]
const ITEMS = [
    [1, 2, 1, 1, -7, "14:00"],
    [1, 5, 3, 5, -7, "17:00"],
    [2, 3, 11, 2, -3, "10:00"],
    [3, 1, 7, 2, -1, "15:00"],
    [4, 6, 2, 4, -1, "10:00"],
    [5, 9, 4, 3, 1, "09:00"],
    [5, 4, 10, 3, 1, "10:00"],
    [6, 1, 7, 1, 3, "09:00"],
    [6, 8, 5, 4, 3, "10:00"],
    [7, 7, 6, 4, 2, "16:00"],
    [8, 3, 11, 2, 2, "10:00"],
    [9, 1, 7, 1, -2, "11:00"],
    [10, 5, 9, 5, -5, "15:00"],
    [10, 8, 5, 4, -5, "15:00"],
    [11, 6, 2, 4, -6, "10:00"],
    [12, 2, 1, 1, -12, "09:30"],
    [13, 7, 6, 4, 4, "14:00"],
    [14, 3, 11, 2, 1, "15:00"]
];

// [agendamento, valor, forma, status, pago há (dias) ou null, criado há (dias)]
const PAYMENTS = [
    [1, 310, "PIX", "PAGO", 7, 7],
    [2, 120, "DINHEIRO", "PAGO", 3, 3],
    [3, 20, "PIX", "ESTORNADO", 6, 6],
    [5, 100, "PIX", "PAGO", 3, 3],
    [5, 250, "CARTAO_CREDITO", "PENDENTE", null, 3],
    [6, 95, "CARTAO_DEBITO", "PENDENTE", null, 1],
    [7, 120, "PIX", "PENDENTE", null, 0],
    [8, 120, "PIX", "CANCELADO", null, 4],
    [9, 50, "DINHEIRO", "PAGO", 2, 4],
    [10, 105, "CARTAO_DEBITO", "PAGO", 5, 8],
    [11, 150, "CARTAO_CREDITO", "PAGO", 6, 9],
    [12, 250, "PIX", "PAGO", 12, 15],
    [13, 120, "PIX", "CANCELADO", null, 3],
    [14, 120, "PIX", "PENDENTE", null, 2]
];

/** Expediente: profissionais 1 a 8, 10 e 11 de terça a sábado; Camila também na segunda; Carol só aos sábados. */
function buildAvailability() {
    const ranges = [];
    [1, 2, 3, 4, 5, 6, 7, 8, 10, 11].forEach(professionalId => {
        for (let weekday = 2; weekday <= 6; weekday++) {
            ranges.push({ professionalId, weekday, startTime: "09:00", endTime: "12:00" });
            ranges.push({ professionalId, weekday, startTime: "13:00", endTime: "18:00" });
        }
    });
    ranges.push({ professionalId: 3, weekday: 1, startTime: "09:00", endTime: "17:00" });
    ranges.push({ professionalId: 9, weekday: 6, startTime: "08:00", endTime: "14:00" });
    return ranges;
}

function daysAgo(days) {
    return time.toIso(Date.now() - days * time.DAY_MS);
}

/**
 * @param {{ catalog: boolean, appointments: boolean }} options
 *   catalog: inclui clientes, profissionais, serviços, recursos e expediente (modo offline).
 *   appointments: inclui agendamentos, itens e pagamentos de exemplo.
 */
function buildSeed({ catalog, appointments }) {
    const today = time.today();
    const seed = {
        clients: [],
        professionals: [],
        services: [],
        resources: [],
        availability: [],
        appointments: [],
        items: [],
        payments: []
    };

    if (catalog) {
        seed.services = SERVICES.map(service => ({ ...service, created: daysAgo(90) }));
        seed.resources = RESOURCES.map(resource => ({ ...resource }));
        seed.clients = CLIENTS.map(([id, name, phone, email, createdDaysAgo]) => ({ id, name, phone, email, created: daysAgo(createdDaysAgo) }));
        seed.professionals = PROFESSIONALS.map(([id, name, specialty, experienceYears, username, active]) => ({
            id,
            name,
            specialty,
            phone: `619900000${String(id).padStart(2, "0")}`,
            email: `${username}@belezaearte.test`,
            cpf: `100000000${String(id).padStart(2, "0")}`,
            experienceYears,
            username,
            active,
            created: daysAgo(120 - id * 5),
            updated: null
        }));
        seed.availability = buildAvailability();
    }

    if (appointments) {
        const durationOf = serviceId => SERVICES.find(service => service.id === serviceId).duration_minutes;
        const priceOf = serviceId => SERVICES.find(service => service.id === serviceId).price;

        seed.appointments = APPOINTMENTS.map(([id, idClient, status, notes, cancelledBy, cancelReason, cancelledDaysAgo, createdDaysAgo]) => ({
            id,
            idClient,
            status,
            notes,
            cancelledBy,
            cancelReason,
            cancelledAt: cancelledDaysAgo === null ? null : daysAgo(cancelledDaysAgo),
            created: daysAgo(createdDaysAgo),
            updated: status === "AGENDADO" ? null : daysAgo(Math.max(createdDaysAgo - 1, 0))
        }));

        seed.items = ITEMS.map(([appointmentId, serviceId, professionalId, resourceId, days, hour], index) => {
            const start = time.at(time.addDays(today, days), hour);
            return {
                id: index + 1,
                appointment_id: appointmentId,
                service_id: serviceId,
                professional_id: professionalId,
                resource_id: resourceId,
                start_at: time.toIso(start),
                end_at: time.toIso(start + durationOf(serviceId) * 60000),
                price: priceOf(serviceId)
            };
        });

        seed.payments = PAYMENTS.map(([appointmentId, amount, method, status, paidDaysAgo, createdDaysAgo], index) => ({
            id: index + 1,
            appointmentId,
            amount,
            method,
            status,
            paidAt: paidDaysAgo === null ? null : daysAgo(paidDaysAgo),
            created: daysAgo(createdDaysAgo)
        }));
    }

    return seed;
}

module.exports = { buildSeed };

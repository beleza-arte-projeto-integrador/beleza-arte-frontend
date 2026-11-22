/**
 * Status do agendamento (visita). CONCLUIDO, CANCELADO e NAO_COMPARECEU são finais.
 * @typedef {"AGENDADO"|"CONFIRMADO"|"CONCLUIDO"|"CANCELADO"|"NAO_COMPARECEU"} AppointmentStatus
 */

/**
 * Quem cancelou o agendamento.
 * @typedef {"CLIENTE"|"SALAO"} CancelledBy
 */

/**
 * Item (serviço) de um agendamento. JSON em snake_case.
 * Datas em ISO 8601 com fuso, ex.: 2026-11-20T14:00:00-03:00.
 * @typedef {Object} AppointmentItem
 * @property {number} [id]
 * @property {number} appointment_id
 * @property {number} service_id
 * @property {number} professional_id
 * @property {number} resource_id
 * @property {string} start_at
 * @property {string} end_at
 * @property {number} price
 */

/**
 * Agendamento (visita do cliente). JSON em camelCase.
 * @typedef {Object} Appointment
 * @property {number} id
 * @property {number} idClient
 * @property {AppointmentStatus} status
 * @property {string|null} [notes]
 * @property {CancelledBy|null} [cancelledBy]
 * @property {string|null} [cancelReason]
 * @property {string|null} [cancelledAt]
 * @property {string} [created]
 * @property {string} [updated]
 * @property {AppointmentItem[]} items Sempre preenchido nas respostas das buscas.
 */

/**
 * POST /createAppointments. O status sempre começa como AGENDADO.
 * @typedef {Object} AppointmentCreatePayload
 * @property {number} idClient
 * @property {string} [notes]
 */

/**
 * PUT /updateAppointments. Campos omitidos são mantidos; notes "" apaga as observações.
 * idClient não pode mudar. Para CANCELADO, cancelledBy é obrigatório.
 * @typedef {Object} AppointmentUpdatePayload
 * @property {number} id
 * @property {number} [idClient]
 * @property {string} [notes]
 * @property {AppointmentStatus} [status]
 * @property {CancelledBy} [cancelledBy]
 * @property {string} [cancelReason]
 */

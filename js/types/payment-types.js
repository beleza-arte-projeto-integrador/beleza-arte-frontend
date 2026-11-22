/**
 * Status do pagamento. O backend cria o PENDENTE e o recalcula quando os itens do
 * agendamento mudam; passa para CANCELADO quando o agendamento é cancelado.
 * Só PENDENTE pode ser pago pelo frontend (PUT /payPayments).
 * @typedef {"PENDENTE"|"PAGO"|"CANCELADO"|"ESTORNADO"} PaymentStatus
 */

/**
 * Forma de pagamento.
 * @typedef {"PIX"|"CARTAO_CREDITO"|"CARTAO_DEBITO"|"DINHEIRO"} PaymentMethod
 */

/**
 * Período do faturamento (GET /searchRevenuePayments).
 * @typedef {"DAY"|"LAST_7_DAYS"|"MONTH"|"YEAR"} RevenuePeriod
 */

/**
 * Pagamento (PUT /payPayments, /searchAppointmentPayments, /searchStatusPayments).
 * JSON em camelCase; valores BigDecimal chegam como number.
 * Datas em ISO 8601 com fuso, ex.: 2026-11-20T14:00:00-03:00.
 * @typedef {Object} Payment
 * @property {number} id
 * @property {number} idAppointment
 * @property {number} amount
 * @property {PaymentMethod} method
 * @property {PaymentStatus} status
 * @property {string|null} paidAt
 * @property {string} created
 */

/**
 * Linha da listagem (GET /listPayments). Já traz o nome do cliente e os serviços.
 * @typedef {Object} PaymentListItem
 * @property {number} id
 * @property {number} idAppointment
 * @property {string} clientName
 * @property {string} services Nomes dos serviços já concatenados pelo backend.
 * @property {string} appointmentDate Início do atendimento (ISO com fuso).
 * @property {number} amount
 * @property {PaymentMethod} method
 * @property {PaymentStatus} status
 * @property {string|null} paidAt
 * @property {string} created
 */

/**
 * Resumo do mês (GET /searchSummaryPayments?month=YYYY-MM).
 * @typedef {Object} PaymentSummary
 * @property {string} month YYYY-MM
 * @property {number} receivedMonth
 * @property {number} receivedPreviousMonth
 * @property {number|null} receivedChangePercent null quando não há base de comparação.
 * @property {number} pendingAmount
 * @property {number} pendingAppointments
 * @property {number|null} receiptRatePercent
 */

/**
 * Faturamento de um período (GET /searchRevenuePayments).
 * @typedef {Object} PaymentRevenue
 * @property {RevenuePeriod} period
 * @property {string} start
 * @property {string} end
 * @property {number} received
 * @property {number} receivedPrevious
 * @property {number|null} changePercent
 */

/**
 * PUT /payPayments.
 * @typedef {Object} PaymentPayPayload
 * @property {number} id
 * @property {PaymentMethod} method
 */

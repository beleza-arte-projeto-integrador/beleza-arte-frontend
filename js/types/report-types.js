/**
 * Filtros do relatório gerencial (GET /searchManagementReport).
 * Datas em YYYY-MM-DD (horário de Brasília). O período tem no máximo 366 dias.
 * Sem idProfessional o relatório é do salão inteiro.
 * @typedef {Object} ManagementReportFilters
 * @property {string} startDate
 * @property {string} endDate
 * @property {number|null} [idProfessional]
 */

/**
 * Linha do ranking de serviços (já vem ordenada pelo backend).
 * @typedef {Object} ManagementReportService
 * @property {number} idService
 * @property {string} name
 * @property {number} quantity
 * @property {number} revenue
 */

/**
 * Desempenho por profissional (já vem ordenado pelo backend).
 * @typedef {Object} ManagementReportProfessional
 * @property {number} idProfessional
 * @property {string} name
 * @property {number} services
 * @property {number} revenue
 * @property {number} cancelledServices
 * @property {number} noShowServices
 */

/**
 * Resposta 200 do relatório gerencial.
 * Percentuais já vêm calculados (12.5 = 12,5%): não multiplicar por 100.
 * Valores monetários em R$, como number.
 * @typedef {Object} ManagementReport
 * @property {string} startDate
 * @property {string} endDate
 * @property {number|null} idProfessional
 * @property {number} totalAppointments Agendamentos (visitas) com algum serviço no período.
 * @property {number} completedAppointments Status CONCLUIDO.
 * @property {number} cancelledAppointments Status CANCELADO.
 * @property {number} noShowAppointments Status NAO_COMPARECEU.
 * @property {number} cancellationRate
 * @property {number} noShowRate
 * @property {number} totalServices Serviços de agendamentos não cancelados e sem falta.
 * @property {number} expectedRevenue Faturamento previsto.
 * @property {number} completedRevenue Faturamento dos agendamentos concluídos.
 * @property {number} averageTicket
 * @property {number} uniqueClients
 * @property {number} availableMinutes
 * @property {number} bookedMinutes
 * @property {number|null} occupancyRate null quando nenhum profissional tem expediente cadastrado.
 * @property {ManagementReportService[]} services
 * @property {ManagementReportProfessional[]} professionals
 * @property {number[]} servicesByWeekday 7 posições: 0 = domingo … 6 = sábado.
 * @property {Object<string, number>} servicesByHour Chave "HH:mm", já em ordem.
 */

/**
 * Erro de validação (HTTP 422).
 * @typedef {Object} ManagementReportError
 * @property {string} code
 * @property {string} message
 */

// Cadastros (clientes, profissionais, serviços e recursos).
//
// Estas rotas SÓ são usadas no modo offline (npm run demo:offline). No modo
// híbrido (npm run demo) os cadastros vêm do backend real, porque não dependem
// da tabela de agendamentos. As regras seguem os services do backend; as
// mensagens são as mesmas que as telas já sabem traduzir.

const { MockHttpError, businessError, requiredParam, toId } = require("../lib/http");
const time = require("../lib/time");

const RESOURCE_TYPES = ["CADEIRA", "CABINE", "EQUIPAMENTO"];
const DATA_PURPOSE = "Name, phone and email are used only to identify the client, "
    + "manage appointments and send confirmations and reminders.";

const text = value => String(value ?? "").trim();
const contains = (value, search) => text(value).toLowerCase().includes(text(search).toLowerCase());
const equalsIgnoreCase = (value, search) => text(value).toLowerCase() === text(search).toLowerCase();
const digits = value => String(value ?? "").replace(/\D/g, "");
const sameInstant = (a, b) => Date.parse(a) === Date.parse(b);
const sortById = list => [...list].sort((a, b) => a.id - b.id);

/** Algum item de agendamento usa este registro? (o banco bloquearia a exclusão) */
const usedByItems = (store, field, id) => store.all("items").some(item => Number(item[field]) === Number(id));

function clientRoutes(store) {
    const list = predicate => ({ data: sortById(store.all("clients").filter(predicate)) });

    function validate(body) {
        if (!text(body.name)) throw businessError("Invalid client, The name is required");
        const phone = digits(body.phone);
        if (phone.length < 10 || phone.length > 11) throw businessError("Invalid client, The phone must have 10 or 11 digits");
        return { name: text(body.name), phone, email: text(body.email) || null };
    }

    function assertUniquePhone(phone, exceptId, message) {
        if (store.all("clients").some(client => client.phone === phone && client.id !== exceptId)) {
            throw new MockHttpError(409, message);
        }
    }

    function findOr404(id, message = "Could not find client!, The requested client was not found in the system!") {
        const client = store.find("clients", toId(id));
        if (!client) throw new MockHttpError(404, message);
        return client;
    }

    return [
        { method: "GET", path: "/searchNameClients", handler: async ({ query }) => list(client => contains(client.name, query.get("name"))) },
        { method: "GET", path: "/searchPhoneClients", handler: async ({ query }) => list(client => client.phone.includes(digits(query.get("phone")))) },
        { method: "GET", path: "/searchEmailClients", handler: async ({ query }) => list(client => contains(client.email, query.get("email"))) },
        { method: "GET", path: "/searchCreatedClients", handler: async ({ query }) => list(client => sameInstant(client.created, query.get("created"))) },
        {
            method: "POST",
            path: "/createClients",
            async handler({ body }) {
                const data = validate(body);
                assertUniquePhone(data.phone, null, "Could not create client, A client with this phone is already registered");
                return { status: 201, data: store.insert("clients", { ...data, created: time.nowIso() }) };
            }
        },
        {
            method: "PUT",
            path: "/updateClients",
            async handler({ body }) {
                const client = findOr404(body.id);
                const data = validate(body);
                assertUniquePhone(data.phone, client.id, "Could not update client, Another client is already registered with this phone");
                return { data: store.update("clients", client.id, data) };
            }
        },
        {
            method: "DELETE",
            path: "/deleteClients",
            async handler({ query }) {
                const client = findOr404(query.get("id"));
                if (store.all("appointments").some(appointment => appointment.idClient === client.id)) {
                    throw new MockHttpError(409, "Could not delete client, The client has appointments");
                }
                store.remove("clients", client.id);
                return { status: 204 };
            }
        },
        {
            method: "GET",
            path: "/exportClientsData",
            async handler({ query }) {
                const client = findOr404(query.get("id"));
                return {
                    data: { client, purpose: DATA_PURPOSE, generatedAt: time.nowIso() },
                    headers: { "Content-Disposition": `attachment; filename="cliente-${client.id}.json"` }
                };
            }
        },
        {
            method: "PUT",
            path: "/anonymizeClients",
            async handler({ query }) {
                const client = findOr404(query.get("id"), "Could not anonymize client, Check if the client exists");
                return { data: store.update("clients", client.id, { name: "Cliente anonimizado", phone: `ANON-${client.id}`, email: null }) };
            }
        }
    ];
}

function professionalRoutes(store) {
    const withoutPassword = ({ password, ...professional }) => professional;

    function list(predicate) {
        const found = store.all("professionals").filter(predicate);
        if (!found.length) throw businessError("Could not find professional!, The requested professional was not found in the system!");
        return { data: sortById(found).map(withoutPassword) };
    }

    function validate(body, exceptId) {
        if (!text(body.name)) throw businessError("Could not save professional, Name is required");
        const cpf = digits(body.cpf);
        if (cpf && cpf.length !== 11) throw businessError("Could not save professional, CPF must have 11 digits");
        const others = store.all("professionals").filter(professional => professional.id !== exceptId);
        if (cpf && others.some(professional => professional.cpf === cpf)) throw businessError("Could not save professional, A professional with this CPF is already registered");
        if (text(body.email) && others.some(professional => equalsIgnoreCase(professional.email, body.email))) {
            throw businessError("Could not save professional, A professional with this email is already registered");
        }
        if (text(body.username) && others.some(professional => equalsIgnoreCase(professional.username, body.username))) {
            throw businessError("Could not save professional, Username is already in use");
        }
        return {
            name: text(body.name),
            specialty: text(body.specialty) || null,
            phone: digits(body.phone) || null,
            email: text(body.email) || null,
            cpf: cpf || null,
            experienceYears: Number.parseInt(body.experienceYears, 10) || 0,
            username: text(body.username) || null,
            active: body.active === undefined || body.active === null ? true : Boolean(body.active)
        };
    }

    return [
        { method: "GET", path: "/searchName", handler: async ({ query }) => list(professional => contains(professional.name, query.get("name"))) },
        { method: "GET", path: "/searchEmail", handler: async ({ query }) => list(professional => contains(professional.email, query.get("email"))) },
        { method: "GET", path: "/searchPhone", handler: async ({ query }) => list(professional => digits(professional.phone).includes(digits(query.get("phone")))) },
        { method: "GET", path: "/searchSpecialty", handler: async ({ query }) => list(professional => equalsIgnoreCase(professional.specialty, query.get("specialty"))) },
        { method: "GET", path: "/searchCreated", handler: async ({ query }) => list(professional => sameInstant(professional.created, query.get("created"))) },
        {
            method: "POST",
            path: "/createProfessionals",
            async handler({ body }) {
                const data = validate(body, null);
                return { status: 201, data: withoutPassword(store.insert("professionals", { ...data, created: time.nowIso(), updated: null })) };
            }
        },
        {
            method: "PUT",
            path: "/updateProfessionals",
            async handler({ body }) {
                const professional = store.find("professionals", toId(body.id));
                if (!professional) throw new MockHttpError(404, "Could not update professional, Check if the professional exists");
                const data = validate({ ...professional, ...body }, professional.id);
                return { data: withoutPassword(store.update("professionals", professional.id, { ...data, updated: time.nowIso() })) };
            }
        },
        {
            method: "DELETE",
            path: "/deleteProfessionals",
            async handler({ query }) {
                const professional = store.find("professionals", toId(query.get("id")));
                if (!professional) throw new MockHttpError(404, "Could not delete professional, Check if the professional exists");
                if (usedByItems(store, "professional_id", professional.id)) {
                    throw businessError("Could not delete professional, The professional has appointments");
                }
                store.remove("professionals", professional.id);
                store.removeWhere("availability", range => range.professionalId === professional.id);
                return { status: 204 };
            }
        }
    ];
}

function serviceRoutes(store) {
    // Buscas de serviço sem resultado respondem 404, como o ServicesController.
    function list(predicate) {
        const found = store.all("services").filter(predicate);
        if (!found.length) throw new MockHttpError(404, "Service not found");
        return { data: sortById(found) };
    }

    function validate(body) {
        if (!text(body.name)) throw businessError("Invalid service, The name is required");
        const duration = Number(body.duration_minutes);
        if (!Number.isInteger(duration) || duration <= 0) throw businessError("Invalid service, The duration must be greater than zero");
        const price = Number(body.price);
        if (!Number.isFinite(price) || price < 0) throw businessError("Invalid service, The price cannot be negative");
        return { name: text(body.name), description: text(body.description) || null, category: text(body.category) || null, duration_minutes: duration, price };
    }

    function assertUniqueName(name, exceptId) {
        if (store.all("services").some(service => equalsIgnoreCase(service.name, name) && service.id !== exceptId)) {
            throw businessError("Could not save service, A service with this name is already registered");
        }
    }

    return [
        { method: "GET", path: "/service/searchName", handler: async ({ query }) => list(service => contains(service.name, query.get("name"))) },
        { method: "GET", path: "/service/searchDescription", handler: async ({ query }) => list(service => contains(service.description, query.get("description"))) },
        { method: "GET", path: "/service/searchDuration", handler: async ({ query }) => list(service => service.duration_minutes === Number(query.get("duration_minutes"))) },
        { method: "GET", path: "/service/searchPrice", handler: async ({ query }) => list(service => Number(service.price) === Number(query.get("price"))) },
        { method: "GET", path: "/service/searchCategory", handler: async ({ query }) => list(service => equalsIgnoreCase(service.category, query.get("category"))) },
        { method: "GET", path: "/service/searchCreated", handler: async ({ query }) => list(service => sameInstant(service.created, query.get("searchCreation"))) },
        {
            method: "POST",
            path: "/service/createServices",
            async handler({ body }) {
                const data = validate(body);
                assertUniqueName(data.name, null);
                return { status: 201, data: store.insert("services", { ...data, created: time.nowIso() }) };
            }
        },
        {
            method: "PUT",
            path: "/service/updateServices",
            async handler({ body }) {
                const service = store.find("services", toId(body.id));
                if (!service) throw new MockHttpError(404, "Service not found");
                const data = validate(body);
                assertUniqueName(data.name, service.id);
                return { data: store.update("services", service.id, data) };
            }
        },
        {
            method: "DELETE",
            path: "/service/deleteServices",
            async handler({ query }) {
                const service = store.find("services", toId(query.get("id")));
                if (!service) throw new MockHttpError(404, "Service not found");
                if (usedByItems(store, "service_id", service.id)) throw new MockHttpError(409, "Could not delete service, The service is used by appointments");
                store.remove("services", service.id);
                return { status: 204 };
            }
        }
    ];
}

function resourceRoutes(store) {
    const list = predicate => ({ data: sortById(store.all("resources").filter(predicate)) });

    function validate(body) {
        if (!text(body.name)) throw businessError("Invalid resource, The name is required");
        const type = text(body.type).toUpperCase();
        if (!RESOURCE_TYPES.includes(type)) throw businessError("Invalid resource, Use CADEIRA, CABINE or EQUIPAMENTO");
        return { name: text(body.name), type, active: body.active === undefined || body.active === null ? true : Boolean(body.active) };
    }

    return [
        { method: "GET", path: "/searchNameResources", handler: async ({ query }) => list(resource => contains(resource.name, query.get("name"))) },
        { method: "GET", path: "/searchTypeResources", handler: async ({ query }) => list(resource => equalsIgnoreCase(resource.type, query.get("type"))) },
        {
            method: "GET",
            path: "/searchActiveResources",
            handler: async ({ query }) => list(resource => resource.active === (text(requiredParam(query, "active")).toLowerCase() === "true"))
        },
        { method: "POST", path: "/createResources", handler: async ({ body }) => ({ status: 201, data: store.insert("resources", validate(body)) }) },
        {
            method: "PUT",
            path: "/updateResources",
            async handler({ body }) {
                const resource = store.find("resources", toId(body.id));
                if (!resource) throw businessError("Could not update resource, Check if the resource exists");
                return { data: store.update("resources", resource.id, validate(body)) };
            }
        },
        {
            method: "DELETE",
            path: "/deleteResources",
            async handler({ query }) {
                const resource = store.find("resources", toId(query.get("id")));
                if (!resource) throw businessError("Could not delete resource, Check if the resource exists");
                if (usedByItems(store, "resource_id", resource.id)) throw new MockHttpError(409, "Could not delete resource, The resource is used by appointments");
                store.remove("resources", resource.id);
                return { status: 204 };
            }
        }
    ];
}

function catalogRoutes({ store }) {
    return [...clientRoutes(store), ...professionalRoutes(store), ...serviceRoutes(store), ...resourceRoutes(store)];
}

module.exports = { catalogRoutes };

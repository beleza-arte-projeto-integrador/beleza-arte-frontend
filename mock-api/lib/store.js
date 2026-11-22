// Banco em memória do modo demonstração. Os dados voltam ao seed sempre que o
// servidor é reiniciado. Cada coleção tem seu próprio contador de id, como as
// colunas IDENTITY do PostgreSQL.

class Store {
    /** @param {Record<string, object[]>} seed */
    constructor(seed) {
        this.tables = {};
        this.nextIds = {};
        Object.entries(seed).forEach(([name, rows]) => {
            this.tables[name] = rows.map(row => ({ ...row }));
            this.nextIds[name] = rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
        });
    }

    all(table) {
        return this.tables[table];
    }

    find(table, id) {
        return this.tables[table].find(row => Number(row.id) === Number(id)) || null;
    }

    insert(table, row) {
        const saved = { ...row, id: this.nextIds[table]++ };
        this.tables[table].push(saved);
        return saved;
    }

    /** Substitui os campos do registro e devolve o registro atualizado (ou null). */
    update(table, id, changes) {
        const row = this.find(table, id);
        if (!row) return null;
        Object.assign(row, changes);
        return row;
    }

    remove(table, id) {
        const index = this.tables[table].findIndex(row => Number(row.id) === Number(id));
        if (index === -1) return false;
        this.tables[table].splice(index, 1);
        return true;
    }

    removeWhere(table, predicate) {
        this.tables[table] = this.tables[table].filter(row => !predicate(row));
    }
}

module.exports = { Store };

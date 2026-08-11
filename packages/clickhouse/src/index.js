"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clickhouse = void 0;
const client_1 = require("@clickhouse/client");
exports.clickhouse = (0, client_1.createClient)({
    url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DB || 'default',
});
//# sourceMappingURL=index.js.map
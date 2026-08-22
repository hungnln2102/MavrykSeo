/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testEnvironment: "node",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  moduleNameMapper: {
    "^@seo/core$": "<rootDir>/../../packages/seo-core/src/index.ts",
    "^@seo/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@seo/clickhouse$": "<rootDir>/../../packages/clickhouse/src/index.ts",
  },
};

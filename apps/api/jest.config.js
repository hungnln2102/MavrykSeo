// Ensure DATABASE_URL is set during Jest execution
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://seo:seo@localhost:5435/seo_platform';

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@seo/core$': '<rootDir>/../../packages/seo-core/src/index.ts',
  },
};
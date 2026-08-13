import { decryptToken, encryptToken, validateEncryptionConfiguration } from '@seo/core';
import { getJwtSecret, validateRuntimeSecrets } from './runtime-secrets';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;
const ORIGINAL_GSC_TOKEN_ENCRYPTION_KEY = process.env.GSC_TOKEN_ENCRYPTION_KEY;
const ORIGINAL_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function restoreEnvironment(): void {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  process.env.GSC_TOKEN_ENCRYPTION_KEY = ORIGINAL_GSC_TOKEN_ENCRYPTION_KEY;
  process.env.ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
}

describe('runtime secret configuration', () => {
  beforeEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.GSC_TOKEN_ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
  });

  afterAll(() => {
    restoreEnvironment();
  });

  it('uses a local-only JWT secret outside production when none is configured', () => {
    process.env.NODE_ENV = 'development';

    expect(getJwtSecret()).toBe('local-development-jwt-secret-not-for-production');
  });

  it('fails closed in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';

    expect(() => validateRuntimeSecrets()).toThrow(
      'JWT_SECRET must be configured before starting the API in production.',
    );
  });

  it('fails closed in production when the encryption key is missing', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'production-jwt-secret';

    expect(() => validateRuntimeSecrets()).toThrow(
      'GSC_TOKEN_ENCRYPTION_KEY or ENCRYPTION_KEY must be configured before encrypting credentials.',
    );
  });

  it('accepts configured production secrets and encrypts credentials with the configured key', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'production-jwt-secret';
    process.env.GSC_TOKEN_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    expect(() => validateRuntimeSecrets()).not.toThrow();
    const encrypted = encryptToken('refresh-token-value');

    expect(encrypted).not.toContain('refresh-token-value');
    expect(decryptToken(encrypted)).toBe('refresh-token-value');
  });

  it('does not allow encryption without an explicit configured key', () => {
    expect(() => validateEncryptionConfiguration()).toThrow(
      'GSC_TOKEN_ENCRYPTION_KEY or ENCRYPTION_KEY must be configured before encrypting credentials.',
    );
  });
});
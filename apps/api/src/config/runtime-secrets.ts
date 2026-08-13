import { validateEncryptionConfiguration } from '@seo/core';

const LOCAL_JWT_SECRET = 'local-development-jwt-secret-not-for-production';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) {
    return secret;
  }

  if (isProduction()) {
    throw new Error('JWT_SECRET must be configured before starting the API in production.');
  }

  return LOCAL_JWT_SECRET;
}

export function validateRuntimeSecrets(): void {
  getJwtSecret();

  if (isProduction()) {
    validateEncryptionConfiguration();
  }
}
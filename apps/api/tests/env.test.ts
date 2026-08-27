import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';

describe('AI environment mode', () => {
  it('allows deterministic mock AI outside production', () => {
    const env = loadEnv({ NODE_ENV: 'test', AI_PROVIDER: 'mock' });
    expect(env.AI_PROVIDER).toBe('mock');
  });

  it('rejects mock AI in production', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', AI_PROVIDER: 'mock' })).toThrow(
      'Mock AI cannot run in production',
    );
  });
});

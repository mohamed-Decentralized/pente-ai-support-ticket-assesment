import { describe, expect, it } from 'vitest';
import { ReportCacheService } from '../src/cache.service';

describe('report cache', () => {
  it('stores and reads values from the in-memory fallback', async () => {
    const cache = new ReportCacheService();
    await cache.set('report:test', { total: 3 }, 1000);
    expect(await cache.get('report:test')).toEqual({ total: 3 });
    expect(cache.backend()).toBe('memory');
  });

  it('expires values from the in-memory fallback', async () => {
    const cache = new ReportCacheService();
    await cache.set('report:expired', { total: 3 }, 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await cache.get('report:expired')).toBeUndefined();
  });
});

import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { createClient } from 'redis';
import { config } from './config';

@Injectable()
export class ReportCacheService implements OnModuleInit, OnModuleDestroy {
  private values = new Map<string, { value: unknown; expiresAt: number }>();
  private redis?: ReturnType<typeof createClient>;

  async onModuleInit() {
    if (!config.REDIS_URL) return;
    const client = createClient({
      url: config.REDIS_URL,
      disableOfflineQueue: true,
      socket: { connectTimeout: 750, reconnectStrategy: false },
    });
    client.on('error', () => undefined);
    try {
      await client.connect();
      this.redis = client;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(`Redis connection failed: ${message}`, 'ReportCacheService');
      if (client.isOpen) client.destroy();
    }
  }

  async onModuleDestroy() {
    if (this.redis?.isOpen)
      await this.redis.quit().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Redis quit failed: ${message}`, 'ReportCacheService');
        this.redis?.destroy();
      });
  }

  backend() {
    return this.redis?.isReady ? 'redis' : 'memory';
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.redis?.isReady) {
      try {
        const value = await this.redis.get(key);
        if (value) return JSON.parse(value) as T;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Redis get failed for key ${key}: ${message}`, 'ReportCacheService');
        this.redis.destroy();
        this.redis = undefined;
      }
    }
    const cached = this.values.get(key);
    if (!cached) return undefined;
    if (cached.expiresAt <= Date.now()) {
      this.values.delete(key);
      return undefined;
    }
    return cached.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number) {
    this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.redis?.isReady) {
      try {
        await this.redis.set(key, JSON.stringify(value), { PX: ttlMs });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Redis set failed for key ${key}: ${message}`, 'ReportCacheService');
        this.redis.destroy();
        this.redis = undefined;
      }
    }
  }
}

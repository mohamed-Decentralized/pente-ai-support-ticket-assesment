import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Response } from 'express';
import { ReportCacheService } from './cache.service';
import { Connection } from 'mongoose';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private connection: Connection,
    private cache: ReportCacheService,
  ) {}

  @Get('liveness')
  liveness() {
    return { status: 'ok', service: 'reporting' };
  }

  @Get('readiness')
  readiness(@Res({ passthrough: true }) response: Response) {
    const ready = this.connection.readyState === 1;
    response.status(ready ? 200 : 503);
    return {
      status: ready ? 'ready' : 'not_ready',
      service: 'reporting',
      database: ready ? 'connected' : 'unavailable',
      cache: this.cache.backend(),
    };
  }
}

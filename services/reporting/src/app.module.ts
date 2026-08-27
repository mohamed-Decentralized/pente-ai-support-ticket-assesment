import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportCacheService } from './cache.service';
import { config } from './config';
import { HealthController } from './health.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Ticket, TicketSchema } from './ticket.schema';

@Module({
  imports: [
    MongooseModule.forRoot(config.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }),
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),
  ],
  controllers: [ReportsController, HealthController],
  providers: [ReportsService, ReportCacheService],
})
export class AppModule {}

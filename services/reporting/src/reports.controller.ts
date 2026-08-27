import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@pente/shared';
import { JwtAuthGuard, Roles } from './auth.guard';
import { WebhookPreviewDto } from './report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private reports: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Ticket counts by status and priority' })
  overview() {
    return this.reports.overview();
  }

  @Get('agents')
  @ApiOperation({ summary: 'Assignment and resolution metrics by staff member' })
  agents(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1) throw new BadRequestException('page must be >= 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('limit must be between 1 and 100');
    return this.reports.agents(page, limit);
  }

  @Get('sla-breaches')
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: 'Breached and approaching SLA deadlines' })
  slaBreaches(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1) throw new BadRequestException('page must be >= 1');
    if (limit < 1 || limit > 100) throw new BadRequestException('limit must be between 1 and 100');
    return this.reports.slaBreaches(page, limit);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Daily ticket creation and resolution counts' })
  trends(@Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number) {
    if (days < 1 || days > 90) throw new BadRequestException('days must be between 1 and 90');
    return this.reports.trends(days);
  }

  @Post('webhook-preview')
  @ApiOperation({ summary: 'Validate and normalize an external payload without saving it' })
  webhookPreview(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        expectedType: WebhookPreviewDto,
      }),
    )
    payload: WebhookPreviewDto,
  ) {
    return this.reports.webhookPreview(payload);
  }
}

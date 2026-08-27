import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from './config';
import { HttpExceptionFilter } from './http-exception.filter';

const start = async () => {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: config.WEB_ORIGIN, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const openApi = new DocumentBuilder()
    .setTitle('Pente Reporting API')
    .setDescription('Read-mostly support ticket reporting and webhook normalization')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi));
  await app.listen(config.REPORTING_PORT);
  process.stdout.write(`reporting listening on ${config.REPORTING_PORT}\n`);
};

start().catch((error) => {
  process.stderr.write(
    `reporting startup failed: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exit(1);
});

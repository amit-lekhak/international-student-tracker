import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

// Import all Feature Controllers
import { AuthController } from '../modules/auth/auth.controller';
import { SchoolsController } from '../modules/schools/schools.controller';
import { ProgramsController } from '../modules/programs/programs.controller';
import { AgentsController } from '../modules/agents/agents.controller';
import { ApplicationsController } from '../modules/applications/applications.controller';

// Import Services to mock providers for DI
import { AuthService } from '../modules/auth/auth.service';
import { SchoolsService } from '../modules/schools/schools.service';
import { ProgramsService } from '../modules/programs/programs.service';
import { AgentsService } from '../modules/agents/agents.service';
import { ApplicationsService } from '../modules/applications/applications.service';

@Module({
  controllers: [
    AuthController,
    SchoolsController,
    ProgramsController,
    AgentsController,
    ApplicationsController,
  ],
  providers: [
    { provide: AuthService, useValue: {} },
    { provide: SchoolsService, useValue: {} },
    { provide: ProgramsService, useValue: {} },
    { provide: AgentsService, useValue: {} },
    { provide: ApplicationsService, useValue: {} },
  ],
})
class SwaggerExportModule {}

async function exportOpenApi() {
  console.log(
    '[OpenAPI Exporter] Bootstrapping in-memory OpenAPI Swagger document (0-DB dependency)...',
  );

  const app = await NestFactory.create(SwaggerExportModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('International Student Application Tracker API')
    .setDescription(
      'REST API and Grounded AI Diagnostic Agent for International Student Admissions & Partner Management',
    )
    .setVersion('1.0.0')
    .addCookieAuth('jwt', {
      type: 'apiKey',
      in: 'cookie',
      name: 'jwt',
      description: 'HTTP-only Session JWT Cookie',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer JWT token authorization',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write to backend/swagger.json
  const backendOutputPath = path.resolve(__dirname, '../../swagger.json');
  fs.writeFileSync(backendOutputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`[OpenAPI Exporter] Exported backend swagger JSON to: ${backendOutputPath}`);

  // Also write directly to frontend if directory exists
  const frontendOutputDir = path.resolve(__dirname, '../../../frontend/src/api');
  if (!fs.existsSync(frontendOutputDir)) {
    fs.mkdirSync(frontendOutputDir, { recursive: true });
  }
  const frontendOutputPath = path.resolve(frontendOutputDir, 'swagger.json');
  fs.writeFileSync(frontendOutputPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log(`[OpenAPI Exporter] Exported frontend swagger JSON to: ${frontendOutputPath}`);

  console.log('[OpenAPI Exporter] Export finished cleanly!');
  process.exit(0);
}

exportOpenApi().catch((err) => {
  console.error('[OpenAPI Exporter] Error exporting OpenAPI schema:', err);
  process.exit(1);
});

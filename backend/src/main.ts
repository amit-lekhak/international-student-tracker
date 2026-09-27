import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Middleware
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global Filters & Pipes
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Response Serializer Interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Swagger API Documentation
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
  SwaggerModule.setup('api/docs', app, document);

  // API endpoint for raw swagger JSON export
  app.getHttpAdapter().get('/api/docs-json', (req: any, res: any) => {
    res.json(document);
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`[NestJS] Application running on http://localhost:${port}`);
  console.log(`[Swagger] API Docs available at http://localhost:${port}/api/docs`);
}

bootstrap();

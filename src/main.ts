import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(app.get(Logger));
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());

    const config = new DocumentBuilder()
        .setTitle('EUDIPLO Service API')
        .setDescription(
            'This is the API documentation for the EUDIPLO Service, which provides credential issuance and verification services',
        )
        .setExternalDoc(
            'Documentation',
            'https://cre8.github.io/eudiplo/latest/',
        )
        .setVersion(process.env.VERSION ?? '0.0.1')
        .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description:
                'Enter your JWT token obtained from /auth/token endpoint',
            name: 'Authorization',
            in: 'header',
        })
        .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    if (process.env.SWAGGER_JSON) {
        writeFileSync(
            'swagger.json',
            JSON.stringify(documentFactory(), null, 2),
        );
        process.exit();
    } else {
        SwaggerModule.setup('/api', app, documentFactory, {
            swaggerOptions: {
                persistAuthorization: true, // Keep authorization between page refreshes
                displayRequestDuration: true, // Show request duration
                filter: true, // Enable filtering
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                // Additional convenience features
                deepLinking: true, // Enable deep linking for sharing authenticated URLs
                displayOperationId: false, // Cleaner operation display
                defaultModelsExpandDepth: 1, // Auto-expand request/response models
                defaultModelExpandDepth: 1,
                docExpansion: 'list', // Show all operations collapsed by default
                operationsSorter: 'alpha', // Sort operations alphabetically
                tagsSorter: 'alpha', // Sort tags alphabetically
            },
            customSiteTitle: 'EUDIPLO API Documentation',
        });
        await app.listen(process.env.PORT ?? 3000);
    }
}
void bootstrap();

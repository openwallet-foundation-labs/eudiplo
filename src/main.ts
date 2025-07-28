import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { writeFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';

/**
 * Bootstrap function to initialize the NestJS application.
 */
async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.enableCors();
    app.useGlobalPipes(new ValidationPipe());

    const configService = app.get(ConfigService);

    const config = new DocumentBuilder()
        .setTitle('EUDIPLO Service API')
        .setDescription(
            'This is the API documentation for the EUDIPLO Service, which provides credential issuance and verification services',
        )
        .setExternalDoc(
            'Documentation',
            'https://openwallet-foundation-labs.github.io/eudiplo/latest/',
        )
        .setVersion(process.env.VERSION ?? '0.0.1');
    // Add OAuth2 configuration - either external OIDC or integrated OAuth2 server
    const useExternalOIDC = configService.get<string>('OIDC');
    const publicUrl = configService.getOrThrow<string>('PUBLIC_URL');

    if (useExternalOIDC) {
        // External OIDC provider (e.g., Keycloak)
        const oidcIssuerUrl = configService.get<string>(
            'KEYCLOAK_INTERNAL_ISSUER_URL',
        );
        if (oidcIssuerUrl) {
            config.addOAuth2(
                {
                    type: 'openIdConnect',
                    openIdConnectUrl: `${oidcIssuerUrl}/.well-known/openid-configuration`,
                },
                'oauth2',
            );
        }
    } else {
        // Integrated OAuth2 server (Client Credentials Flow Only)
        if (publicUrl) {
            config.addOAuth2(
                {
                    type: 'oauth2',
                    flows: {
                        clientCredentials: {
                            tokenUrl: `${publicUrl}/auth/oauth2/token`,
                            scopes: {},
                        },
                    },
                },
                'oauth2',
            );
        }
    }

    const documentConfig = config.build();
    const documentFactory = () =>
        SwaggerModule.createDocument(app, documentConfig);

    if (process.env.SWAGGER_JSON) {
        writeFileSync(
            'swagger.json',
            JSON.stringify(documentFactory(), null, 2),
        );
        process.exit();
    } else {
        const swaggerOptions: any = {
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
        };

        // Add middleware to set cache-control headers for Swagger
        app.use('/api', (req, res, next) => {
            res.setHeader(
                'Cache-Control',
                'no-cache, no-store, must-revalidate',
            );
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            next();
        });

        SwaggerModule.setup('/api', app, documentFactory, swaggerOptions);
        await app.listen(process.env.PORT ?? 3000);
    }
}
void bootstrap();

import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { AppModule } from "./app.module";
import { ValidationErrorFilter } from "./shared/common/filters/validation-error.filter";

/**
 * TLS configuration options for HTTPS server.
 */
interface TlsOptions {
    cert: Buffer;
    key: Buffer;
    ca?: Buffer;
    passphrase?: string;
}

/**
 * Load TLS options from certificate and key files.
 * Returns undefined if TLS is not enabled or files are not found.
 */
function loadTlsOptions(): TlsOptions | undefined {
    const tlsEnabled = process.env.TLS_ENABLED?.toLowerCase() === "true";
    if (!tlsEnabled) {
        return undefined;
    }

    const certPath = process.env.TLS_CERT_PATH;
    const keyPath = process.env.TLS_KEY_PATH;
    const caPath = process.env.TLS_CA_PATH;

    if (!certPath || !keyPath) {
        console.warn(
            "⚠️ TLS_ENABLED is true but TLS_CERT_PATH or TLS_KEY_PATH is not set. Falling back to HTTP.",
        );
        return undefined;
    }

    if (!existsSync(certPath)) {
        console.warn(
            `⚠️ TLS certificate file not found: ${certPath}. Falling back to HTTP.`,
        );
        return undefined;
    }

    if (!existsSync(keyPath)) {
        console.warn(
            `⚠️ TLS key file not found: ${keyPath}. Falling back to HTTP.`,
        );
        return undefined;
    }

    const options: TlsOptions = {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
    };

    // Optional: Load CA certificate chain for client verification
    if (caPath && existsSync(caPath)) {
        options.ca = readFileSync(caPath);
    }

    // Optional: Passphrase for encrypted key files
    const passphrase = process.env.TLS_KEY_PASSPHRASE;
    if (passphrase) {
        options.passphrase = passphrase;
    }

    return options;
}

/**
 * Bootstrap function to initialize the NestJS application.
 */
async function bootstrap() {
    // Load TLS options if configured
    const tlsOptions = loadTlsOptions();
    const isTlsEnabled = tlsOptions !== undefined;

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
        snapshot: true,
        httpsOptions: tlsOptions,
    });

    // Use Pino logger for all NestJS logging (including built-in Logger instances)
    // This ensures LOG_LEVEL env var is respected across all services
    app.useLogger(app.get(Logger));

    // Set explicit body size limits (security best practice)
    app.useBodyParser("json", { limit: "10mb" });
    app.enableCors();

    // Global exception filter for ValidationError
    app.useGlobalFilters(
        new ValidationErrorFilter(),
        new AllExceptionsFilter(),
    );

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true, // required for discriminator instantiation
            whitelist: true,
            forbidUnknownValues: false, // avoid false positives on plain objects
            forbidNonWhitelisted: false,
            stopAtFirstError: false,
            validateCustomDecorators: true,
        }),
    );

    const configService = app.get(ConfigService);

    const config = new DocumentBuilder()
        .setTitle("EUDIPLO Service API")
        .setDescription(
            "This is the API documentation for the EUDIPLO Service, which provides credential issuance and verification services",
        )
        .setExternalDoc(
            "Documentation",
            "https://openwallet-foundation-labs.github.io/eudiplo/latest/",
        )
        .setOpenAPIVersion("3.1.0")
        .setVersion(process.env.VERSION ?? "main");
    // Add OAuth2 configuration - either external OIDC or integrated OAuth2 server
    const useExternalOIDC = configService.get<string>("OIDC");
    const publicUrl = configService.getOrThrow<string>("PUBLIC_URL");

    if (useExternalOIDC) {
        // External OIDC provider (e.g., Keycloak)
        const oidcIssuerUrl = configService.get<string>(
            "OIDC_INTERNAL_ISSUER_URL",
        );
        if (oidcIssuerUrl) {
            config.addOAuth2(
                {
                    type: "openIdConnect",
                    openIdConnectUrl: `${oidcIssuerUrl}/.well-known/openid-configuration`,
                },
                "oauth2",
            );
        }
    } else {
        // Integrated OAuth2 server (Client Credentials Flow Only)
        if (publicUrl) {
            config.addOAuth2(
                {
                    type: "oauth2",
                    flows: {
                        clientCredentials: {
                            tokenUrl: `${publicUrl}/oauth2/token`,
                            scopes: {},
                        },
                    },
                },
                "oauth2",
            );
        }
    }

    const documentConfig = config.build();
    const documentFactory = () =>
        cleanupOpenApiDoc(SwaggerModule.createDocument(app, documentConfig));

    if (process.env.DOC_GENERATE) {
        writeFileSync(
            "swagger.json",
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
                docExpansion: "list", // Show all operations collapsed by default
                operationsSorter: "alpha", // Sort operations alphabetically
                tagsSorter: "alpha", // Sort tags alphabetically
            },
            customSiteTitle: "EUDIPLO API Documentation",
        };

        // Add middleware to set cache-control headers for Swagger
        app.use("/api", (req, res, next) => {
            res.setHeader(
                "Cache-Control",
                "no-cache, no-store, must-revalidate",
            );
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            next();
        });

        SwaggerModule.setup("/api", app, documentFactory, swaggerOptions);

        // Security warnings for default credentials
        const logger =
            app.getHttpAdapter().getInstance().locals?.logger || console;
        const warnSecurityDefaults = () => {
            const usingDefaults: string[] = [];

            // Check for default JWT secret
            const jwtSecret = configService.get<string>("JWT_SECRET");
            if (jwtSecret === "supersecret") {
                usingDefaults.push("JWT_SECRET");
            }

            if (usingDefaults.length > 0) {
                logger.warn(
                    "🚨 SECURITY WARNING: Using default credentials for demo purposes!",
                );
                logger.warn(
                    `   Default values detected for: ${usingDefaults.join(", ")}`,
                );
                logger.warn(
                    "   🔧 Please set custom values in production environments",
                );
                logger.warn(
                    "   📖 See .env.example for configuration guidance",
                );
            }
        };
        const oidc = configService.get<string>("OIDC");
        if (!oidc) {
            warnSecurityDefaults();
        }

        await app.listen(process.env.PORT ?? 3000).then(() => {
            const port = process.env.PORT ?? 3000;
            const publicUrl = configService.get<string>("PUBLIC_URL");
            const version = process.env.VERSION ?? "main";
            const nodeEnv = process.env.NODE_ENV ?? "development";
            const protocol = isTlsEnabled ? "https" : "http";
            const baseUrl = publicUrl || `${protocol}://localhost:${port}`;

            logger.log("");
            logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.log("🚀 EUDIPLO Service Started Successfully");
            logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.log(`📦 Version:        ${version}`);
            logger.log(`🌍 Environment:    ${nodeEnv}`);
            logger.log(`🔌 Port:           ${port}`);
            logger.log(
                `🔒 TLS:            ${isTlsEnabled ? "Enabled" : "Disabled (use reverse proxy for HTTPS)"}`,
            );
            logger.log(`🌐 Public URL:     ${publicUrl || "Not configured"}`);
            logger.log("");
            logger.log("📚 API Documentation:");
            logger.log(`   → Swagger UI:   ${baseUrl}/api`);
            logger.log(
                `   → Full Docs:    https://openwallet-foundation-labs.github.io/eudiplo/latest/`,
            );
            logger.log("");
            logger.log("🏥 Health Check:");
            logger.log(`   → Endpoint:     ${baseUrl}/health`);
            logger.log("");
            logger.log("🔐 Authentication:");
            if (oidc) {
                logger.log(`   → Mode:         External OIDC`);
                logger.log(`   → Provider:     ${oidc}`);
            } else {
                logger.log(
                    `   → Mode:         Integrated OAuth2 (Client Credentials)`,
                );
                logger.log(`   → Token URL:    ${publicUrl}/oauth2/token`);
            }
        });
    }
}
void bootstrap();

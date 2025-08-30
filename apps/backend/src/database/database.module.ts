import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { join } from "path";

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (
                configService: ConfigService,
            ): TypeOrmModuleOptions => {
                const dbType = configService.get<"sqlite" | "postgres">(
                    "DB_TYPE",
                );

                const commonOptions = {
                    synchronize: true,
                    autoLoadEntities: true,
                };

                if (dbType === "postgres") {
                    return {
                        type: "postgres",
                        host: configService.getOrThrow<string>("DB_HOST"),
                        port: configService.getOrThrow<number>("DB_PORT"),
                        username:
                            configService.getOrThrow<string>("DB_USERNAME"),
                        password:
                            configService.getOrThrow<string>("DB_PASSWORD"),
                        database:
                            configService.getOrThrow<string>("DB_DATABASE"),
                        ...commonOptions,
                    };
                }

                return {
                    type: "sqlite",
                    database: join(
                        configService.getOrThrow<string>("FOLDER"),
                        "service.db",
                    ),
                    ...commonOptions,
                };
            },
        }),
    ],
})
export class DatabaseModule {}

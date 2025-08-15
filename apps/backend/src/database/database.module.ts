import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import * as Joi from "joi";
import { join } from "path";

export const DB_VALIDATION_SCHEMA = {
    DB_TYPE: Joi.string().valid("sqlite", "postgres").default("sqlite"),
    DB_HOST: Joi.string().when("DB_TYPE", {
        is: "sqlite",
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_PORT: Joi.number().when("DB_TYPE", {
        is: "sqlite",
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_USERNAME: Joi.string().when("DB_TYPE", {
        is: "sqlite",
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_PASSWORD: Joi.string().when("DB_TYPE", {
        is: "sqlite",
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
    DB_DATABASE: Joi.string().when("DB_TYPE", {
        is: "sqlite",
        then: Joi.optional(),
        otherwise: Joi.required(),
    }),
};

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

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoModule } from "../crypto/crypto.module";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity";
import { RegistrarController } from "./registrar.controller";
import { RegistrarService } from "./registrar.service";

/**
 * RegistrarModule is responsible for managing the registrar service.
 * It provides the RegistrarService and imports necessary modules.
 *
 * Registrar configuration can be:
 * - Set via API endpoints under /registrar/config
 * - Imported from config files (registrar.json in tenant folder)
 */
@Module({
    imports: [CryptoModule, TypeOrmModule.forFeature([RegistrarConfigEntity])],
    controllers: [RegistrarController],
    providers: [RegistrarService],
    exports: [RegistrarService],
})
export class RegistrarModule {}

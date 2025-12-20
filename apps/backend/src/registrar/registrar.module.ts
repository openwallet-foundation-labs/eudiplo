import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoModule } from "../crypto/crypto.module";
import { PresentationsModule } from "../verifier/presentations/presentations.module";
import { RegistrarEntity } from "./entities/registrar.entity";
import { RegistrarService } from "./registrar.service";

/**
 * RegistrarModule is responsible for managing the registrar service.
 * It provides the RegistrarService and imports necessary modules.
 */
@Module({
    imports: [
        CryptoModule,
        PresentationsModule,
        TypeOrmModule.forFeature([RegistrarEntity]),
    ],
    providers: [RegistrarService],
    exports: [RegistrarService],
})
export class RegistrarModule {}

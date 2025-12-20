import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { CryptoModule } from "../../crypto/crypto.module";
import { RegistrarModule } from "../../registrar/registrar.module";
import { SessionModule } from "../../session/session.module";
import { WebhookService } from "../../utils/webhook/webhook.service";
import { PresentationsModule } from "../presentations/presentations.module";
import { Oid4vpController } from "./oid4vp.controller";
import { Oid4vpService } from "./oid4vp.service";

@Module({
    imports: [
        CryptoModule,
        forwardRef(() => RegistrarModule),
        forwardRef(() => PresentationsModule),
        SessionModule,
        HttpModule,
    ],
    controllers: [Oid4vpController],
    providers: [Oid4vpService, WebhookService],
    exports: [Oid4vpService],
})
export class Oid4vpModule {}

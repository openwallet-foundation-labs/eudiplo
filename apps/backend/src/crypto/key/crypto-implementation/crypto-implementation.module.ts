import { Global, Module } from "@nestjs/common";
import { CryptoImplementationService } from "./crypto-implementation.service.js";

@Global()
@Module({
    providers: [CryptoImplementationService],
    exports: [CryptoImplementationService],
})
export class CryptoImplementationModule {}

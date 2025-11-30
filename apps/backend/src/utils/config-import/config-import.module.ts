import { Global, Module } from "@nestjs/common";
import { ConfigImportService } from "./config-import.service";

@Global()
@Module({
    providers: [ConfigImportService],
    exports: [ConfigImportService],
})
export class ConfigImportModule {}

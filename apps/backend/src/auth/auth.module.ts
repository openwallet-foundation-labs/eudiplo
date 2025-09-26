import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { ClientModule } from "./client/client.module";
import { JwtService } from "./jwt.service";
import { JwtStrategy } from "./jwt.strategy";
import { TenantModule } from "./tenant/tenant.module";
@Module({
    imports: [PassportModule, ConfigModule, TenantModule, ClientModule],
    providers: [JwtStrategy, JwtAuthGuard, JwtService, AuthService],
    controllers: [AuthController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}

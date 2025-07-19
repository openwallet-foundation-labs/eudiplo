import { Module } from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import { Oid4vpController } from './oid4vp.controller';
import { CryptoModule } from '../../crypto/crypto.module';
import { RegistrarModule } from '../../registrar/registrar.module';
import { PresentationsModule } from '../presentations/presentations.module';
import { SessionModule } from '../../session/session.module';
import { HttpModule } from '@nestjs/axios';
import { SessionLoggerService } from '../../utils/session-logger.service';
import { SessionLoggerInterceptor } from '../../utils/session-logger.interceptor';

@Module({
    imports: [
        CryptoModule,
        RegistrarModule,
        PresentationsModule,
        SessionModule,
        HttpModule,
    ],
    controllers: [Oid4vpController],
    providers: [Oid4vpService, SessionLoggerService, SessionLoggerInterceptor],
    exports: [Oid4vpService],
})
export class Oid4vpModule {}

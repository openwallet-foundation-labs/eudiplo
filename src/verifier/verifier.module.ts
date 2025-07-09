import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { RegistrarModule } from '../registrar/registrar.module';
import { SessionModule } from '../session/session.module';
import { HttpModule } from '@nestjs/axios';
import { PresentationsModule } from './presentations/presentations.module';
import { Oid4vpModule } from './oid4vp/oid4vp.module';

@Module({
    imports: [
        CryptoModule,
        RegistrarModule,
        SessionModule,
        HttpModule,
        PresentationsModule,
        Oid4vpModule,
    ],
})
export class VerifierModule {}

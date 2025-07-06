import { Module } from '@nestjs/common';
import { Oid4vpController } from './oid4vp/oid4vp.controller';
import { Oid4vpService } from './oid4vp/oid4vp.service';
import { CryptoModule } from 'src/crypto/crypto.module';
import { RegistrarModule } from 'src/registrar/registrar.module';
import { PresentationsModule } from './presentations/presentations.module';
import { SessionModule } from 'src/session/session.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    CryptoModule,
    PresentationsModule,
    RegistrarModule,
    SessionModule,
    HttpModule,
  ],
  providers: [Oid4vpService],
  controllers: [Oid4vpController],
  exports: [Oid4vpService],
})
export class VerifierModule {}

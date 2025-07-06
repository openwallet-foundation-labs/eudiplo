import { Module } from '@nestjs/common';
import { StatusListController } from './status-list.controller';
import { StatusListService } from './status-list.service';
import { CryptoModule } from '../../crypto/crypto.module';

@Module({
  imports: [CryptoModule],
  controllers: [StatusListController],
  providers: [StatusListService],
  exports: [StatusListService],
})
export class StatusListModule {}

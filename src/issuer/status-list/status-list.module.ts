import { Module } from '@nestjs/common';
import { StatusListController } from './status-list.controller';
import { StatusListService } from './status-list.service';
import { CryptoModule } from '../../crypto/crypto.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatusMapping } from './entities/status-mapping.entity';

@Module({
    imports: [CryptoModule, TypeOrmModule.forFeature([StatusMapping])],
    controllers: [StatusListController],
    providers: [StatusListService],
    exports: [StatusListService],
})
export class StatusListModule {}

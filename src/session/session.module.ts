import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { SessionController } from './session.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Session])],
    providers: [SessionService],
    exports: [SessionService],
    controllers: [SessionController],
})
export class SessionModule {}

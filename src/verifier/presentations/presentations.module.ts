import { forwardRef, Module } from '@nestjs/common';
import { PresentationManagementController } from './presentations.controller';
import { PresentationsService } from './presentations.service';
import { ResolverModule } from '../resolver/resolver.module';
import { HttpModule } from '@nestjs/axios';
import { Oid4vpModule } from '../oid4vp/oid4vp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresentationConfig } from './entities/presentation-config.entity';

@Module({
    imports: [
        ResolverModule,
        HttpModule,
        forwardRef(() => Oid4vpModule),
        TypeOrmModule.forFeature([PresentationConfig]),
    ],
    controllers: [PresentationManagementController],
    providers: [PresentationsService],
    exports: [PresentationsService],
})
export class PresentationsModule {}

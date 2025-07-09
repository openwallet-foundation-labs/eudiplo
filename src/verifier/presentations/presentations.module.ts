import { Module } from '@nestjs/common';
import { PresentationManagementController } from './presentations.controller';
import { PresentationsService } from './presentations.service';
import { ResolverModule } from '../resolver/resolver.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [ResolverModule, HttpModule],
    controllers: [PresentationManagementController],
    providers: [PresentationsService],
    exports: [PresentationsService],
})
export class PresentationsModule {}

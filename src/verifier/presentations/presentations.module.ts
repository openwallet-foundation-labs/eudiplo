import { Module } from '@nestjs/common';
import { PresentationsController } from './presentations.controller';
import { PresentationsService } from './presentations.service';
import { ResolverModule } from '../resolver/resolver.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [ResolverModule, HttpModule],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService],
})
export class PresentationsModule {}

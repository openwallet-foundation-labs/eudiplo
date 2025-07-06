import { Module } from '@nestjs/common';
import { ResolverService } from './resolver.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ResolverService],
  exports: [ResolverService],
})
export class ResolverModule {}

import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  main(): string {
    return 'EUDIPLO is up and running, more information at <a href="https://openwallet-foundation-labs.github.io/eudiplo/latest/">https://openwallet-foundation-labs.github.io/eudiplo/latest/</a>';
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return 'EUDIPLO is up and running, more information at <a href="https://cre8.github.io/eudiplo/latest/">https://cre8.github.io/eudiplo/latest/</a>';
    }
}

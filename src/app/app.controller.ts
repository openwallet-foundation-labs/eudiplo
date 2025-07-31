import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController(process.env.SWAGGER_ALL !== 'true')
@Controller()
export class AppController {
    @Get()
    getHello(): string {
        return 'EUDIPLO is up and running, more information at <a href="https://openwallet-foundation-labs.github.io/eudiplo/latest/">https://openwallet-foundation-labs.github.io/eudiplo/latest/</a>';
    }
}

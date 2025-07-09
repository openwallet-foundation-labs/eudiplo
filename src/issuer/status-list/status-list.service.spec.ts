import { Test, TestingModule } from '@nestjs/testing';
import { StatusListService } from './status-list.service';

describe('StatusListService', () => {
    let service: StatusListService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [StatusListService],
        }).compile();

        service = module.get<StatusListService>(StatusListService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

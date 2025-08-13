import { Test, type TestingModule } from '@nestjs/testing';
import { AuthorizeService } from './authorize.service';

describe('AuthorizeService', () => {
    let service: AuthorizeService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthorizeService],
        }).compile();

        service = module.get<AuthorizeService>(AuthorizeService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

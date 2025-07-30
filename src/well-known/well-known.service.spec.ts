import { Test, TestingModule } from '@nestjs/testing';
import { WellKnownService } from './well-known.service';
import { describe, beforeEach, it, expect } from 'vitest';

describe('WellKnownService', () => {
    let service: WellKnownService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WellKnownService],
        }).compile();

        service = module.get<WellKnownService>(WellKnownService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

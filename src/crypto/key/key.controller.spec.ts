import { Test, TestingModule } from '@nestjs/testing';
import { KeyController } from './key.controller';
import { beforeEach, describe, expect, it } from 'vitest';

describe('KeyController', () => {
    let controller: KeyController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [KeyController],
        }).compile();

        controller = module.get<KeyController>(KeyController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});

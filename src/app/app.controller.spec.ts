import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { describe, beforeEach, it, expect } from 'vitest';

describe('AppController', () => {
    let controller: AppController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
        }).compile();

        controller = module.get<AppController>(AppController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});

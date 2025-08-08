import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { WebhookService } from './webhook.service';

describe('WebhookService', () => {
    let service: WebhookService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [WebhookService],
        }).compile();

        service = module.get<WebhookService>(WebhookService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});

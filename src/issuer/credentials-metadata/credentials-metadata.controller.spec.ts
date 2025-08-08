import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { CredentialsMetadataController } from './credentials-metadata.controller';

describe('CredentialsMetadataController', () => {
    let controller: CredentialsMetadataController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CredentialsMetadataController],
        }).compile();

        controller = module.get<CredentialsMetadataController>(
            CredentialsMetadataController,
        );
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});

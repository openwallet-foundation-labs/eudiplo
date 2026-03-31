import { describe, it, expect } from 'vitest';
import { extractRawTokenFromSubmission } from './webhook.utils';

describe('Webhook Utils: extractRawTokenFromSubmission', () => {
    it('should return null if rawPayload is missing or invalid', () => {
        expect(extractRawTokenFromSubmission('test_id', null)).toBeNull();
        expect(extractRawTokenFromSubmission('test_id', {})).toBeNull();
        expect(extractRawTokenFromSubmission('test_id', { vp_token: 'token' })).toBeNull();
    });

    it('should return null if credentialId is not in descriptor_map', () => {
        const payload = {
            vp_token: 'some_token',
            presentation_submission: {
                descriptor_map: [{ id: 'other_id', path: '$' }],
            },
        };
        expect(extractRawTokenFromSubmission('test_id', payload)).toBeNull();
    });

    it('should extract a single string vp_token (Path: $)', () => {
        const payload = {
            vp_token: 'header.payload.signature',
            presentation_submission: {
                descriptor_map: [{ id: 'sca_credential', path: '$' }],
            },
        };
        expect(extractRawTokenFromSubmission('sca_credential', payload)).toBe('header.payload.signature');
    });

    it('should extract a single string vp_token (Path: $[0])', () => {
        const payload = {
            vp_token: 'header.payload.signature',
            presentation_submission: {
                descriptor_map: [{ id: 'age_credential', path: '$[0]' }],
            },
        };
        expect(extractRawTokenFromSubmission('age_credential', payload)).toBe('header.payload.signature');
    });

    it('should extract the correct token from an array of vp_tokens', () => {
        const payload = {
            vp_token: ['token_index_0', 'token_index_1', 'token_index_2'],
            presentation_submission: {
                descriptor_map: [
                    { id: 'age_credential', path: '$[0]' },
                    { id: 'sca_credential', path: '$[1]' },
                ],
            },
        };
        expect(extractRawTokenFromSubmission('sca_credential', payload)).toBe('token_index_1');
        expect(extractRawTokenFromSubmission('age_credential', payload)).toBe('token_index_0');
    });

    it('should safely return null on malformed JSON paths', () => {
        const payload = {
            vp_token: ['token1', 'token2'],
            presentation_submission: {
                descriptor_map: [{ id: 'broken_credential', path: 'invalid_path' }],
            },
        };
        expect(extractRawTokenFromSubmission('broken_credential', payload)).toBeNull();
    });
});
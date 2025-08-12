import {
	createExecutionContext,
	env,
	waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index';

describe('EUDIPLO Webhook', () => {
	it('responds with 404 for unknown routes', async () => {
		const request = new Request('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
		expect(await response.text()).toMatchInlineSnapshot(`"Not found"`);
	});

	it('accepts POST requests to /notify endpoint', async () => {
		const testData = {
			credentials: [{
				id: 'test-credential',
				values: {
					address: {
						locality: 'Berlin'
					}
				}
			}]
		};

		const request = new Request('http://example.com/notify', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(testData)
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('processes /process endpoint correctly', async () => {
		const testData = {
			credentials: [{
				id: 'test-credential',
				values: {
					address: {
						locality: 'Berlin'
					}
				}
			}]
		};

		const request = new Request('http://example.com/process', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(testData)
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		
		const result = await response.json();
		expect(result).toEqual({
			citizen: {
				town: 'You live in Berlin'
			}
		});
	});

	it('validates API key for /consume endpoint', async () => {
		const testData = { test: 'data' };

		// Test without API key
		const requestWithoutKey = new Request('http://example.com/consume', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(testData)
		});
		const ctx1 = createExecutionContext();
		const responseWithoutKey = await worker.fetch(requestWithoutKey);
		await waitOnExecutionContext(ctx1);
		expect(responseWithoutKey.status).toBe(401);

		// Test with correct API key
		const requestWithKey = new Request('http://example.com/consume', {
			method: 'POST',
			headers: { 
				'Content-Type': 'application/json',
				'x-api-key': 'foo-bar'
			},
			body: JSON.stringify(testData)
		});
		const ctx2 = createExecutionContext();
		const responseWithKey = await worker.fetch(requestWithKey);
		await waitOnExecutionContext(ctx2);
		expect(responseWithKey.status).toBe(200);
	});
});

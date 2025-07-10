/**
 * Assuming we receive a PID credentials with the address selectivly disclosed
 */
interface PresentedData {
	credentials: {
		id: string;
		values: {
			address: {
				locality: string;
			};
		};
	}[];
}

/**
 * Response for the citizen credential.
 */
interface ProcessResponse {
	citizen: {
		town: string;
	};
}

async function handleRequest(request: Request): Promise<Response> {
	const url = new URL(request.url);

	if (request.method === 'POST' && url.pathname === '/process') {
		const presented: PresentedData = await request.json();
		const res: ProcessResponse = {
			citizen: {
				town: `You live in ${presented.credentials[0].values.address.locality}`,
			},
		};
		return Response.json(res, { status: 200 });
	}

	if (request.method === 'POST' && url.pathname === '/consume') {
		const expextedApiKey = 'foo-bar'; // This should be securely stored and retrieved
		console.log(request.headers);
		const apiKey = request.headers.get('x-api-key');
		if (apiKey !== expextedApiKey) {
			return new Response('Unauthorized', { status: 401 });
		}

		const presented = await request.json();
		console.log('Received consume webhook:');
		console.log(JSON.stringify(presented, null, 2));
		return new Response(null, { status: 200 });
	}

	return new Response('Not found', { status: 404 });
}

export default {
	fetch: handleRequest,
};

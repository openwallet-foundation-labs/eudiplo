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
        }[];
    }[];
}

/**
 * Response for the citizen credential.
 */
type ProcessResponse = Record<string, Record<string, unknown>>;

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    let presented: PresentedData | undefined;

    // Only parse JSON for endpoints that expect it
    if (
        ["/notify", "/process", "/consume", "/request"].includes(url.pathname)
    ) {
        try {
            presented = await request.json();
        } catch (err) {
            console.log(err);
            return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
    }

    switch (url.pathname) {
        case "/notify": {
            console.log("Received notification:");
            console.log(JSON.stringify(presented, null, 2));
            return Response.json({ status: "ok" }, { status: 200 });
        }
        case "/process": {
            if (!presented?.credentials?.[0]?.values?.[0]?.address?.locality) {
                return Response.json(
                    { error: "Missing locality" },
                    { status: 400 },
                );
            }
            const res: ProcessResponse = {
                citizen: {
                    town: `You live in ${presented.credentials[0].values[0].address.locality}`,
                },
            };
            return Response.json(res, { status: 200 });
        }
        case "/consume": {
            const expectedApiKey = "foo-bar"; // Move to env/config in production
            const apiKey = request.headers.get("x-api-key");
            if (apiKey !== expectedApiKey) {
                return new Response("Unauthorized", { status: 401 });
            }
            console.log("Received consume webhook:");
            console.log(JSON.stringify(presented, null, 2));
            return Response.json({ status: "ok" }, { status: 200 });
        }
        case "/request": {
            console.log("Received request webhook:");
            console.log(JSON.stringify(presented, null, 2));
            const res: ProcessResponse = {
                citizen: {
                    town: "Berlin",
                },
            };
            return Response.json(res, { status: 200 });
        }
        default:
            return new Response("Not found", { status: 404 });
    }
}

export default {
    fetch: handleRequest,
};

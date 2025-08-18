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
type ProcessResponse = Record<string, Record<string, unknown>>;

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    /**
     * Endpoint to receive notifications.
     */
    if (request.method === "POST" && url.pathname === "/notify") {
        const presented: PresentedData = await request.json();
        console.log("Received notification:");
        console.log(JSON.stringify(presented, null, 2));
    }

    /**
     * Receive information and return the claims based on the presented data.
     */
    if (request.method === "POST" && url.pathname === "/process") {
        const presented: PresentedData = await request.json();
        const res: ProcessResponse = {
            citizen: {
                town: `You live in ${presented.credentials[0].values.address.locality}`,
            },
        };
        return Response.json(res, { status: 200 });
    }

    /**
     * Consume the presented data.
     */
    if (request.method === "POST" && url.pathname === "/consume") {
        const expectedApiKey = "foo-bar"; // This should be securely stored and retrieved
        const apiKey = request.headers.get("x-api-key");
        if (apiKey !== expectedApiKey) {
            return new Response("Unauthorized", { status: 401 });
        }

        const presented = await request.json();
        console.log("Received consume webhook:");
        console.log(JSON.stringify(presented, null, 2));
        return new Response(null, { status: 200 });
    }

    /**
     * Return the claims based on the session id.
     */
    if (request.method === "POST" && url.pathname === "/request") {
        const presented: PresentedData = await request.json();
        console.log("Received request webhook:");
        console.log(JSON.stringify(presented, null, 2));
        const res: ProcessResponse = {
            pid: {
                family_name: "Mustermann",
            },
        };
        return new Response(JSON.stringify(res), { status: 200 });
    }

    return new Response("Not found", { status: 404 });
}

export default {
    fetch: handleRequest,
};

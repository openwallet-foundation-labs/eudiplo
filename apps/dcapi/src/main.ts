export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/request-credential") {
      // Use secrets from env
      const instance = env.INSTANCE_URL;
      const clientId = env.CLIENT_ID;
      const clientSecret = env.CLIENT_SECRET;
      const presentationId = env.PRESENTATION_ID;

      // 1. Discover token endpoint
      const wellKnown = await fetch(`${instance}/.well-known/oauth-authorization-server`);
      if (!wellKnown.ok) return new Response("Failed to resolve .well-known", { status: 500 });
      const { token_endpoint } = await wellKnown.json();

      // 2. Get access token
      const tokenRes = await fetch(token_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret
        })
      });
      if (!tokenRes.ok) return new Response("Failed to obtain access token", { status: 500 });
      const { access_token } = await tokenRes.json();

      // 3. Create presentation request
      const pmReq = await fetch(`${instance}/presentation-management/request`, {
        method: "POST",
        headers: { authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: presentationId, response_type: "dc-api" })
      });
      if (!pmReq.ok) return new Response("Failed to obtain presentation request URI", { status: 500 });
      const { uri, session } = await pmReq.json();

      // Return only safe data to frontend
      return Response.json({ uri, session });
    }

    // Default: serve static assets
    return env.ASSETS.fetch(request);
  }
}
import { connect, Listener } from "@ngrok/ngrok";

let listener: Listener;

export async function setupTunnel(): Promise<void> {
    console.log("Setting up ngrok tunnel...");
    listener = await connect({
        addr: 3000,
        domain: import.meta.env.VITE_NGROK_DOMAIN,
        authtoken: import.meta.env.VITE_NGROK_AUTH_TOKEN,
    });
    console.log(`ngrok tunnel established at URL: ${listener.url()}`);
}

export async function teardownTunnel(): Promise<void> {
    if (listener) {
        await listener.close();
    }
}

import { connect, Listener } from "@ngrok/ngrok";
import { bin, ConfigHandler, install, Tunnel } from "cloudflared";
import { existsSync } from "fs";

let listener: Listener;

let tunnel: Tunnel;

export async function setupTunnel(): Promise<void> {
    if (import.meta.env.VITE_CLOUDFLARED_AUTH_TOKEN) {
        console.log("Setting up cloudflared tunnel...");

        if (!existsSync(bin)) {
            // install cloudflared binary
            await install(bin);
        }
        tunnel = Tunnel.withToken(import.meta.env.VITE_CLOUDFLARED_AUTH_TOKEN);

        new ConfigHandler(tunnel);

        return new Promise((resolvePromise) => {
            tunnel.on("url", (url) => {
                console.log("Tunnel is ready at", url);
                resolvePromise();
            });
        });
    } else if (import.meta.env.VITE_NGROK_AUTH_TOKEN) {
        console.log("Setting up ngrok tunnel...");
        listener = await connect({
            addr: 3000,
            domain: import.meta.env.VITE_DOMAIN,
            authtoken: import.meta.env.VITE_NGROK_AUTH_TOKEN,
        });
        console.log(`ngrok tunnel established at URL: ${listener.url()}`);
    }
}

export async function teardownTunnel(): Promise<void> {
    if (listener) {
        await listener.close();
    }
    if (tunnel) {
        tunnel.stop();
    }
}

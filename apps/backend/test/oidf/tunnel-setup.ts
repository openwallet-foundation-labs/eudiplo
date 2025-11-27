import { connect, Listener } from "@ngrok/ngrok";
import { ConfigHandler, Tunnel } from "cloudflared";

let listener: Listener;

let tunnel: Tunnel;

export function setupTunnel(): Promise<void> {
    return new Promise((resolvePromise) => {
        if (import.meta.env.VITE_CLOUDFLARED_AUTH_TOKEN) {
            console.log("Setting up cloudflared tunnel...");
            tunnel = Tunnel.withToken(
                import.meta.env.VITE_CLOUDFLARED_AUTH_TOKEN,
            );

            new ConfigHandler(tunnel);

            tunnel.on("url", (url) => {
                console.log("Tunnel is ready at", url);
                resolvePromise();
            });
        } else if (import.meta.env.VITE_NGROK_AUTH_TOKEN) {
            console.log("Setting up ngrok tunnel...");
            connect({
                addr: 3000,
                domain: import.meta.env.VITE_DOMAIN,
                authtoken: import.meta.env.VITE_NGROK_AUTH_TOKEN,
            }).then((l) => {
                listener = l;
                console.log(
                    `ngrok tunnel established at URL: ${listener.url()}`,
                );
                resolvePromise();
            });
        } else {
            resolvePromise();
        }
    });
}

export async function teardownTunnel(): Promise<void> {
    if (listener) {
        await listener.close();
    }
    if (tunnel) {
        tunnel.stop();
    }
}

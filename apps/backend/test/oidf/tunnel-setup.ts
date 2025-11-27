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

            handler.on("config", ({ config }) => {
                console.log("Config", config);
            });

            tunnel.on("url", (url) => {
                console.log("Tunnel is ready at", url);
                resolvePromise();
            });

            tunnel.on("connected", (connection) => {
                console.log("Connected to", connection);
            });

            tunnel.on("disconnected", (connection) => {
                console.log("Disconnected from", connection);
            });

            tunnel.on("stdout", (data) => {
                console.log("Tunnel stdout", data);
            });

            tunnel.on("stderr", (data) => {
                console.error("Tunnel stderr", data);
            });

            tunnel.on("exit", (code, signal) => {
                console.log(
                    "Tunnel exited with code",
                    code,
                    "and signal",
                    signal,
                );
            });

            tunnel.on("error", (error) => {
                console.error("Error", error);
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

import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { delimiter, join } from "node:path";
import { redactUrl } from "./url.js";

export interface BrowserLauncher {
    command: string;
    args: string[];
}

export interface LauncherEnvironment {
    platform: NodeJS.Platform;
    env: NodeJS.ProcessEnv;
    /** Resolves an executable name on PATH, or undefined when absent. */
    which: (name: string) => Promise<string | undefined>;
}

/**
 * Only web URLs are ever handed to a launcher. Instance URLs are validated
 * when they are registered, but a hand-edited config must not be able to turn
 * `open` into "run whatever this file:// or custom-scheme URL points at".
 */
export function assertWebUrl(value: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error(`${redactUrl(value)} is not a valid absolute URL.`);
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error(
            `Refusing to open ${redactUrl(value)}: only http and https URLs are supported.`,
        );
    }
    return url;
}

/**
 * Picks how to open a URL in a browser, or returns undefined when this
 * environment has no usable browser (SSH sessions, containers, CI). Every
 * launcher receives the URL as a single argv entry; no shell ever parses it.
 */
export async function chooseLauncher(
    url: string,
    { platform, env, which }: LauncherEnvironment,
): Promise<BrowserLauncher | undefined> {
    // $BROWSER is the conventional user override. Only a bare command is
    // honoured; anything with arguments or placeholders is ignored rather
    // than split, so the value is never interpreted by a shell.
    const browser = env.BROWSER?.trim();
    if (browser && !/\s|%s/.test(browser)) {
        const command = await which(browser);
        if (command) {
            return { command, args: [url] };
        }
    }

    if (platform === "darwin") {
        return { command: "open", args: [url] };
    }

    if (platform === "win32") {
        // Avoids `cmd /c start`, where "&" in a query string would be parsed.
        return {
            command: "rundll32.exe",
            args: ["url.dll,FileProtocolHandler", url],
        };
    }

    // WSL: open the Windows browser when wslu is installed.
    if (env.WSL_DISTRO_NAME) {
        const wslview = await which("wslview");
        if (wslview) {
            return { command: wslview, args: [url] };
        }
    }

    if (env.DISPLAY || env.WAYLAND_DISPLAY) {
        const xdgOpen = await which("xdg-open");
        if (xdgOpen) {
            return { command: xdgOpen, args: [url] };
        }
    }

    return undefined;
}

/**
 * Starts the launcher detached. Resolves true once it has been spawned and
 * false when it could not be started, so the caller can fall back to
 * printing the URL.
 */
export function launchBrowser(launcher: BrowserLauncher): Promise<boolean> {
    return new Promise((resolveLaunch) => {
        const child = spawn(launcher.command, launcher.args, {
            detached: true,
            stdio: "ignore",
        });
        child.once("error", () => resolveLaunch(false));
        child.once("spawn", () => {
            child.unref();
            resolveLaunch(true);
        });
    });
}

export function pathLookup(
    env: NodeJS.ProcessEnv,
    platform: NodeJS.Platform = process.platform,
): (name: string) => Promise<string | undefined> {
    const extensions =
        platform === "win32"
            ? ["", ...(env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")]
            : [""];
    return async (name) => {
        const entries = (env.PATH ?? "").split(delimiter).filter(Boolean);
        for (const entry of entries) {
            for (const extension of extensions) {
                const candidate = join(entry, `${name}${extension}`);
                try {
                    await access(candidate);
                    return candidate;
                } catch {
                    // keep looking
                }
            }
        }
        return undefined;
    };
}

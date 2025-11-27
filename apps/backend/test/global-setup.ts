import { setupTunnel, teardownTunnel } from "./oidf/tunnel-setup";

export async function setup() {
    await setupTunnel();
}

export async function teardown() {
    await teardownTunnel();
}

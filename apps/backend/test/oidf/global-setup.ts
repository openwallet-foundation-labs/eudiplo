import { setupTunnel, teardownTunnel } from "./tunnel-setup";

export async function setup() {
    await setupTunnel();
}

export async function teardown() {
    await teardownTunnel();
}

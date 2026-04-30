import { describe, expect, it, vi } from "vitest";

vi.mock("node:os", () => ({
  totalmem: () => 16_000,
  freemem: () => 6_000,
  hostname: () => "omnivideo-dev",
  uptime: () => 123,
  loadavg: () => [0.2, 0.3, 0.4],
  cpus: () => [
    {
      model: "Mock CPU",
      times: { user: 10, nice: 0, sys: 5, idle: 85, irq: 0 },
    },
  ],
  networkInterfaces: () => ({
    lo0: [
      {
        family: "IPv4",
        internal: true,
        address: "127.0.0.1",
        mac: "00:00:00:00:00:00",
      },
    ],
  }),
}));

import { GET } from "./route";

describe("system snapshot API", () => {
  it("returns lightweight process and system metrics", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.system.cpu.model).toBe("Mock CPU");
    expect(payload.data.system.memory.usedBytes).toBe(10_000);
    expect(payload.data.system.networkInterfaces[0].name).toBe("lo0");
  });
});

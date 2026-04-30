import * as os from "node:os";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CpuTimes = {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
};

function getCpuUsagePercent() {
  const cpus = os.cpus();
  const totals = cpus.reduce(
    (acc, cpu) => {
      const t = cpu.times as CpuTimes;
      const total = t.user + t.nice + t.sys + t.idle + t.irq;
      acc.total += total;
      acc.idle += t.idle;
      return acc;
    },
    { total: 0, idle: 0 },
  );
  if (!totals.total) return null;
  return Number((((totals.total - totals.idle) / totals.total) * 100).toFixed(2));
}

export async function GET() {
  try {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsed = memTotal - memFree;
    const network = os.networkInterfaces();

    return NextResponse.json({
      ok: true,
      data: {
        capturedAt: new Date().toISOString(),
        process: {
          pid: process.pid,
          nodeVersion: process.version,
          uptimeSec: Math.floor(process.uptime()),
          memory: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          threadpoolSize: Number(process.env.UV_THREADPOOL_SIZE ?? 4),
          platform: process.platform,
          arch: process.arch,
        },
        system: {
          hostname: os.hostname(),
          uptimeSec: os.uptime(),
          loadAvg: os.loadavg(),
          cpu: {
            model: os.cpus()[0]?.model ?? "unknown",
            cores: os.cpus().length,
            usagePercentApprox: getCpuUsagePercent(),
          },
          memory: {
            totalBytes: memTotal,
            freeBytes: memFree,
            usedBytes: memUsed,
            usedPercent: Number(((memUsed / memTotal) * 100).toFixed(2)),
          },
          networkInterfaces: Object.entries(network).map(([name, infos]) => ({
            name,
            addresses: (infos ?? []).map((info) => ({
              family: info.family,
              internal: info.internal,
              address: info.address,
              mac: info.mac,
            })),
          })),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_SYSTEM_SNAPSHOT_FAILED",
        error:
          error instanceof Error ? error.message : "System snapshot failed.",
      },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedVersion: string | null = null;

function getBuildId(): string {
  if (cachedVersion) return cachedVersion;
  
  try {
    // Leer BUILD_ID generado por Next.js en cada build
    const buildIdPath = join(process.cwd(), '.next', 'BUILD_ID');
    const raw = readFileSync(buildIdPath, 'utf-8').trim();
    cachedVersion = raw;
    return raw;
  } catch {
    // Fallback: usar un timestamp del arranque del servidor
    cachedVersion = `deploy-${Date.now()}`;
    return cachedVersion;
  }
}

export async function GET() {
  const buildId = getBuildId();
  return NextResponse.json(
    { buildId, timestamp: Date.now() },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    }
  );
}

/**
 * API service layer.
 *
 * In development, VITE_API_URL is empty — Vite's dev proxy rewrites
 * /v1/* → http://localhost:8077/v1/* (see vite.config.js).
 *
 * In production, set VITE_API_URL=http://your-backend:8077
 */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(method, path, body, signal) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`);
  }

  return res.json();
}

/**
 * Poll a task-result endpoint until the task completes or times out.
 * Throws DOMException('AbortError') when signal fires.
 */
async function pollResult(taskId, resultPath, signal, maxWaitMs = 60_000) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    await sleep(2_000);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const res = await request('GET', `${resultPath}/${taskId}`, undefined, signal);

    if (res.status === 'completed') return res.result;
    if (res.status === 'failed')    throw new Error(`Task failed: ${res.error ?? taskId}`);
    // pending / running → keep polling
  }

  throw new Error('Health check timed out (60s)');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  /** Run all SSH checks for a server. Returns array of HealthCheckResult. */
  runAllSSH: async (server, signal) => {
    const { task_id } = await request(
      'POST', '/v1/ssh/check/all/run', { server }, signal,
    );
    return pollResult(task_id, '/v1/ssh/result', signal);
  },

  /** Run all API checks for a server. Returns array of HealthCheckResult. */
  runAllAPI: async (server, signal) => {
    const { task_id } = await request(
      'POST', '/v1/api-checks/check/all/run', { server }, signal,
    );
    return pollResult(task_id, '/v1/api-checks/result', signal);
  },

  /** Run a single SSH check. Returns one HealthCheckResult. */
  runSSHCheck: async (server, checkName, signal) => {
    const { task_id } = await request(
      'POST', `/v1/ssh/check/${checkName}`, { server }, signal,
    );
    const results = await pollResult(task_id, '/v1/ssh/result', signal);
    // bulk endpoint returns array; single endpoint returns one object
    return Array.isArray(results) ? results[0] : results;
  },

  /** Run a single API check. Returns one HealthCheckResult. */
  runAPICheck: async (server, checkName, signal) => {
    const { task_id } = await request(
      'POST', `/v1/api-checks/check/${checkName}`, { server }, signal,
    );
    const results = await pollResult(task_id, '/v1/api-checks/result', signal);
    return Array.isArray(results) ? results[0] : results;
  },

  /** Registered check names per layer. */
  registry: (signal) => request('GET', '/v1/checks/registry', undefined, signal),
};

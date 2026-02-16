/**
 * E2E tests — spawn actual MCP server process, communicate via JSON-RPC over stdio
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

const SERVER_PATH = resolve(import.meta.dirname, "../../dist/index.js");

/** Per-request timeout (CI can be slow on first tool call due to lazy index init) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Max time to wait for server to start (BCD JSON ~80MB parse can be slow on CI) */
const SERVER_READY_TIMEOUT_MS = 60_000;

/** Send a JSON-RPC request and collect all JSON responses */
function createClient() {
  let proc: ChildProcess;
  let buffer = "";
  const responses: Map<number, (value: unknown) => void> = new Map();

  return {
    /**
     * Start the server process and wait for it to be ready.
     * The server emits "web-compat-mcp server running via stdio" on stderr when ready.
     */
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        proc = spawn("node", [SERVER_PATH], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stderrBuf = "";
        const timeoutId = setTimeout(() => {
          reject(
            new Error(
              `Server did not become ready within ${SERVER_READY_TIMEOUT_MS}ms. stderr: ${stderrBuf}`
            )
          );
        }, SERVER_READY_TIMEOUT_MS);

        proc.stderr!.on("data", (data: Buffer) => {
          stderrBuf += data.toString();
          if (stderrBuf.includes("web-compat-mcp server running")) {
            clearTimeout(timeoutId);
            resolve();
          }
        });

        proc.on("error", (err) => {
          clearTimeout(timeoutId);
          reject(err);
        });

        proc.on("exit", (code) => {
          if (code !== null && code !== 0) {
            clearTimeout(timeoutId);
            reject(new Error(`Server exited with code ${code}. stderr: ${stderrBuf}`));
          }
        });

        proc.stdout!.on("data", (data: Buffer) => {
          buffer += data.toString();
          // Parse newline-delimited JSON
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed);
              if (msg.id !== undefined && responses.has(msg.id)) {
                responses.get(msg.id)!(msg);
                responses.delete(msg.id);
              }
            } catch {
              // not valid JSON, skip
            }
          }
        });
      });
    },

    async send(id: number, method: string, params: unknown = {}): Promise<unknown> {
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      proc.stdin!.write(msg);

      return new Promise((resolve, reject) => {
        responses.set(id, resolve);
        setTimeout(() => {
          responses.delete(id);
          reject(new Error(`Timeout waiting for response id=${id}`));
        }, REQUEST_TIMEOUT_MS);
      });
    },

    stop() {
      proc.stdin!.end();
      proc.kill();
    },
  };
}

describe("MCP Server E2E", () => {
  let client: ReturnType<typeof createClient>;

  beforeAll(async () => {
    client = createClient();

    // Wait for server to finish loading BCD data and become ready
    await client.start();

    // Initialize MCP session
    const initResult = await client.send(0, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e-test", version: "1.0" },
    });
    expect(initResult).toBeDefined();
  });

  afterAll(() => {
    client.stop();
  });

  it("should list all 7 tools", async () => {
    const response = (await client.send(1, "tools/list")) as {
      result: { tools: Array<{ name: string }> };
    };
    const toolNames = response.result.tools.map((t) => t.name);
    expect(toolNames).toContain("compat_check");
    expect(toolNames).toContain("compat_search");
    expect(toolNames).toContain("compat_get_baseline");
    expect(toolNames).toContain("compat_list_baseline");
    expect(toolNames).toContain("compat_compare");
    expect(toolNames).toContain("compat_list_browsers");
    expect(toolNames).toContain("compat_check_support");
    expect(toolNames).toHaveLength(7);
  });

  it("compat_check — should return data for api.fetch", async () => {
    const response = (await client.send(2, "tools/call", {
      name: "compat_check",
      arguments: { feature: "api.fetch", response_format: "json" },
    })) as { result: { structuredContent: { id: string; support: Record<string, unknown> } } };

    const content = response.result.structuredContent;
    expect(content.id).toBe("api.fetch");
    expect(content.support).toBeDefined();
    expect(content.support.chrome).toBeDefined();
  });

  it("compat_check — should handle not found", async () => {
    const response = (await client.send(3, "tools/call", {
      name: "compat_check",
      arguments: { feature: "api.NonExistent12345" },
    })) as { result: { content: Array<{ text: string }> } };

    expect(response.result.content[0].text).toContain("not found");
  });

  it("compat_search — should find features", async () => {
    const response = (await client.send(4, "tools/call", {
      name: "compat_search",
      arguments: { query: "push", category: "api", limit: 5, response_format: "json" },
    })) as { result: { structuredContent: { total: number; features: unknown[] } } };

    const content = response.result.structuredContent;
    expect(content.total).toBeGreaterThan(0);
    expect(content.features.length).toBeLessThanOrEqual(5);
  });

  it("compat_get_baseline — should return baseline for fetch", async () => {
    const response = (await client.send(5, "tools/call", {
      name: "compat_get_baseline",
      arguments: { feature: "fetch", response_format: "json" },
    })) as { result: { structuredContent: { id: string; baseline: { status: string } } } };

    const content = response.result.structuredContent;
    expect(content.id).toBe("fetch");
    expect(["high", "low", false]).toContain(content.baseline.status);
  });

  it("compat_list_baseline — should list features", async () => {
    const response = (await client.send(6, "tools/call", {
      name: "compat_list_baseline",
      arguments: { status: "high", limit: 3, response_format: "json" },
    })) as { result: { structuredContent: { total: number; features: unknown[] } } };

    const content = response.result.structuredContent;
    expect(content.total).toBeGreaterThan(0);
    expect(content.features.length).toBeLessThanOrEqual(3);
  });

  it("compat_compare — should compare features", async () => {
    const response = (await client.send(7, "tools/call", {
      name: "compat_compare",
      arguments: {
        features: ["api.fetch", "api.XMLHttpRequest"],
        response_format: "json",
      },
    })) as { result: { structuredContent: { features: Array<{ id: string }> } } };

    const content = response.result.structuredContent;
    expect(content.features).toHaveLength(2);
    expect(content.features[0].id).toBe("api.fetch");
    expect(content.features[1].id).toBe("api.XMLHttpRequest");
  });

  it("compat_list_browsers — should return browsers", async () => {
    const response = (await client.send(8, "tools/call", {
      name: "compat_list_browsers",
      arguments: { response_format: "json" },
    })) as { result: { structuredContent: { total: number; browsers: unknown[] } } };

    const content = response.result.structuredContent;
    expect(content.total).toBeGreaterThan(10);
    expect(content.browsers.length).toBeGreaterThan(10);
  });

  it("compat_check_support — should find features for chrome 120 CSS", async () => {
    const response = (await client.send(9, "tools/call", {
      name: "compat_check_support",
      arguments: {
        browser: "chrome",
        version: "120",
        category: "css",
        limit: 5,
        response_format: "json",
      },
    })) as { result: { structuredContent: { total: number; features: unknown[] } } };

    const content = response.result.structuredContent;
    expect(content.total).toBeGreaterThan(0);
    expect(content.features.length).toBeLessThanOrEqual(5);
  });

  it("compat_check — markdown format should return valid markdown", async () => {
    const response = (await client.send(10, "tools/call", {
      name: "compat_check",
      arguments: { feature: "css.properties.grid", response_format: "markdown" },
    })) as { result: { content: Array<{ text: string }> } };

    const text = response.result.content[0].text;
    expect(text).toContain("# css.properties.grid");
    expect(text).toContain("Browser Support");
    expect(text).toContain("| Browser |");
  });
});

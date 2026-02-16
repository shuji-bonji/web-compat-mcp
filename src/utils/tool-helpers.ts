/**
 * Shared tool response helpers
 *
 * Reduces boilerplate across tool registrations.
 */

import { ResponseFormat } from "../constants.js";
import { truncateIfNeeded } from "./formatter.js";

/** Standard MCP tool text content */
export interface TextContent {
  type: "text";
  text: string;
}

/** Build a text-only tool response */
export function textResponse(text: string): { content: TextContent[] } {
  return { content: [{ type: "text" as const, text }] };
}

/** Build a JSON tool response with both text and structuredContent */
export function jsonResponse(data: Record<string, unknown>): {
  content: TextContent[];
  structuredContent: Record<string, unknown>;
} {
  const text = JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text: truncateIfNeeded(text) }],
    structuredContent: data,
  };
}

/** Build a markdown tool response */
export function markdownResponse(markdown: string): { content: TextContent[] } {
  return { content: [{ type: "text" as const, text: truncateIfNeeded(markdown) }] };
}

/**
 * Build paginated output object with next_offset
 */
export function paginatedOutput<T>(
  base: Record<string, unknown>,
  items: T[],
  total: number,
  offset: number,
  hasMore: boolean
): Record<string, unknown> {
  return {
    ...base,
    total,
    count: items.length,
    offset,
    has_more: hasMore,
    ...(hasMore ? { next_offset: offset + items.length } : {}),
  };
}

/**
 * Format response based on response_format parameter
 */
export function formatToolResponse(
  responseFormat: string | undefined,
  data: Record<string, unknown>,
  formatMarkdown: () => string
): { content: TextContent[]; structuredContent?: Record<string, unknown> } {
  if (responseFormat === ResponseFormat.JSON) {
    return jsonResponse(data);
  }
  return markdownResponse(formatMarkdown());
}

/**
 * Error handling utilities
 */

export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: Unexpected error occurred: ${String(error)}`;
}

export function featureNotFoundError(featureId: string): string {
  // Suggest possible corrections
  const suggestions: string[] = [];

  if (!featureId.includes(".")) {
    suggestions.push(
      `BCD identifiers use dot notation. Try: "api.${featureId}", "css.properties.${featureId}", or "javascript.builtins.${featureId}"`
    );
  }

  if (featureId.includes("-")) {
    const camelCase = featureId.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    suggestions.push(`BCD uses camelCase for some APIs. Try: "${camelCase}"`);
  }

  suggestions.push(`Use the compat_search tool to find the correct identifier.`);

  return [
    `Error: Feature "${featureId}" not found in BCD.`,
    "",
    "Suggestions:",
    ...suggestions.map((s) => `  - ${s}`),
  ].join("\n");
}

export function webFeatureNotFoundError(featureId: string): string {
  return [
    `Error: Feature "${featureId}" not found in web-features.`,
    "",
    "Suggestions:",
    `  - web-features uses kebab-case IDs (e.g., "container-queries", "push")`,
    `  - Use compat_search to find features, or compat_list_baseline to browse.`,
  ].join("\n");
}

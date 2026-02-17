/**
 * Field aliases for common shorthand names.
 * Maps user-friendly names to their actual data paths.
 */
const FIELD_ALIASES: Record<string, string> = {
  status: "state.name",
};

/**
 * Filter data to only include specified fields.
 * Supports nested fields via dot notation (e.g. "creator.name")
 * and field aliases (e.g. "status" → "state.name").
 */
function pickFields(obj: any, fields: string[]): any {
  const result: any = {};
  for (const rawField of fields) {
    const field = FIELD_ALIASES[rawField] || rawField;
    if (field.includes(".")) {
      const [parent, child] = field.split(".", 2);
      if (obj[parent] != null) {
        // Use the alias key (e.g. "status") as the output key if aliased
        const outputKey = FIELD_ALIASES[rawField] ? rawField : parent;
        if (FIELD_ALIASES[rawField]) {
          // Flatten aliased nested fields to a top-level key
          result[outputKey] = obj[parent][child];
        } else {
          if (!result[outputKey]) result[outputKey] = {};
          result[outputKey][child] = obj[parent][child];
        }
      }
    } else if (obj[field] !== undefined) {
      result[field] = obj[field];
    }
  }
  return result;
}

/** Global fields filter, set via --fields flag */
let _globalFields: string | undefined;

/** Set the global fields filter (called once from main.ts after parsing) */
export function setGlobalFields(fields: string | undefined): void {
  _globalFields = fields;
}

/**
 * Output successful data as formatted JSON
 *
 * When --fields is set globally, output is filtered to only include
 * the specified fields. Supports dot notation for nested fields
 * (e.g. "creator.name,identifier,title").
 *
 * @param data - Data to output (will be JSON serialized)
 *
 * @example
 * ```typescript
 * outputSuccess({ id: "123", title: "Issue title" });
 * // Outputs: { "id": "123", "title": "Issue title" }
 * ```
 */
export function outputSuccess(data: any): void {
  if (_globalFields) {
    const fieldList = _globalFields.split(",").map((f) => f.trim());
    if (Array.isArray(data)) {
      data = data.map((item: any) => pickFields(item, fieldList));
    } else {
      data = pickFields(data, fieldList);
    }
  }
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error as formatted JSON and exit with error code
 * 
 * @param error - Error to output (will be serialized to error.message)
 * 
 * @example
 * ```typescript
 * outputError(new Error("Something went wrong"));
 * // Outputs to stderr: { "error": "Something went wrong" }
 * // Process exits with code 1
 * ```
 */
export function outputError(error: Error): void {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exit(1);
}

/**
 * Wrap an async command handler with error handling
 * 
 * This utility provides consistent error handling for all CLI commands.
 * It catches both thrown errors and rejected promises, formats them
 * as JSON, and exits with appropriate error codes.
 * 
 * @param asyncFn - Async function to wrap (typically a command handler)
 * @returns Wrapped function with error handling
 * 
 * @example
 * ```typescript
 * export const setupMyCommand = (program: Command) => {
 *   const cmd = program.command("my-command");
 *   cmd.action(handleAsyncCommand(async (command: Command) => {
 *     // Command logic here - errors will be caught and formatted
 *     const result = await someAsyncOperation();
 *     outputSuccess(result);
 *   }));
 * };
 * ```
 */
export function handleAsyncCommand(
  asyncFn: (...args: any[]) => Promise<void>,
): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    try {
      await asyncFn(...args);
    } catch (error) {
      outputError(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Error serialization for values that are not `Error` instances.
 *
 * The motivating case: supabase-js resolves with `{ data, error }` where
 * `error` is a plain object — `{ code, message, details, hint }` — not an
 * `Error`. Two patterns were common across the services and both lose it:
 *
 *   throw error                                  // no stack, no name, and any
 *                                                // generic handler upstream
 *                                                // sees a bare object
 *
 *   `failed (${err instanceof Error ? err.message : err})`
 *                                                // interpolating an object
 *                                                // yields "[object Object]"
 *
 * That is how a missing `ev_thresholds` table stayed invisible for an unknown
 * number of engine cycles — the log line said `Refresh failed ([object Object])`
 * while Postgres had actually returned `42P01 relation ... does not exist`.
 */
/**
 * Best-effort readable message for any thrown or returned error value.
 *
 * Always returns a non-empty string — never "[object Object]", never "undefined".
 * Postgres error codes are preserved because they are the fastest way to tell a
 * missing table (42P01) from a unique violation (23505) from a timeout (57014).
 */
export declare function errorMessage(err: unknown): string;
/**
 * Wrap any value as a real `Error`, preserving the original on `.cause`.
 *
 * Use at throw sites so the value crossing a boundary always has a stack and a
 * name, and so `instanceof Error` checks upstream actually hold:
 *
 *   const { data, error } = await supabase.from('ev_thresholds').select('*');
 *   if (error) throw asError(error, 'ev_thresholds select');
 *
 * An `Error` passed in is returned unchanged when no context is supplied, so
 * this is safe to apply defensively without double-wrapping stacks.
 */
export declare function asError(err: unknown, context?: string): Error;
//# sourceMappingURL=errors.d.ts.map
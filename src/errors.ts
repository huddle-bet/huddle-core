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

/** The shape supabase-js returns on `.error`. Structurally typed — we never import their class. */
interface PostgrestErrorLike {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

function isPostgrestErrorLike(value: unknown): value is PostgrestErrorLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { message?: unknown }).message === 'string'
  );
}

/**
 * Best-effort readable message for any thrown or returned error value.
 *
 * Always returns a non-empty string — never "[object Object]", never "undefined".
 * Postgres error codes are preserved because they are the fastest way to tell a
 * missing table (42P01) from a unique violation (23505) from a timeout (57014).
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause !== undefined && err.cause !== null
      ? `: ${errorMessage(err.cause)}`
      : '';
    return `${err.message}${cause}`;
  }

  if (typeof err === 'string') return err || '(empty string thrown)';

  if (isPostgrestErrorLike(err)) {
    const parts = [err.message];
    if (err.code) parts.push(`[${err.code}]`);
    if (err.details) parts.push(`details: ${err.details}`);
    if (err.hint) parts.push(`hint: ${err.hint}`);
    return parts.join(' ');
  }

  if (err === null) return '(null thrown)';
  if (err === undefined) return '(undefined thrown)';

  try {
    const json = JSON.stringify(err);
    return json === undefined ? String(err) : json;
  } catch {
    // Circular structures, BigInt, etc.
    return String(err);
  }
}

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
export function asError(err: unknown, context?: string): Error {
  if (err instanceof Error && !context) return err;

  const message = context ? `${context}: ${errorMessage(err)}` : errorMessage(err);
  return new Error(message, { cause: err });
}

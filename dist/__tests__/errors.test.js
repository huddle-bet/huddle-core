import { describe, it, expect } from 'vitest';
import { errorMessage, asError } from '../errors.js';
describe('errorMessage', () => {
    it('returns the message for a real Error', () => {
        expect(errorMessage(new Error('boom'))).toBe('boom');
    });
    it('follows the cause chain', () => {
        const inner = new Error('connection refused');
        const outer = new Error('ev_thresholds select', { cause: inner });
        expect(errorMessage(outer)).toBe('ev_thresholds select: connection refused');
    });
    it('follows a cause chain that bottoms out in a Postgrest error', () => {
        const pg = { message: 'relation "ev_thresholds" does not exist', code: '42P01' };
        expect(errorMessage(new Error('refresh failed', { cause: pg })))
            .toBe('refresh failed: relation "ev_thresholds" does not exist [42P01]');
    });
    describe('Postgrest-shaped errors — the ENG-229 case', () => {
        it('keeps the code, which is how you tell the failure mode apart', () => {
            expect(errorMessage({ message: 'relation "ev_thresholds" does not exist', code: '42P01' }))
                .toBe('relation "ev_thresholds" does not exist [42P01]');
        });
        it('includes details and hint when present', () => {
            expect(errorMessage({
                message: 'duplicate key value violates unique constraint',
                code: '23505',
                details: 'Key (sport, search_name)=(cs2, sagoy) already exists.',
                hint: null,
            })).toBe('duplicate key value violates unique constraint [23505] ' +
                'details: Key (sport, search_name)=(cs2, sagoy) already exists.');
        });
        it('never produces [object Object]', () => {
            const pg = { message: 'statement timeout', code: '57014', details: null, hint: null };
            expect(errorMessage(pg)).not.toContain('[object Object]');
            expect(`${errorMessage(pg)}`).toBe('statement timeout [57014]');
        });
        it('tolerates null code/details/hint without emitting "null"', () => {
            expect(errorMessage({ message: 'nope', code: null, details: null, hint: null })).toBe('nope');
        });
    });
    it('passes strings through', () => {
        expect(errorMessage('plain failure')).toBe('plain failure');
    });
    it.each([
        [null, '(null thrown)'],
        [undefined, '(undefined thrown)'],
        ['', '(empty string thrown)'],
    ])('describes %p rather than returning an empty or misleading string', (input, expected) => {
        expect(errorMessage(input)).toBe(expected);
    });
    it('JSON-serialises an arbitrary object', () => {
        expect(errorMessage({ status: 500, body: 'oops' })).toBe('{"status":500,"body":"oops"}');
    });
    it('survives a circular structure', () => {
        const circular = { a: 1 };
        circular.self = circular;
        expect(() => errorMessage(circular)).not.toThrow();
        expect(typeof errorMessage(circular)).toBe('string');
    });
    it('handles a thrown number', () => {
        expect(errorMessage(42)).toBe('42');
    });
});
describe('asError', () => {
    it('returns a real Error with a stack', () => {
        const e = asError({ message: 'nope', code: '42P01' });
        expect(e).toBeInstanceOf(Error);
        expect(e.stack).toBeTruthy();
    });
    it('preserves the original value on cause', () => {
        const pg = { message: 'nope', code: '42P01' };
        expect(asError(pg).cause).toBe(pg);
    });
    it('prefixes context when given', () => {
        expect(asError({ message: 'nope', code: '42P01' }, 'ev_thresholds select').message)
            .toBe('ev_thresholds select: nope [42P01]');
    });
    it('returns an existing Error unchanged when no context is supplied', () => {
        const original = new Error('already an error');
        expect(asError(original)).toBe(original);
    });
    it('wraps an existing Error when context is supplied, keeping it as cause', () => {
        const original = new Error('connection refused');
        const wrapped = asError(original, 'players upsert');
        expect(wrapped).not.toBe(original);
        expect(wrapped.message).toBe('players upsert: connection refused');
        expect(wrapped.cause).toBe(original);
    });
    it('makes instanceof checks upstream actually hold', () => {
        // The point of the helper: before, `throw error` sent a bare object and
        // every `err instanceof Error` guard downstream took the wrong branch.
        const thrown = asError({ message: 'nope', code: '42P01' });
        expect(thrown instanceof Error).toBe(true);
    });
});
//# sourceMappingURL=errors.test.js.map
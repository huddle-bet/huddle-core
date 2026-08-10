/**
 * The proxy pool resolver.
 *
 * The behaviour worth pinning is not "it fetches a list" — it is what happens when the
 * fetch goes wrong. A resolver that empties the pool on a bad response would cause exactly
 * the outage it was written to prevent, and it would do so at 3am when Webshare hiccups.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getProxyPool,
  parseWebshareList,
  parseCsvList,
  peekProxyPool,
  __resetProxyPoolForTests,
  PROXY_LIST_URL_ENV,
  PROXY_CSV_ENV,
} from '../proxy/pool.js';

const LIST_URL = 'https://proxy.webshare.io/api/v2/proxy/list/download/tok/-/any/username/direct/-/';
const CSV = 'http://u:p@1.1.1.1:1111,http://u:p@2.2.2.2:2222';

/** Webshare's `username/direct` format. */
const body = (n: number) =>
  Array.from({ length: n }, (_, i) => `10.0.0.${i}:${5000 + i}:user:pass`).join('\n');

const okResponse = (text: string) => ({ ok: true, status: 200, text: () => Promise.resolve(text) }) as never;

beforeEach(() => {
  __resetProxyPoolForTests();
  process.env[PROXY_LIST_URL_ENV] = LIST_URL;
  process.env[PROXY_CSV_ENV] = CSV;
});
afterEach(() => {
  delete process.env[PROXY_LIST_URL_ENV];
  delete process.env[PROXY_CSV_ENV];
});

describe('parsing', () => {
  it('reads ip:port:user:pass into a proxy URL', () => {
    expect(parseWebshareList('1.2.3.4:5678:bob:secret')).toEqual(['http://bob:secret@1.2.3.4:5678']);
  });

  it('keeps upstream order, because entry #1 is the pinned egress', () => {
    const urls = parseWebshareList('9.9.9.9:1:u:p\n1.1.1.1:2:u:p');
    expect(urls[0]).toContain('9.9.9.9');
  });

  it('survives a password containing colons', () => {
    expect(parseWebshareList('1.2.3.4:5678:bob:a:b:c')).toEqual(['http://bob:a:b:c@1.2.3.4:5678']);
  });

  it('skips blank and malformed lines instead of emitting junk endpoints', () => {
    expect(parseWebshareList('\n1.2.3.4:5678:bob:secret\nnot-a-proxy\n\n')).toHaveLength(1);
  });

  it('tolerates whitespace and trailing commas in the fallback CSV', () => {
    expect(parseCsvList(' http://a@1:1 , http://b@2:2 , ')).toEqual(['http://a@1:1', 'http://b@2:2']);
  });
});

describe('resolution prefers Webshare', () => {
  it('uses the fetched list when it looks plausible', async () => {
    const pool = await getProxyPool({ fetchImpl: () => Promise.resolve(okResponse(body(20))) });
    expect(pool.source).toBe('webshare');
    expect(pool.urls).toHaveLength(20);
  });

  it('falls back to the CSV when no list URL is configured', async () => {
    delete process.env[PROXY_LIST_URL_ENV];
    const pool = await getProxyPool({ fetchImpl: () => Promise.reject(new Error('should not be called')) });
    expect(pool.source).toBe('env');
    expect(pool.urls).toHaveLength(2);
  });

  it('caches within the TTL rather than fetching per request', async () => {
    const spy = vi.fn(() => Promise.resolve(okResponse(body(20))));
    await getProxyPool({ fetchImpl: spy as never });
    await getProxyPool({ fetchImpl: spy as never });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL', async () => {
    const spy = vi.fn(() => Promise.resolve(okResponse(body(20))));
    await getProxyPool({ fetchImpl: spy as never });
    await getProxyPool({ fetchImpl: spy as never, now: Date.now() + 61 * 60_000 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('a bad response must not empty the pool', () => {
  it('falls back to the CSV when the fetch throws', async () => {
    const pool = await getProxyPool({ fetchImpl: () => Promise.reject(new Error('ENOTFOUND')) });
    expect(pool.source).toBe('env');
    expect(pool.urls).toHaveLength(2);
  });

  it('falls back on a non-200', async () => {
    const pool = await getProxyPool({
      fetchImpl: () => Promise.resolve({ ok: false, status: 502, text: () => Promise.resolve('') } as never),
    });
    expect(pool.source).toBe('env');
  });

  it('refuses a list that collapses, rather than shrinking the pool', async () => {
    // A truncated body or an auth error rendered as text would otherwise leave us with
    // two endpoints and no sign anything was wrong.
    const pool = await getProxyPool({ fetchImpl: () => Promise.resolve(okResponse(body(2))) });
    expect(pool.source).toBe('env');
  });

  it('keeps the last good list rather than downgrading to the CSV', async () => {
    await getProxyPool({ fetchImpl: () => Promise.resolve(okResponse(body(20))) });
    const pool = await getProxyPool({
      fetchImpl: () => Promise.reject(new Error('webshare down')),
      now: Date.now() + 61 * 60_000,
    });
    expect(pool.source).toBe('webshare');
    expect(pool.urls).toHaveLength(20);
  });

  it('returns an empty pool only when there is genuinely nothing', async () => {
    delete process.env[PROXY_CSV_ENV];
    const pool = await getProxyPool({ fetchImpl: () => Promise.reject(new Error('down')) });
    expect(pool.source).toBe('empty');
    expect(pool.urls).toHaveLength(0);
  });
});

describe('concurrent callers share one fetch', () => {
  it('does not stampede the API on cold start', async () => {
    const spy = vi.fn(() => Promise.resolve(okResponse(body(20))));
    await Promise.all([
      getProxyPool({ fetchImpl: spy as never }),
      getProxyPool({ fetchImpl: spy as never }),
      getProxyPool({ fetchImpl: spy as never }),
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('peek does not touch the network', async () => {
    expect(peekProxyPool()).toBeNull();
    await getProxyPool({ fetchImpl: () => Promise.resolve(okResponse(body(20))) });
    expect(peekProxyPool()?.urls).toHaveLength(20);
  });
});

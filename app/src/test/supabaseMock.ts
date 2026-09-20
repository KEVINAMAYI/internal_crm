import { vi } from 'vitest'

/**
 * Minimal shape returned by a resolved PostgREST call.
 */
export type QueryResult<T = unknown> = {
  data?: T | null
  error?: { message: string; code?: string } | null
  count?: number | null
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'upsert',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'contains',
  'or',
  'order',
  'range',
  'limit',
  'match',
  'filter',
] as const

export type MockQueryBuilder = {
  [K in (typeof CHAIN_METHODS)[number]]: ReturnType<typeof vi.fn>
} & {
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>
  _result: QueryResult
  _calls: { method: string; args: unknown[] }[]
}

/**
 * Builds a chainable, thenable mock that stands in for a PostgrestFilterBuilder.
 * Every chain method records its call and returns the same builder so call chains of
 * arbitrary shape (`.select().eq().order().range()`, `.update().eq().select().single()`, etc.)
 * resolve to the configured `result` when awaited or passed to Promise.all/allSettled.
 */
export function createQueryBuilder(result: QueryResult = { data: null, error: null }): MockQueryBuilder {
  const calls: { method: string; args: unknown[] }[] = []
  const builder = {} as MockQueryBuilder

  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    })
  }

  builder.single = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'single', args })
    return builder
  })
  builder.maybeSingle = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'maybeSingle', args })
    return builder
  })

  builder._result = result
  builder._calls = calls
  builder.then = (resolve, reject) => Promise.resolve(builder._result).then(resolve, reject)

  return builder
}

export type MockChannel = {
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  _statusCallback: ((status: string) => void) | undefined
  _emit: (status: string) => void
}

export function createMockChannel(): MockChannel {
  const channel = {} as MockChannel
  channel.on = vi.fn(() => channel)
  channel.subscribe = vi.fn((cb?: (status: string) => void) => {
    channel._statusCallback = cb
    return channel
  })
  channel._emit = (status: string) => channel._statusCallback?.(status)
  return channel
}

export type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
  channel: ReturnType<typeof vi.fn>
  removeChannel: ReturnType<typeof vi.fn>
  auth: {
    getSession: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    signInWithPassword: ReturnType<typeof vi.fn>
  }
  __setTableResult: (table: string, result: QueryResult) => void
  __setDefaultResult: (result: QueryResult) => void
  __setRpcResult: (result: QueryResult) => void
  __lastChannel: MockChannel | undefined
  /** Clears configured table/rpc results and mock call history. Call from `beforeEach`
   * so per-test `__setTableResult` configuration never leaks into the next test. */
  __reset: () => void
}

/**
 * Creates a fresh mock of the `supabase-js` client boundary (`src/lib/supabase.ts`).
 * Use `vi.mock('@/lib/supabase', () => ({ supabase: mockClient }))` per test file, and
 * configure per-table responses with `__setTableResult` before invoking the code under test.
 */
export function createSupabaseMock(): MockSupabaseClient {
  let defaultResult: QueryResult = { data: null, error: null }
  const tableResults = new Map<string, QueryResult>()
  let rpcResult: QueryResult = { data: null, error: null }
  let lastChannel: MockChannel | undefined

  const client = {} as MockSupabaseClient

  client.from = vi.fn((table: string) => createQueryBuilder(tableResults.get(table) ?? defaultResult))
  client.rpc = vi.fn(() => Promise.resolve(rpcResult))
  client.channel = vi.fn(() => {
    lastChannel = createMockChannel()
    client.__lastChannel = lastChannel
    return lastChannel
  })
  client.removeChannel = vi.fn()

  client.auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  }

  client.__setTableResult = (table, result) => tableResults.set(table, result)
  client.__setDefaultResult = (result) => {
    defaultResult = result
  }
  client.__setRpcResult = (result) => {
    rpcResult = result
  }
  client.__lastChannel = undefined
  client.__reset = () => {
    tableResults.clear()
    defaultResult = { data: null, error: null }
    rpcResult = { data: null, error: null }
    lastChannel = undefined
    client.__lastChannel = undefined
    client.from.mockClear()
    client.rpc.mockClear()
    client.channel.mockClear()
    client.removeChannel.mockClear()
    client.auth.getSession.mockClear()
    client.auth.onAuthStateChange.mockClear()
    client.auth.signOut.mockClear()
    client.auth.signInWithPassword.mockClear()
  }

  return client
}

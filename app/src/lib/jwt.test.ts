import { describe, expect, it } from 'vitest'
import { decodeJwtPayload } from './jwt'

function base64UrlEncode(json: unknown) {
  const base64 = btoa(JSON.stringify(json))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeToken(payload: unknown) {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' })
  const body = base64UrlEncode(payload)
  return `${header}.${body}.signature`
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed JWT payload', () => {
    const token = makeToken({ app_metadata: { role: 'ops' }, sub: 'user-1' })
    expect(decodeJwtPayload(token)).toEqual({ app_metadata: { role: 'ops' }, sub: 'user-1' })
  })

  it('handles base64url padding correctly', () => {
    // payload length chosen so its base64 form needs padding
    const token = makeToken({ a: 1 })
    const decoded = decodeJwtPayload<{ a: number }>(token)
    expect(decoded?.a).toBe(1)
  })

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(decodeJwtPayload('')).toBeNull()
  })

  it('returns null when the payload segment is not valid JSON', () => {
    const bogusPayload = base64UrlEncode('just a string, not an object')
    // JSON.parse('"just a string, not an object"') actually succeeds (valid JSON string) —
    // use genuinely invalid base64/JSON instead.
    const token = `header.${'%%%not-base64%%%'}.sig`
    expect(decodeJwtPayload(token)).toBeNull()
    expect(decodeJwtPayload(`header.${bogusPayload}.sig`)).toBe('just a string, not an object')
  })
})

import { describe, expect, it } from 'vitest'
import { cn } from './utils'

// `cn` is a re-export of the vendored `cn` package (clsx + tailwind-merge behavior lives
// there, not in this repo) — this test only pins the re-export contract our components rely
// on (merging class name inputs, dropping falsy values), not the third-party merge logic.
describe('cn', () => {
  it('joins truthy class name arguments', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })
})

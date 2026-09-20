import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(async () => {
  cleanup()
  // Radix's DismissableLayer/FocusScope register their outside-pointerdown listener via a
  // `setTimeout(0)` (to avoid treating the opening click itself as "outside"), and release
  // focus guards / body scroll-lock on unmount. If a test ends (and unmounts) before that
  // timer has fired, it can fire during the *next* test's render and leave stale global
  // listeners/styles (e.g. `document.body.style.pointerEvents`) that block subsequent
  // Radix interactions (Select/DropdownMenu/Popover/Command) in later tests. Flushing one
  // real macrotask here lets any pending timers/cleanups settle before the next test runs.
  await new Promise((resolve) => setTimeout(resolve, 0))
})

// jsdom doesn't implement matchMedia — needed by useTheme() and any Radix components
// that query media features.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

// jsdom doesn't implement ResizeObserver — needed by Radix Select/Popover/Command.
if (!('ResizeObserver' in window)) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - test polyfill
  window.ResizeObserver = ResizeObserverMock
}

// jsdom doesn't implement scrollIntoView — used by Radix Select/Command list items.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom doesn't implement hasPointerCapture / releasePointerCapture — used by Radix.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false)
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = vi.fn()
}

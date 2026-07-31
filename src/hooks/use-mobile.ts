import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * useIsMobile — subscribes to the viewport breakpoint via `useSyncExternalStore`.
 *
 * This is the React 19-idiomatic way to read an external, synchronously-readable
 * signal (a media query) without calling setState inside an effect, which the
 * `react-hooks/set-state-in-effect` rule (and the React Compiler) flag as a
 * source of cascading renders. The third arg is the SSR snapshot so the hook
 * is safe during server rendering (treated as desktop).
 */
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  )
}

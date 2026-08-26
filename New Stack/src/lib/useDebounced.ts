import { useEffect, useState } from 'react'

/** Debounce a rapidly-changing value (e.g. a search field) before it drives a query. */
export function useDebounced<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

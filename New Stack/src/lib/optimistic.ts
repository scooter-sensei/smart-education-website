import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { ApiError } from './types'

type Snapshot = { key: QueryKey; prev: unknown } | undefined

/**
 * A mutation that optimistically patches a cached list query, so a removed or
 * updated row reflects instantly — the list's slide-off exit fires on click
 * rather than after the server round-trip. Rolls back on error and reconciles
 * with the server via `invalidate` once settled.
 */
export function useOptimisticListMutation<TVars, TItem, TData = unknown>(config: {
  mutationFn: (vars: TVars) => Promise<TData>
  /** The currently-visible list query to patch, or null to skip the optimistic
   *  step (e.g. an unfiltered view where the row doesn't actually leave). */
  targetKey: (vars: TVars) => QueryKey | null
  /** Return the optimistic list — usually the row filtered out, or its status mapped. */
  patch: (list: TItem[], vars: TVars) => TItem[]
  /** Keys to invalidate once the server responds. */
  invalidate: QueryKey[]
  onSuccess?: (data: TData, vars: TVars) => void
  onError?: (err: ApiError, vars: TVars) => void
}) {
  const qc = useQueryClient()
  return useMutation<TData, ApiError, TVars, Snapshot>({
    mutationFn: config.mutationFn,
    onMutate: async (vars) => {
      const key = config.targetKey(vars)
      if (!key) return undefined
      // stop in-flight refetches from clobbering the optimistic write
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      qc.setQueryData(key, (old: unknown) => (Array.isArray(old) ? config.patch(old as TItem[], vars) : old))
      return { key, prev }
    },
    onError: (err, vars, ctx) => {
      if (ctx) qc.setQueryData(ctx.key, ctx.prev) // roll back
      config.onError?.(err, vars)
    },
    onSuccess: (data, vars) => config.onSuccess?.(data, vars),
    onSettled: () => config.invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  })
}

import { useState, useCallback } from 'react'

interface OptimisticMutationOptions<T, R> {
  mutationFn: (data: T) => Promise<R>
  onSuccess?: (result: R) => void
  onError?: (error: Error) => void
  onOptimisticUpdate?: (data: T) => void
  onRevert?: () => void
}

export function useOptimisticMutation<T, R>({
  mutationFn,
  onSuccess,
  onError,
  onOptimisticUpdate,
  onRevert,
}: OptimisticMutationOptions<T, R>) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (data: T) => {
      setIsLoading(true)
      setError(null)

      
      if (onOptimisticUpdate) {
        onOptimisticUpdate(data)
      }

      try {
        const result = await mutationFn(data)

        if (onSuccess) {
          onSuccess(result)
        }

        return result
      } catch (err) {
        const error = err as Error
        setError(error)

        
        if (onRevert) {
          onRevert()
        }

        if (onError) {
          onError(error)
        }

        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [mutationFn, onSuccess, onError, onOptimisticUpdate, onRevert]
  )

  return { mutate, isLoading, error }
}


export const useOptimisticDelete = <T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  deleteFn: (id: string) => Promise<void>
) => {
  return useOptimisticMutation({
    mutationFn: async (id: string) => {
      await deleteFn(id)
    },
    onOptimisticUpdate: (id: string) => {
      
      setItems(items.filter((item) => item.id !== id))
    },
    onRevert: () => {
      
      
    },
  })
}

export const useOptimisticUpdate = <T extends { id: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  updateFn: (id: string, updates: Partial<T>) => Promise<T>
) => {
  let originalItem: T | null = null

  return useOptimisticMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<T> }) => {
      return await updateFn(id, updates)
    },
    onOptimisticUpdate: ({ id, updates }: { id: string; updates: Partial<T> }) => {
      
      originalItem = items.find((item) => item.id === id) || null

      
      setItems(
        items.map((item) => (item.id === id ? { ...item, ...updates } : item))
      )
    },
    onRevert: () => {
      
      if (originalItem) {
        setItems(
          items.map((item) => (item.id === originalItem!.id ? originalItem! : item))
        )
      }
    },
  })
}

export const useOptimisticCreate = <T extends { id?: string }>(
  items: T[],
  setItems: (items: T[]) => void,
  createFn: (data: Omit<T, 'id'>) => Promise<T>
) => {
  return useOptimisticMutation({
    mutationFn: async (data: Omit<T, 'id'>) => {
      return await createFn(data)
    },
    onOptimisticUpdate: (data: Omit<T, 'id'>) => {
      
      const tempItem = { ...data, id: `temp-${Date.now()}` } as T
      setItems([...items, tempItem])
    },
    onSuccess: (result: T) => {
      
      setItems(
        items.map((item) => (item.id?.startsWith('temp-') ? result : item))
      )
    },
    onRevert: () => {
      
      setItems(items.filter((item) => !item.id?.startsWith('temp-')))
    },
  })
}

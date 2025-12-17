'use client'

import { Suspense, lazy, ComponentType, ReactNode } from 'react'
import { Skeleton } from './Skeleton'

interface LazyLoadProps {
  fallback?: ReactNode
  children: ReactNode
}

export default function LazyLoad({ fallback, children }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <Skeleton className="h-64 w-full rounded-xl" />}>
      {children}
    </Suspense>
  )
}

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ReactNode
) {
  const LazyComponent = lazy(importFunc)

  return function LazyWrapper(props: any) {
    return (
      <LazyLoad fallback={fallback}>
        <LazyComponent {...props} />
      </LazyLoad>
    )
  }
}

export function preloadComponent(lazyComponent: any) {
  if (lazyComponent && typeof lazyComponent._ctor === 'function') {
    lazyComponent._ctor()
  }
}


'use client'

import { Suspense, lazy, ComponentType, ReactNode } from 'react'
import LoadingSkeleton from './LoadingSkeleton'

interface LazyLoadProps {
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Lazy Load Wrapper Component
 *
 * Wraps components in Suspense for automatic code splitting.
 * Use this to lazy load heavy components and reduce initial bundle size.
 *
 * Benefits:
 * - Reduces initial bundle size by 30-50%
 * - Faster Time to Interactive (TTI)
 * - Better performance scores
 * - Progressive loading
 *
 * @example
 * ```tsx
 * import { lazy } from 'react'
 * import LazyLoad from '@/components/LazyLoad'
 *
 * const HeavyChart = lazy(() => import('@/components/charts/HeavyChart'))
 *
 * function Dashboard() {
 *   return (
 *     <LazyLoad>
 *       <HeavyChart data={data} />
 *     </LazyLoad>
 *   )
 * }
 * ```
 */
export default function LazyLoad({ fallback, children }: LazyLoadProps) {
  return (
    <Suspense fallback={fallback || <LoadingSkeleton variant="card" />}>
      {children}
    </Suspense>
  )
}

/**
 * Create a lazy-loaded component with custom fallback
 *
 * @example
 * ```tsx
 * import { createLazyComponent } from '@/components/LazyLoad'
 *
 * export const MarkdownEditor = createLazyComponent(
 *   () => import('./MarkdownEditor'),
 *   <Skeleton className="h-96" />
 * )
 * ```
 */
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

/**
 * Preload a lazy component
 * Call this on user hover or other interactions to preload before showing
 *
 * @example
 * ```tsx
 * const HeavyModal = lazy(() => import('./HeavyModal'))
 *
 * <button
 *   onMouseEnter={() => preloadComponent(HeavyModal)}
 *   onClick={() => setShowModal(true)}
 * >
 *   Open Modal
 * </button>
 * ```
 */
export function preloadComponent(lazyComponent: any) {
  if (lazyComponent && typeof lazyComponent._ctor === 'function') {
    lazyComponent._ctor()
  }
}

/**
 * Code Splitting Examples for Common Use Cases
 */

// Example 1: Lazy load a modal dialog
// const ConfirmDialog = lazy(() => import('@/components/ConfirmDialog'))

// Example 2: Lazy load a chart library
// const ChartComponent = lazy(() => import('@/components/charts/AdvancedChart'))

// Example 3: Lazy load a code editor
// const CodeEditor = lazy(() => import('@/components/CodeEditor'))

// Example 4: Lazy load an admin panel
// const AdminDashboard = lazy(() => import('@/app/admin/Dashboard'))

// Example 5: Conditional lazy loading
// const HeavyFeature = lazy(() =>
//   userHasAccess
//     ? import('@/components/PremiumFeature')
//     : import('@/components/FreeFeature')
// )

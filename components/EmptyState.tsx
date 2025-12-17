'use client'

import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="mb-6 w-24 h-24 rounded-full bg-gradient-to-br from-gray-700/30 to-gray-800/30 flex items-center justify-center backdrop-blur-xl border border-gray-700/50">
          {icon}
        </div>
      )}
      <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="text-gray-400 max-w-md mb-6 text-base">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-semibold shadow-lg hover-lift transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export const NoSubmissionsEmpty = ({ onUpload }: { onUpload?: () => void }) => (
  <EmptyState
    icon={
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    }
    title="No submissions yet"
    description="Upload your first code submission to get started with reviews and feedback."
    action={
      onUpload
        ? {
            label: 'Upload Submission',
            onClick: onUpload,
          }
        : undefined
    }
  />
)

export const NoResultsEmpty = ({ onClear }: { onClear?: () => void }) => (
  <EmptyState
    icon={
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    }
    title="No results found"
    description="We couldn't find any submissions matching your filters. Try adjusting your search criteria."
    action={
      onClear
        ? {
            label: 'Clear Filters',
            onClick: onClear,
          }
        : undefined
    }
  />
)

export const NoTasksEmpty = () => (
  <EmptyState
    icon={
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    }
    title="All caught up!"
    description="There are no pending tasks in your queue. Check back later for new submissions."
  />
)

export const NoNotificationsEmpty = () => (
  <EmptyState
    icon={
      <svg
        className="w-12 h-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    }
    title="No notifications"
    description="You're all caught up! We'll notify you when there's something new."
  />
)

export const ErrorState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    icon={
      <svg
        className="w-12 h-12 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    }
    title="Something went wrong"
    description="We encountered an error loading this content. Please try again."
    action={
      onRetry
        ? {
            label: 'Try Again',
            onClick: onRetry,
          }
        : undefined
    }
  />
)

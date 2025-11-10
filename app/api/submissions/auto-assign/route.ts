import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { autoAssignSubmission, autoAssignAllPending } from '@/lib/auto-assign'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { submissionId, assignAll } = body

    if (assignAll && currentUser.role === 'ADMIN') {
      // Admin can trigger assignment for all pending tasks
      const count = await autoAssignAllPending()
      return NextResponse.json({
        message: `Successfully assigned ${count} task(s)`,
        assignedCount: count,
      })
    }

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    const reviewerId = await autoAssignSubmission(submissionId)

    if (!reviewerId) {
      return NextResponse.json(
        { error: 'No reviewers available for assignment' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Task assigned successfully',
      reviewerId,
    })
  } catch (error) {
    console.error('Auto-assign error:', error)
    return NextResponse.json(
      { error: 'Failed to assign task' },
      { status: 500 }
    )
  }
}

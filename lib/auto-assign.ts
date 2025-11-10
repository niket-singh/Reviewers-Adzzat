import { prisma } from './prisma'
import { logActivity } from './activity-log'

/**
 * Automatically assign a pending submission to the reviewer with the least tasks
 * Returns the assigned reviewer's ID or null if no reviewers available
 */
export async function autoAssignSubmission(submissionId: string): Promise<string | null> {
  try {
    // Get all approved reviewers
    const reviewers = await prisma.user.findMany({
      where: {
        role: 'REVIEWER',
        isApproved: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (reviewers.length === 0) {
      console.log('No approved reviewers available for auto-assignment')
      return null
    }

    // Count current assigned tasks for each reviewer
    const reviewerTaskCounts = await Promise.all(
      reviewers.map(async (reviewer) => {
        const count = await prisma.submission.count({
          where: {
            claimedById: reviewer.id,
            status: {
              in: ['PENDING', 'CLAIMED', 'ELIGIBLE'],
            },
          },
        })
        return {
          reviewer,
          count,
        }
      })
    )

    // Sort by count (ascending) to find reviewer with least tasks
    reviewerTaskCounts.sort((a, b) => a.count - b.count)
    const selectedReviewer = reviewerTaskCounts[0].reviewer

    // Assign the task
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        claimedById: selectedReviewer.id,
        assignedAt: new Date(),
        status: 'CLAIMED',
      },
      include: {
        contributor: {
          select: { name: true, email: true },
        },
      },
    })

    // Log the activity
    await logActivity({
      action: 'AUTO_ASSIGN',
      description: `Task "${updatedSubmission.title}" auto-assigned to ${selectedReviewer.name}`,
      userId: 'system',
      userName: 'System',
      userRole: 'SYSTEM',
      targetId: submissionId,
      targetType: 'submission',
      metadata: {
        reviewerId: selectedReviewer.id,
        reviewerName: selectedReviewer.name,
        contributorName: updatedSubmission.contributor.name,
      },
    })

    return selectedReviewer.id
  } catch (error) {
    console.error('Auto-assignment error:', error)
    return null
  }
}

/**
 * Auto-assign all pending unassigned submissions
 */
export async function autoAssignAllPending(): Promise<number> {
  const pendingSubmissions = await prisma.submission.findMany({
    where: {
      status: 'PENDING',
      claimedById: null,
    },
    select: { id: true },
  })

  let assignedCount = 0
  for (const submission of pendingSubmissions) {
    const assigned = await autoAssignSubmission(submission.id)
    if (assigned) {
      assignedCount++
    }
  }

  return assignedCount
}

/**
 * Get reviewer's current workload
 */
export async function getReviewerWorkload(reviewerId: string) {
  const tasks = await prisma.submission.findMany({
    where: {
      claimedById: reviewerId,
      status: {
        in: ['PENDING', 'CLAIMED', 'ELIGIBLE'],
      },
    },
    select: {
      id: true,
      title: true,
      status: true,
      assignedAt: true,
      createdAt: true,
    },
    orderBy: { assignedAt: 'desc' },
  })

  return {
    totalTasks: tasks.length,
    tasks,
  }
}

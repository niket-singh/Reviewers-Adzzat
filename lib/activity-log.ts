import { prisma } from './prisma'

export interface LogActivityParams {
  action: string
  description: string
  userId?: string
  userName?: string
  userRole?: string
  targetId?: string
  targetType?: 'submission' | 'user' | 'review'
  metadata?: Record<string, any>
}

export async function logActivity(params: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        action: params.action,
        description: params.description,
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        targetId: params.targetId,
        targetType: params.targetType,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - logging failures shouldn't break the app
  }
}

// Helper to get recent logs for admin dashboard
export async function getRecentLogs(limit: number = 50) {
  return prisma.activityLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

// Helper to get logs for a specific user
export async function getUserLogs(userId: string, limit: number = 50) {
  return prisma.activityLog.findMany({
    where: { userId },
    take: limit,
    orderBy: { createdAt: 'desc' },
  })
}

// Helper to get logs for a specific submission
export async function getSubmissionLogs(submissionId: string) {
  return prisma.activityLog.findMany({
    where: {
      targetId: submissionId,
      targetType: 'submission',
    },
    orderBy: { createdAt: 'desc' },
  })
}

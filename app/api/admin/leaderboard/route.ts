import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus, UserRole } from '@prisma/client'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all contributors with their submission counts
    const contributors = await prisma.user.findMany({
      where: { role: UserRole.CONTRIBUTOR },
      include: {
        submissions: {
          where: {
            status: {
              in: [TaskStatus.ELIGIBLE, TaskStatus.APPROVED],
            },
          },
        },
      },
    })

    const leaderboard = contributors.map((contributor) => {
      const eligibleCount = contributor.submissions.filter(
        (s) => s.status === TaskStatus.ELIGIBLE
      ).length
      const approvedCount = contributor.submissions.filter(
        (s) => s.status === TaskStatus.APPROVED
      ).length

      return {
        userId: contributor.id,
        userName: contributor.name,
        email: contributor.email,
        eligibleCount,
        approvedCount,
        totalCount: eligibleCount + approvedCount,
      }
    })

    // Sort by total count (eligible + approved), then by approved count
    leaderboard.sort((a, b) => {
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount
      }
      return b.approvedCount - a.approvedCount
    })

    return NextResponse.json({ leaderboard })
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

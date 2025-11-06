import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let stats = {}

    if (user.role === 'CONTRIBUTOR') {
      const submissions = await prisma.submission.count({
        where: { contributorId: user.id },
      })

      const eligible = await prisma.submission.count({
        where: {
          contributorId: user.id,
          status: TaskStatus.ELIGIBLE,
        },
      })

      const approved = await prisma.submission.count({
        where: {
          contributorId: user.id,
          status: TaskStatus.APPROVED,
        },
      })

      stats = {
        totalSubmissions: submissions,
        eligibleSubmissions: eligible,
        approvedSubmissions: approved,
      }
    } else if (user.role === 'REVIEWER' || user.role === 'ADMIN') {
      const reviewsCount = await prisma.review.count({
        where: { reviewerId: user.id },
      })

      const claimedTasks = await prisma.submission.count({
        where: { claimedById: user.id },
      })

      const eligibleMarked = await prisma.submission.count({
        where: {
          claimedById: user.id,
          status: { in: [TaskStatus.ELIGIBLE, TaskStatus.APPROVED] },
        },
      })

      stats = {
        totalReviews: reviewsCount,
        tasksClaimed: claimedTasks,
        eligibleMarked: eligibleMarked,
      }
    }

    return NextResponse.json({
      user,
      stats,
    })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

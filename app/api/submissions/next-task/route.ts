import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || (currentUser.role !== 'REVIEWER' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const reviewers = await prisma.user.findMany({
      where: {
        role: { in: ['REVIEWER', 'ADMIN'] },
        isApproved: true,
      },
      include: {
        _count: {
          select: { claimedSubmissions: true },
        },
      },
    })

    const reviewerWithLeastTasks = reviewers.reduce((min, reviewer) =>
      reviewer._count.claimedSubmissions < min._count.claimedSubmissions ? reviewer : min
    , reviewers[0])

    const nextTask = await prisma.submission.findFirst({
      where: {
        status: TaskStatus.PENDING,
        claimedById: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        contributor: {
          select: { id: true, name: true, email: true },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    })

    if (!nextTask) {
      return NextResponse.json({ message: 'No tasks available' }, { status: 404 })
    }

    return NextResponse.json({ submission: nextTask, suggestedReviewer: reviewerWithLeastTasks.id })
  } catch (error) {
    console.error('Next task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const role = currentUser.role

    let where: any = {}

    if (role === 'CONTRIBUTOR') {
      where.contributorId = currentUser.userId
      if (statusFilter && statusFilter !== 'all') {
        where.status = statusFilter.toUpperCase() as TaskStatus
      }
    } else if (role === 'REVIEWER') {
      if (!statusFilter || statusFilter === 'pending') {
        where.status = { in: [TaskStatus.PENDING, TaskStatus.CLAIMED] }
      } else if (statusFilter === 'eligible') {
        where.claimedById = currentUser.userId
        where.status = TaskStatus.ELIGIBLE
      } else if (statusFilter === 'all') {
        where.claimedById = currentUser.userId
      }
    } else if (role === 'ADMIN') {
      if (statusFilter && statusFilter !== 'all') {
        where.status = statusFilter.toUpperCase() as TaskStatus
      }
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        contributor: {
          select: { id: true, name: true, email: true },
        },
        claimedBy: {
          select: { id: true, name: true, email: true },
        },
        reviews: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('List submissions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

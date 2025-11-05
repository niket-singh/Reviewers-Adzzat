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
    const role = currentUser.role

    let submissions

    if (role === 'CONTRIBUTOR') {
      // Contributors see only their own submissions
      submissions = await prisma.submission.findMany({
        where: { contributorId: currentUser.userId },
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
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (role === 'REVIEWER') {
      // Reviewers see all PENDING and CLAIMED submissions
      submissions = await prisma.submission.findMany({
        where: {
          status: {
            in: [TaskStatus.PENDING, TaskStatus.CLAIMED],
          },
        },
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
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    } else if (role === 'ADMIN') {
      // Admin sees ELIGIBLE submissions (blue ones)
      const statusFilter = searchParams.get('status')

      if (statusFilter === 'all') {
        submissions = await prisma.submission.findMany({
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
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      } else {
        submissions = await prisma.submission.findMany({
          where: { status: TaskStatus.ELIGIBLE },
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
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      }
    } else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 403 })
    }

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error('List submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

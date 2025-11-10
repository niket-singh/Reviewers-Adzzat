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
    const searchQuery = searchParams.get('search')
    const role = currentUser.role

    let where: any = {}

    // Add search filter if provided
    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { domain: { contains: searchQuery, mode: 'insensitive' } },
        { language: { contains: searchQuery, mode: 'insensitive' } },
      ]
    }

    if (role === 'CONTRIBUTOR') {
      where.contributorId = currentUser.userId
      if (statusFilter && statusFilter !== 'all') {
        where.status = statusFilter.toUpperCase() as TaskStatus
      }
    } else if (role === 'REVIEWER') {
      // Reviewers only see tasks assigned to them
      where.claimedById = currentUser.userId
      if (statusFilter && statusFilter !== 'all') {
        where.status = statusFilter.toUpperCase() as TaskStatus
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

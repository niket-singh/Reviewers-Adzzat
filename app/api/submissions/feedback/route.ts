import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || (currentUser.role !== 'REVIEWER' && currentUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { submissionId, feedback, isEligible, accountPostedIn } = body

    if (!submissionId || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const review = await prisma.review.create({
      data: {
        submissionId,
        reviewerId: currentUser.userId,
        feedback,
        accountPostedIn: accountPostedIn || null,
      },
    })

    if (isEligible) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: TaskStatus.ELIGIBLE },
      })
    }

    return NextResponse.json({
      message: 'Feedback submitted successfully',
      review,
    })
  } catch (error) {
    console.error('Submit feedback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

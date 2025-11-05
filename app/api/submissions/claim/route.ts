import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'REVIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Missing submission ID' },
        { status: 400 }
      )
    }

    // Check if submission exists and is PENDING
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (submission.status !== TaskStatus.PENDING) {
      return NextResponse.json(
        { error: 'Submission already claimed or processed' },
        { status: 400 }
      )
    }

    // Update submission status to CLAIMED
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: TaskStatus.CLAIMED },
      include: {
        contributor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Submission claimed successfully',
      submission: updatedSubmission,
    })
  } catch (error) {
    console.error('Claim submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

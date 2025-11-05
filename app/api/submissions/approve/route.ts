import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TaskStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
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

    // Check if submission exists and is ELIGIBLE
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    if (submission.status !== TaskStatus.ELIGIBLE) {
      return NextResponse.json(
        { error: 'Submission must be eligible to approve' },
        { status: 400 }
      )
    }

    // Update submission status to APPROVED
    const updatedSubmission = await prisma.submission.update({
      where: { id: submissionId },
      data: { status: TaskStatus.APPROVED },
      include: {
        contributor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({
      message: 'Submission approved successfully',
      submission: updatedSubmission,
    })
  } catch (error) {
    console.error('Approve submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

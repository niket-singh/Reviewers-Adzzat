import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadFileToR2 } from '@/lib/r2'
import { logActivity } from '@/lib/activity-log'
import { autoAssignSubmission } from '@/lib/auto-assign'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'CONTRIBUTOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string
    const domain = formData.get('domain') as string
    const language = formData.get('language') as string

    if (!file || !title || !domain || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate file is a zip
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only .zip files are allowed' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to R2
    const fileUrl = await uploadFileToR2(buffer, file.name, file.type)

    // Create submission in database
    const submission = await prisma.submission.create({
      data: {
        title,
        domain,
        language,
        fileUrl,
        fileName: file.name,
        contributorId: currentUser.userId,
      },
    })

    // Log the activity
    await logActivity({
      action: 'UPLOAD',
      description: `Contributor uploaded task "${title}"`,
      userId: currentUser.userId,
      userName: currentUser.email,
      userRole: currentUser.role,
      targetId: submission.id,
      targetType: 'submission',
      metadata: {
        title,
        domain,
        language,
        fileName: file.name,
      },
    })

    // Auto-assign to a reviewer
    const reviewerId = await autoAssignSubmission(submission.id)

    return NextResponse.json({
      message: reviewerId
        ? 'File uploaded and assigned to reviewer successfully'
        : 'File uploaded successfully (no reviewers available)',
      submission,
      assigned: !!reviewerId,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

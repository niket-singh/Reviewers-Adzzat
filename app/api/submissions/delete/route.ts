import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/r2'
import { logActivity } from '@/lib/activity-log'

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only contributors can delete their own submissions, and admins can delete any
    if (currentUser.role !== 'CONTRIBUTOR' && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only contributors and admins can delete submissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { submissionId } = body

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Get the submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        contributor: { select: { id: true, name: true } },
        reviews: true,
      },
    })

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    // If contributor, they can only delete their own submissions
    if (currentUser.role === 'CONTRIBUTOR' && submission.contributorId !== currentUser.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own submissions' },
        { status: 403 }
      )
    }

    // Delete file from Supabase Storage
    try {
      const { error: storageError } = await supabaseAdmin.storage
        .from('submissions')
        .remove([submission.fileUrl])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        // Continue even if storage deletion fails
      }
    } catch (storageError) {
      console.error('Storage deletion failed:', storageError)
      // Continue even if storage deletion fails
    }

    // Delete submission from database (CASCADE will delete reviews)
    await prisma.submission.delete({
      where: { id: submissionId },
    })

    // Log the activity
    await logActivity({
      action: 'DELETE',
      description: `${currentUser.role === 'ADMIN' ? 'Admin' : 'Contributor'} deleted submission "${submission.title}"`,
      userId: currentUser.userId,
      userName: currentUser.email,
      userRole: currentUser.role,
      targetId: submissionId,
      targetType: 'submission',
      metadata: {
        title: submission.title,
        contributorName: submission.contributor.name,
        reviewCount: submission.reviews.length,
      },
    })

    return NextResponse.json({
      message: 'Submission deleted successfully',
      deletedId: submissionId,
    })
  } catch (error) {
    console.error('Delete submission error:', error)
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    )
  }
}

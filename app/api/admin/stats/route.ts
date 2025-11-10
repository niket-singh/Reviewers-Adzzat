import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all contributors with their stats
    const contributors = await prisma.user.findMany({
      where: { role: 'CONTRIBUTOR' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        submissions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    const contributorStats = contributors.map((contributor) => {
      const total = contributor.submissions.length
      const pending = contributor.submissions.filter((s) => s.status === 'PENDING').length
      const claimed = contributor.submissions.filter((s) => s.status === 'CLAIMED').length
      const eligible = contributor.submissions.filter((s) => s.status === 'ELIGIBLE').length
      const approved = contributor.submissions.filter((s) => s.status === 'APPROVED').length

      return {
        id: contributor.id,
        name: contributor.name,
        email: contributor.email,
        joinedAt: contributor.createdAt,
        total,
        pending,
        claimed,
        eligible,
        approved,
        approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : '0',
      }
    })

    // Get all reviewers with their stats
    const reviewers = await prisma.user.findMany({
      where: { role: 'REVIEWER' },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
        createdAt: true,
        claimedSubmissions: {
          select: {
            id: true,
            title: true,
            status: true,
            assignedAt: true,
          },
        },
        reviews: {
          select: {
            id: true,
            submissionId: true,
          },
        },
      },
    })

    const reviewerStats = reviewers.map((reviewer) => {
      const assignedTasks = reviewer.claimedSubmissions.length
      const pendingReview = reviewer.claimedSubmissions.filter(
        (s) => s.status === 'CLAIMED' || s.status === 'PENDING'
      ).length
      const eligible = reviewer.claimedSubmissions.filter((s) => s.status === 'ELIGIBLE').length
      const approved = reviewer.claimedSubmissions.filter((s) => s.status === 'APPROVED').length
      const reviewed = reviewer.reviews.length

      return {
        id: reviewer.id,
        name: reviewer.name,
        email: reviewer.email,
        isApproved: reviewer.isApproved,
        joinedAt: reviewer.createdAt,
        assignedTasks,
        pendingReview,
        eligible,
        approved,
        reviewed,
        currentWorkload: pendingReview,
        tasks: reviewer.claimedSubmissions.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          assignedAt: s.assignedAt,
        })),
      }
    })

    // Overall platform stats
    const totalSubmissions = await prisma.submission.count()
    const totalUsers = await prisma.user.count()
    const totalContributors = contributors.length
    const totalReviewers = reviewers.length
    const approvedReviewers = reviewers.filter((r) => r.isApproved).length
    const pendingReviewers = reviewers.filter((r) => !r.isApproved).length

    const submissionsByStatus = await prisma.submission.groupBy({
      by: ['status'],
      _count: true,
    })

    const statusCounts = submissionsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      overview: {
        totalUsers,
        totalContributors,
        totalReviewers,
        approvedReviewers,
        pendingReviewers,
        totalSubmissions,
        statusCounts,
      },
      contributors: contributorStats,
      reviewers: reviewerStats,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

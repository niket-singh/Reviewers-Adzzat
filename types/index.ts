export type { User, Submission, Review } from '@prisma/client'
export { UserRole, TaskStatus } from '@prisma/client'

export interface SubmissionWithRelations {
  id: string
  title: string
  domain: string
  language: string
  fileUrl: string
  fileName: string
  status: string
  createdAt: Date
  updatedAt: Date
  contributor: {
    id: string
    name: string
    email: string
  }
  reviews: {
    id: string
    feedback: string
    createdAt: Date
    reviewer: {
      id: string
      name: string
      email: string
    }
  }[]
}

export interface LeaderboardEntry {
  userId: string
  userName: string
  eligibleCount: number
  approvedCount: number
}

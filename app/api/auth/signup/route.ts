import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, role } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Determine role and approval status
    const userRole = role === 'REVIEWER' ? UserRole.REVIEWER : UserRole.CONTRIBUTOR
    const isApproved = userRole === UserRole.CONTRIBUTOR // Contributors are auto-approved

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        isApproved,
      },
    })

    // Generate token only if approved (contributors)
    if (isApproved) {
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      await setAuthCookie(token)

      return NextResponse.json({
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    } else {
      // Reviewer waiting for approval
      return NextResponse.json({
        message: 'Account created. Waiting for admin approval.',
        needsApproval: true,
      })
    }
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

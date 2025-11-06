import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, hashPassword } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (name && name.trim() !== '') {
      updateData.name = name.trim()
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 })
      }

      const bcrypt = require('bcryptjs')
      const isValid = await bcrypt.compare(currentPassword, user.password)

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid current password' }, { status: 400 })
      }

      updateData.password = await hashPassword(newPassword)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

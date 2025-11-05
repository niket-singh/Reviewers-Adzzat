import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@adzzat.com' },
    update: {},
    create: {
      email: 'admin@adzzat.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      isApproved: true,
    },
  })

  console.log('Admin user created:', admin.email)
  console.log('Password: admin123')
  console.log('\nYou can now sign in with these credentials!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // Hash password for admin
    const hashedPassword = await bcrypt.hash('123456', 10)

    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: '762618186@qq.com' },
        update: {
            password: hashedPassword,
        },
        create: {
            email: '762618186@qq.com',
            username: 'zijin',
            password: hashedPassword,
            role: 'admin',
            tagline: '全栈开发者 / 终身学习者',
        },
    })

    // Create about for admin
    await prisma.about.upsert({
        where: { userId: admin.id },
        update: {},
        create: {
            userId: admin.id,
            content: `# 👋 你好，我是博主

这是我的个人博客，记录学习、探索和成长的点滴。

## 关于这个博客

- 📝 **笔记** - 学习过程中的记录
- 🔥 **踩坑** - 开发中遇到的问题和解决方案  
- 💼 **项目** - 个人作品展示

欢迎交流！`
        }
    })

    console.log({ admin })
    console.log('Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })

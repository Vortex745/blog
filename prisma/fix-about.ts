import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 找到 zijin 用户
    const zijin = await prisma.user.findUnique({
        where: { email: '762618186@qq.com' }
    })

    if (!zijin) {
        console.log('用户不存在')
        return
    }

    console.log('找到用户:', zijin.username, zijin.id)

    // 使用 upsert 创建或更新 about
    const about = await prisma.about.upsert({
        where: { userId: zijin.id },
        update: {
            content: `# 👋 你好，我是博主

这是我的个人博客，记录学习、探索和成长的点滴。

## 关于这个博客

- 📝 **笔记** - 学习过程中的记录
- 🔥 **踩坑** - 开发中遇到的问题和解决方案  
- 💼 **项目** - 个人作品展示

欢迎交流！`
        },
        create: {
            userId: zijin.id,
            content: `# 👋 你好，我是博主

这是我的个人博客，记录学习、探索和成长的点滴。

## 关于这个博客

- 📝 **笔记** - 学习过程中的记录
- 🔥 **踩坑** - 开发中遇到的问题和解决方案  
- 💼 **项目** - 个人作品展示

欢迎交流！`
        }
    })

    console.log('About 创建/更新成功:', about.id)
    console.log('完成！刷新关于页面即可看到效果')
}

main()
    .then(() => prisma.$disconnect())
    .catch(e => {
        console.error(e)
        prisma.$disconnect()
    })

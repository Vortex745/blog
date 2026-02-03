import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Start seeding ...')

    // Example seed data
    const user = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            username: 'admin',
            password: 'hashed_password_here',
            posts: {
                create: {
                    title: 'Hello World',
                    content: 'This is my first post',
                    summary: 'Welcome to the blog',
                    categories: {
                        create: [
                            {
                                category: {
                                    create: {
                                        name: 'General'
                                    }
                                }
                            }
                        ]
                    }
                },
            },
        },
    })

    console.log({ user })
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

import {PrismaClient} from "../generated/prisma"

const prisma = new PrismaClient()

export { prisma }
export * from "../generated/prisma"

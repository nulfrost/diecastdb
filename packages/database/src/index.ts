import { PrismaClient } from "../generated/prisma/client.js"

const prisma = new PrismaClient()

export { prisma }
export * from "../generated/prisma/client.js"

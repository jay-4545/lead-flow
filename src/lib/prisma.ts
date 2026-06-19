import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  })
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  // Recreate if cached client predates a schema change (e.g. new models in dev)
  if (existing && "inboundReply" in existing) {
    return existing
  }
  const client = createPrismaClient()
  globalForPrisma.prisma = client
  return client
}

export const prisma = getPrismaClient()

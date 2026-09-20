import { PrismaClient } from "@prisma/client";

// One shared instance for the whole app — never create PrismaClient per request
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
});

export default prisma;

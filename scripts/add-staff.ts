// Creates a staff (or owner) login until the Settings → Staff screen arrives in Phase 4.
//   pnpm staff:add <username> "<Full name>" [--owner] [--phone 98xxxxxxxx]
// Prints a random password once – hand it to the person and ask them to change it later.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const args = process.argv.slice(2);
const [username, name] = args;
const isOwner = args.includes("--owner");
const phoneIdx = args.indexOf("--phone");
const phone = phoneIdx >= 0 ? args[phoneIdx + 1] : undefined;

if (!username || !name || !/^[a-z0-9._-]{3,32}$/.test(username) || (phone && !/^[6-9]\d{9}$/.test(phone))) {
  console.error('Usage: pnpm staff:add <username> "<Full name>" [--owner] [--phone 98xxxxxxxx]');
  console.error("username: 3–32 lowercase letters, digits, . _ -   phone: 10-digit Indian mobile");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const password = randomBytes(9).toString("base64url");
  await db.staffUser.create({
    data: {
      username,
      name,
      phone,
      role: isOwner ? "OWNER" : "STAFF",
      passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    },
  });
  console.log(`Created ${isOwner ? "owner" : "staff"} login "${username}". Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e.code === "P2002" ? "That username or phone is already taken." : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

import { execSync } from "node:child_process";

export default function setup() {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://calsite:calsite@127.0.0.1:5432/calsite_test";
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

// server/api/users.ts
import { readFileSync } from "fs";
import { resolve } from "path";

export default defineEventHandler(async () => {
  try {
    const filePath = resolve(process.cwd(), "app/utils/user.json");
    const fileContent = readFileSync(filePath, "utf-8");
    const users = JSON.parse(fileContent);
    console.log("[USERS API] Loaded", users.length, "users");
    return users;
  } catch (error) {
    console.error("[USERS API] Error loading users:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to load user data",
    });
  }
});

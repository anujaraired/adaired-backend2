// src/utils/globals.ts
import dotenv from "dotenv";

// Load environment variables (only needed if not already loaded elsewhere)
dotenv.config();

// Define BASE_DOMAIN globally
export const BASE_DOMAIN =
  process.env.NODE_ENV === "production"
    ? process.env.LIVE_DOMAIN || "https://www.adaired.com"
    : process.env.LOCAL_DOMAIN || "http://localhost:3001";

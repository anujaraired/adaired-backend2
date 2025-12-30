import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

export async function connectDB(): Promise<typeof mongoose> {
  if (global.mongooseCache.conn) {
    console.log("🟢 MongoDB: using cached connection");
    return global.mongooseCache.conn;
  }

  if (!process.env.MONGODB_URI) {
    console.error("❌ MongoDB: MONGODB_URI missing");
    throw new Error("MONGODB_URI not defined");
  }

  if (!global.mongooseCache.promise) {
    console.log("🟡 MongoDB: creating new connection...");

    global.mongooseCache.promise = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false, // 🔥 critical
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }

  try {
    console.time("⏱ MongoDB connected in");
    global.mongooseCache.conn = await global.mongooseCache.promise;
    console.timeEnd("⏱ MongoDB connected in");

    console.log("✅ MongoDB: connected successfully");
    return global.mongooseCache.conn;
  } catch (error) {
    console.error("🔥 MongoDB connection FAILED", error);
    global.mongooseCache.promise = null;
    throw error;
  }
}

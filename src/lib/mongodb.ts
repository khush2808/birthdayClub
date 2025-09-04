import mongoose from "mongoose";

declare global {
  var mongooseMainConnection: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

if (!global.mongooseMainConnection) {
  global.mongooseMainConnection = {
    conn: null,
    promise: null,
  };
}

const cached = global.mongooseMainConnection;

// Main database connection (birthdayclub)
async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 5, // Reduced for serverless environments
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    // Use birthdayclub database
    const mainDbUri = `${MONGODB_URI}/birthdayclub`;
    cached.promise = mongoose.connect(mainDbUri, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;

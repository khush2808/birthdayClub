import mongoose from "mongoose";

declare global {
  var mongooseConnections: {
    main: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
    deleted: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
  };
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

if (!global.mongooseConnections) {
  global.mongooseConnections = {
    main: { conn: null, promise: null },
    deleted: { conn: null, promise: null },
  };
}

const cached = global.mongooseConnections;

// Main database connection (birthdayclub)
async function dbConnect() {
  if (cached.main.conn) {
    return cached.main.conn;
  }

  if (!cached.main.promise) {
    const opts = {
      maxPoolSize: 5, // Reduced for serverless environments
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    // Use birthdayclub database
    const mainDbUri = `${MONGODB_URI}/birthdayclub`;
    cached.main.promise = mongoose.connect(mainDbUri, opts);
  }

  try {
    cached.main.conn = await cached.main.promise;
  } catch (e) {
    cached.main.promise = null;
    throw e;
  }

  return cached.main.conn;
}

// Deleted users database connection
async function dbConnectDeleted() {
  if (cached.deleted.conn) {
    return cached.deleted.conn;
  }

  if (!cached.deleted.promise) {
    const opts = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Use deleted database
    const deletedDbUri = `${MONGODB_URI}/deleted`;
    // Create a separate mongoose connection for the deleted database
    cached.deleted.promise = Promise.resolve(mongoose.createConnection(deletedDbUri, opts));
  }

  try {
    cached.deleted.conn = await cached.deleted.promise;
  } catch (e) {
    cached.deleted.promise = null;
    throw e;
  }

  return cached.deleted.conn;
}

export default dbConnect;
export { dbConnectDeleted };

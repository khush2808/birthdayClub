import mongoose from "mongoose";

declare global {
  var mongooseDeletedConnection: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

if (!global.mongooseDeletedConnection) {
  global.mongooseDeletedConnection = {
    conn: null,
    promise: null,
  };
}

const cached = global.mongooseDeletedConnection;

// Deleted users database connection
async function dbConnectDeleted() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Use deleted database
    const deletedDbUri = `${MONGODB_URI}/deleted`;
    // Create a separate mongoose connection for the deleted database
    cached.promise = Promise.resolve(
      mongoose.createConnection(deletedDbUri, opts),
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnectDeleted;

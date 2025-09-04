import { type NextRequest, NextResponse } from "next/server";
import dbConnect, { dbConnectDeleted } from "@/lib/mongodb";
import {
  addSecurityHeaders,
  logSecurityEvent,
  validateApiKey,
} from "@/lib/security";
import DeletedUser from "@/models/DeletedUser";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for this sensitive operation
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "delete-unauthenticated-users",
        method: "POST",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to both databases
    await dbConnect(); // Main database
    const deletedDbConnection = await dbConnectDeleted(); // Deleted users database

    if (!deletedDbConnection) {
      throw new Error("Failed to connect to deleted users database");
    }

    // Get the DeletedUser model for the deleted database
    const DeletedUserInDeletedDb = deletedDbConnection.model(
      "DeletedUser",
      DeletedUser.schema,
    );

    // Find all unauthenticated users
    const unauthenticatedUsers = await User.find({ authenticated: false });

    if (unauthenticatedUsers.length === 0) {
      logSecurityEvent("user_cleanup", ip, {
        success: true,
        reason: "no_unauthenticated_users",
        deletedCount: 0,
      });

      const response = NextResponse.json(
        { message: "No unauthenticated users found to delete" },
        { status: 200 },
      );

      return addSecurityHeaders(response);
    }

    const usersToDelete = unauthenticatedUsers.map(user => ({
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      authenticated: user.authenticated,
      otp: user.otp,
      otpExpiresAt: user.otpExpiresAt,
      originalCreatedAt: user.createdAt,
      deletionReason: "unauthenticated_cleanup",
    }));

    let movedCount = 0;
    let deletedCount = 0;

    try {
      // Step 1: Move users to deleted database
      const insertResult = await DeletedUserInDeletedDb.insertMany(usersToDelete);
      movedCount = insertResult.length;

      logSecurityEvent("user_cleanup", ip, {
        step: "users_moved_to_deleted_db",
        movedCount: movedCount,
        originalCount: unauthenticatedUsers.length,
      });

      // Step 2: Only delete if all users were successfully moved
      if (movedCount !== unauthenticatedUsers.length) {
        throw new Error(`Failed to move all users to deleted database. Expected: ${unauthenticatedUsers.length}, Moved: ${movedCount}`);
      }

      // Step 3: Delete users from main database
      const deleteResult = await User.deleteMany({ authenticated: false });
      deletedCount = deleteResult.deletedCount || 0;

      if (deletedCount !== unauthenticatedUsers.length) {
        logSecurityEvent("user_cleanup", ip, {
          error: "partial_deletion",
          expectedToDelete: unauthenticatedUsers.length,
          actuallyDeleted: deletedCount,
          movedToDeletedDb: movedCount,
        });

        // This is a critical error - some users were moved but not deleted
        const response = NextResponse.json(
          { 
            error: "Partial deletion occurred. Some users were moved to deleted database but not removed from main database.",
            movedCount,
            deletedCount,
          },
          { status: 500 },
        );

        return addSecurityHeaders(response);
      }

      logSecurityEvent("user_cleanup", ip, {
        success: true,
        totalUnauthenticatedUsers: unauthenticatedUsers.length,
        movedToDeletedDb: movedCount,
        deletedFromMainDb: deletedCount,
      });

      const response = NextResponse.json({
        message: "Unauthenticated users cleanup completed successfully",
        totalProcessed: unauthenticatedUsers.length,
        movedToDeletedDb: movedCount,
        deletedFromMainDb: deletedCount,
        summary: `Successfully cleaned up ${deletedCount} unauthenticated users`,
      });

      return addSecurityHeaders(response);

    } catch (moveOrDeleteError) {
      logSecurityEvent("user_cleanup", ip, {
        error: "move_or_delete_failed",
        errorMessage: moveOrDeleteError instanceof Error ? moveOrDeleteError.message : "Unknown error",
        movedCount,
        deletedCount,
      });

      const response = NextResponse.json(
        { 
          error: "Failed to safely delete unauthenticated users. Operation aborted to prevent data loss.",
          details: moveOrDeleteError instanceof Error ? moveOrDeleteError.message : "Unknown error",
          movedCount,
          deletedCount,
        },
        { status: 500 },
      );

      return addSecurityHeaders(response);
    }

  } catch (error) {
    console.error("Delete unauthenticated users error:", error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes("authentication failed") ||
        error.message.includes("bad auth") ||
        error.message.includes("MongoServerError")
      ) {
        logSecurityEvent("user_cleanup", ip, {
          error: "db_connection_failed",
          errorMessage: error.message,
        });

        const response = NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 503 },
        );

        return addSecurityHeaders(response);
      }
    }

    logSecurityEvent("user_cleanup", ip, {
      error: error instanceof Error ? error.message : "unknown",
    });

    const response = NextResponse.json(
      { error: "User cleanup failed. Please try again later." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}

// GET endpoint for debugging/monitoring
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Validate API key for debugging access
    if (!validateApiKey(request)) {
      logSecurityEvent("auth_failure", ip, {
        endpoint: "delete-unauthenticated-users",
        method: "GET",
      });

      const response = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

      return addSecurityHeaders(response);
    }

    // Connect to database
    await dbConnect();

    // Count unauthenticated users
    const unauthenticatedCount = await User.countDocuments({ authenticated: false });
    const authenticatedCount = await User.countDocuments({ authenticated: true });

    const response = NextResponse.json({
      unauthenticatedUsers: unauthenticatedCount,
      authenticatedUsers: authenticatedCount,
      totalUsers: unauthenticatedCount + authenticatedCount,
      message: unauthenticatedCount > 0 
        ? `${unauthenticatedCount} unauthenticated users ready for cleanup`
        : "No unauthenticated users found",
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error("Error checking unauthenticated users:", error);

    const response = NextResponse.json(
      { error: "Service temporarily unavailable." },
      { status: 500 },
    );

    return addSecurityHeaders(response);
  }
}
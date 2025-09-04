import mongoose, { type Document, Schema } from "mongoose";

export interface IDeletedUser extends Document {
  name: string;
  email: string;
  dateOfBirth: Date;
  authenticated: boolean;
  otp?: string;
  otpExpiresAt?: Date;
  originalCreatedAt: Date;
  deletedAt: Date;
  deletionReason: string;
}

const DeletedUserSchema = new Schema<IDeletedUser>({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, "Date of birth is required"],
  },
  authenticated: {
    type: Boolean,
    required: true,
  },
  otp: {
    type: String,
    required: false,
  },
  otpExpiresAt: {
    type: Date,
    required: false,
  },
  originalCreatedAt: {
    type: Date,
    required: true,
  },
  deletedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  deletionReason: {
    type: String,
    required: true,
    default: "unauthenticated_cleanup",
  },
});

export default mongoose.models.DeletedUser ||
  mongoose.model<IDeletedUser>("DeletedUser", DeletedUserSchema);
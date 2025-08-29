import mongoose, { type Document, Schema } from 'mongoose';

export interface IRateLimiter extends Document {
  endpoint: string;
  counter: number;
  lastUpdated: Date;
  createdAt: Date;
}

const RateLimiterSchema = new Schema<IRateLimiter>({
  endpoint: {
    type: String,
    required: [true, "Endpoint is required"],
    unique: true,
    trim: true,
  },
  counter: {
    type: Number,
    required: [true, "Counter is required"],
    default: 0,
    min: [0, "Counter cannot be negative"],
  },
  lastUpdated: {
    type: Date,
    required: [true, "Last updated is required"],
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.RateLimiter ||
  mongoose.model<IRateLimiter>("RateLimiter", RateLimiterSchema);
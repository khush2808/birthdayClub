import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    // Connect to database with retry logic
    await dbConnect();

    const body = await request.json();
    const { name, email, dateOfBirth } = body;

    if (!name || !email || !dateOfBirth) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const user = new User({
      name,
      email,
      dateOfBirth: new Date(dateOfBirth),
    });

    await user.save();

    return NextResponse.json(
      { message: 'User registered successfully', user: { id: user._id, name, email } },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('authentication failed') ||
        error.message.includes('bad auth') ||
        error.message.includes('MongoServerError')) {
        return NextResponse.json(
          { error: 'Database connection failed. Please try again later.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
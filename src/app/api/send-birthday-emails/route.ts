import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sendBirthdayEmails } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Connect to database with retry logic
    await dbConnect();

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfBirth' }, todayMonth] },
          { $eq: [{ $dayOfMonth: '$dateOfBirth' }, todayDate] }
        ]
      }
    });

    if (birthdayUsers.length === 0) {
      return NextResponse.json(
        { message: 'No birthdays today' },
        { status: 200 }
      );
    }

    const allUsers = await User.find({}, 'name email');

    if (allUsers.length < 2) {
      return NextResponse.json(
        { message: 'Not enough users to send birthday notifications' },
        { status: 200 }
      );
    }

    const emailPromises = birthdayUsers.map(async (birthdayUser) => {
      try {
        await sendBirthdayEmails(
          { name: birthdayUser.name, email: birthdayUser.email },
          allUsers.map(u => ({ name: u.name, email: u.email }))
        );
        return { success: true, user: birthdayUser.name };
      } catch (error) {
        console.error(`Failed to send birthday emails for ${birthdayUser.name}:`, error);
        return { success: false, user: birthdayUser.name, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Birthday emails processed`,
      totalBirthdays: birthdayUsers.length,
      successfulEmails: successCount,
      failedEmails: failedCount,
      results,
    });

  } catch (error) {
    console.error('Birthday email sending error:', error);

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

export async function GET() {
  try {
    // Connect to database with retry logic
    await dbConnect();

    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDate = today.getDate();

    const birthdayUsers = await User.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfBirth' }, todayMonth] },
          { $eq: [{ $dayOfMonth: '$dateOfBirth' }, todayDate] }
        ]
      }
    }, 'name email dateOfBirth');

    return NextResponse.json({
      todaysDate: today.toDateString(),
      birthdayCount: birthdayUsers.length,
      birthdays: birthdayUsers.map(user => ({
        name: user.name,
        email: user.email,
      }))
    });

  } catch (error) {
    console.error('Error checking birthdays:', error);

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
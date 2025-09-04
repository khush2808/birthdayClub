import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendWelcomeEmailWithOTP(
  user: { name: string; email: string },
  otp: string,
) {
  const mailOptions = {
    from: process.env.GMAIL_EMAIL,
    to: user.email,
    subject: "🎂 Welcome to Birthday Club - Verify Your Email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin-bottom: 10px;">🎂 Welcome to Birthday Club! 🎂</h1>
            <div style="width: 50px; height: 3px; background-color: #4f46e5; margin: 0 auto;"></div>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #333; margin-bottom: 15px;">Hi ${user.name}! 👋</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Welcome to Birthday Club! We're excited to have you join our community where every birthday is celebrated. 🎉
            </p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              To complete your registration and start receiving birthday notifications, please verify your email address using the OTP below:
            </p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #374151; font-weight: bold;">Your Verification Code:</p>
            <div style="font-size: 32px; font-weight: bold; color: #4f46e5; letter-spacing: 4px; font-family: monospace;">
              ${otp}
            </div>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              This code expires in 10 minutes
            </p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>🔒 Security Note:</strong> Never share this OTP with anyone. Birthday Club will never ask for your verification code via phone or email.
            </p>
          </div>
          
          <div style="text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>This email was sent by Birthday Club 🎂</p>
            <p>If you didn't sign up for Birthday Club, please ignore this email.</p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email with OTP sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to send welcome email to ${user.email}:`, error);
    throw error;
  }
}

export async function sendBirthdayEmails(
  birthdayPerson: { name: string; email: string },
  allUsers: Array<{ name: string; email: string }>,
) {
  const emailPromises = allUsers
    .filter((user) => user.email !== birthdayPerson.email)
    .map(async (user) => {
      const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: user.email,
        subject: `🎉 It's ${birthdayPerson.name}'s Birthday Today!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin-bottom: 10px;">🎂 Birthday Celebration! 🎂</h1>
                <div style="width: 50px; height: 3px; background-color: #4f46e5; margin: 0 auto;"></div>
              </div>
              
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                <h2 style="color: #333; margin-bottom: 15px;">Happy Birthday, ${birthdayPerson.name}!</h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  Hi ${user.name},<br><br>
                  Today is <strong>${birthdayPerson.name}'s</strong> special day! 🎈<br>
                  Why not send them a birthday wish to make their day even more special?
                </p>
              </div>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; color: #4b5563; font-style: italic; text-align: center;">
                  "Birthdays are a time to celebrate the joy of life and the people we cherish."
                </p>
              </div>
              
              <div style="text-align: center; margin-bottom: 20px;">
                <a href="mailto:${birthdayPerson.email}?subject=Happy Birthday ${birthdayPerson.name}!" 
                   style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Send Birthday Wishes 🎁
                </a>
              </div>
              
              <div style="text-align: center; color: #9ca3af; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <p>This reminder was sent by Birthday Club 🎂</p>
              </div>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(
          `Birthday email sent to ${user.email} about ${birthdayPerson.name}`,
        );
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        throw error;
      }
    });

  await Promise.all(emailPromises);
}

export async function testEmailConnection() {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Email connection test failed:", error);
    return false;
  }
}

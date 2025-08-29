import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Gmail SMTP rate limiting configuration
const GMAIL_RATE_LIMIT = {
  BATCH_SIZE: 10, // Send emails in batches of 10
  DELAY_BETWEEN_BATCHES: 2000, // 2 seconds delay between batches
  MAX_RETRIES: 3, // Maximum retries for failed emails
  RETRY_DELAY: 5000, // 5 seconds delay before retry
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to send a single email with retry logic
async function sendSingleEmail(mailOptions: nodemailer.SendMailOptions, retryCount = 0): Promise<{ success: boolean; error?: string }> {
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${mailOptions.to}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to send email to ${mailOptions.to} (attempt ${retryCount + 1}):`, errorMessage);
    
    if (retryCount < GMAIL_RATE_LIMIT.MAX_RETRIES) {
      console.log(`Retrying email to ${mailOptions.to} in ${GMAIL_RATE_LIMIT.RETRY_DELAY}ms...`);
      await delay(GMAIL_RATE_LIMIT.RETRY_DELAY);
      return sendSingleEmail(mailOptions, retryCount + 1);
    }
    
    return { success: false, error: errorMessage };
  }
}

// Helper function to process email batches
async function processBatch(emailBatch: nodemailer.SendMailOptions[]): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = await Promise.all(
    emailBatch.map(mailOptions => sendSingleEmail(mailOptions))
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const errors = results.filter(r => !r.success).map(r => r.error || 'Unknown error');
  
  return { success: successful, failed, errors };
}

export async function sendBirthdayEmails(birthdayPerson: { name: string; email: string }, allUsers: Array<{ name: string; email: string }>) {
  const recipients = allUsers.filter(user => user.email !== birthdayPerson.email);
  
  if (recipients.length === 0) {
    console.log('No recipients to send emails to');
    return { totalEmails: 0, successfulEmails: 0, failedEmails: 0, errors: [] };
  }

  console.log(`Starting to send ${recipients.length} birthday emails for ${birthdayPerson.name}`);
  
  // Prepare all email options
  const emailOptions = recipients.map(user => ({
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
  }));

  // Split emails into batches
  const batches: nodemailer.SendMailOptions[][] = [];
  for (let i = 0; i < emailOptions.length; i += GMAIL_RATE_LIMIT.BATCH_SIZE) {
    batches.push(emailOptions.slice(i, i + GMAIL_RATE_LIMIT.BATCH_SIZE));
  }

  let totalSuccessful = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Process batches with delays
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} emails)`);
    
    const batchResult = await processBatch(batch);
    totalSuccessful += batchResult.success;
    totalFailed += batchResult.failed;
    allErrors.push(...batchResult.errors);
    
    console.log(`Batch ${i + 1} completed: ${batchResult.success} successful, ${batchResult.failed} failed`);
    
    // Add delay between batches (except for the last batch)
    if (i < batches.length - 1) {
      console.log(`Waiting ${GMAIL_RATE_LIMIT.DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await delay(GMAIL_RATE_LIMIT.DELAY_BETWEEN_BATCHES);
    }
  }

  const summary = {
    totalEmails: recipients.length,
    successfulEmails: totalSuccessful,
    failedEmails: totalFailed,
    errors: allErrors,
  };

  console.log(`Birthday email sending completed for ${birthdayPerson.name}:`, summary);
  
  if (totalFailed > 0) {
    console.error(`${totalFailed} emails failed to send:`, allErrors);
    throw new Error(`Failed to send ${totalFailed} out of ${recipients.length} emails`);
  }

  return summary;
}

export async function testEmailConnection() {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
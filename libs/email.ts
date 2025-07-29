import { Resend } from "resend";
import config from "@/config";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export interface InvitationEmailData {
  to: string;
  inviterName: string;
  familyName: string;
  inviteCode: string;
  inviteLink: string;
  role: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Create HTML email template for family invitations
const createInvitationEmailHTML = (data: InvitationEmailData) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Join ${data.familyName}!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .invite-code { background: #e9ecef; border: 2px dashed #6c757d; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .code { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #495057; letter-spacing: 2px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
        .emoji { font-size: 1.2em; }
    </style>
</head>
<body>
    <div class="header">
        <h1><span class="emoji">🏠</span> You're Invited to ChoreMinder!</h1>
        <p>Join ${data.familyName} and start managing chores together</p>
    </div>
    
    <div class="content">
        <h2>Hi there! <span class="emoji">👋</span></h2>
        
        <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.familyName}</strong> on ChoreMinder as a <strong>${data.role}</strong>.</p>
        
        <p>ChoreMinder helps families organize household tasks, track progress, and celebrate achievements together!</p>
        
        <h3>How to Join:</h3>
        
        <div class="invite-code">
            <p><strong>Your Invitation Code:</strong></p>
            <div class="code">${data.inviteCode}</div>
            <p><small>Use this code when joining the family</small></p>
        </div>
        
        <div style="text-align: center;">
            <a href="${data.inviteLink}" class="button">
                <span class="emoji">🚀</span> Join Family Now
            </a>
        </div>
        
        <h3>What's Next?</h3>
        <ol>
            <li><strong>Click the button above</strong> or visit: <br><code>${data.inviteLink}</code></li>
            <li><strong>Enter your invitation code:</strong> <code>${data.inviteCode}</code></li>
            <li><strong>Create your account</strong> or sign in if you already have one</li>
            <li><strong>Start collaborating</strong> with your family on household tasks!</li>
        </ol>
        
        <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><span class="emoji">💡</span> <strong>Tip:</strong> This invitation expires in 7 days. If you need a new one, just ask ${data.inviterName} to send another invitation.</p>
        </div>
        
        <p>We're excited to have you join the ChoreMinder family! <span class="emoji">🎉</span></p>
    </div>
    
    <div class="footer">
        <p>This invitation was sent from ChoreMinder</p>
        <p>If you didn't expect this email, you can safely ignore it.</p>
    </div>
</body>
</html>
  `.trim();
};

// Create plain text email template for family invitations
const createInvitationEmailText = (data: InvitationEmailData) => {
  return `
You're Invited to Join ${data.familyName} on ChoreMinder!

Hi there!

${data.inviterName} has invited you to join ${data.familyName} on ChoreMinder as a ${data.role}.

ChoreMinder helps families organize household tasks, track progress, and celebrate achievements together!

YOUR INVITATION CODE: ${data.inviteCode}

How to Join:
1. Visit: ${data.inviteLink}
2. Enter your invitation code: ${data.inviteCode}
3. Create your account or sign in if you already have one
4. Start collaborating with your family on household tasks!

Tip: This invitation expires in 7 days. If you need a new one, just ask ${data.inviterName} to send another invitation.

We're excited to have you join the ChoreMinder family!

---
This invitation was sent from ChoreMinder
If you didn't expect this email, you can safely ignore it.
  `.trim();
};

// Send family invitation email
export async function sendFamilyInvitationEmail(data: InvitationEmailData): Promise<EmailResult> {
  try {
    console.log(`📧 [RESEND] Sending invitation email to: ${data.to}`);
    console.log(`📧 [RESEND] From address: ${config.resend.fromNoReply}`);
    console.log(`📧 [RESEND] API Key present: ${!!process.env.RESEND_API_KEY}`);
    
    const result = await resend.emails.send({
      from: config.resend.fromNoReply,
      to: data.to,
      subject: `🏠 You're invited to join ${data.familyName} on ChoreMinder!`,
      html: createInvitationEmailHTML(data),
      text: createInvitationEmailText(data),
    });

    console.log(`📧 [RESEND] Full result:`, JSON.stringify(result, null, 2));

    if (result.error) {
      console.error(`📧 [RESEND] Error details:`, JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: result.error.message || JSON.stringify(result.error),
      };
    }

    console.log(`📧 [RESEND] Success! Message ID: ${result.data?.id}`);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error(`📧 [RESEND] Exception:`, error);
    console.error(`📧 [RESEND] Exception stack:`, error instanceof Error ? error.stack : "No stack");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test email function
export async function sendTestEmail(to: string): Promise<EmailResult> {
  try {
    console.log(`📧 [RESEND] Sending test email to: ${to}`);
    console.log(`📧 [RESEND] From address: ${config.resend.fromNoReply}`);
    console.log(`📧 [RESEND] API Key length: ${process.env.RESEND_API_KEY?.length || 0}`);
    console.log(`📧 [RESEND] API Key starts with: ${process.env.RESEND_API_KEY?.substring(0, 10) || 'NOT_SET'}...`);
    
    const result = await resend.emails.send({
      from: config.resend.fromNoReply,
      to,
      subject: "🧪 ChoreMinder Test Email",
      html: `
        <h1>🎉 Email Setup Working!</h1>
        <p>This is a test email from ChoreMinder.</p>
        <p>If you received this, your email configuration is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `,
      text: `🎉 Email Setup Working!\n\nThis is a test email from ChoreMinder.\nIf you received this, your email configuration is working correctly!\n\nTimestamp: ${new Date().toISOString()}`,
    });

    console.log(`📧 [RESEND] Test email full result:`, JSON.stringify(result, null, 2));

    if (result.error) {
      console.error(`📧 [RESEND] Test email error details:`, JSON.stringify(result.error, null, 2));
      return {
        success: false,
        error: result.error.message || JSON.stringify(result.error),
      };
    }

    console.log(`📧 [RESEND] Test email sent! Message ID: ${result.data?.id}`);
    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error(`📧 [RESEND] Test email exception:`, error);
    console.error(`📧 [RESEND] Test email exception stack:`, error instanceof Error ? error.stack : "No stack");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
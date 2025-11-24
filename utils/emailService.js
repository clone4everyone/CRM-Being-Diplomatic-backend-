const brevo = require('@getbrevo/brevo');

// Initialize Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Send verification email
async function sendVerificationEmail(email, verificationLink, userName) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Verify Your Email Address - BEING Diplomatic';
    sendSmtpEmail.to = [{ email: email, name: userName }];
    sendSmtpEmail.sender = { 
      name: 'Being Diplomatic', 
      email: process.env.EMAIL_USER 
    };
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #4CAF50; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Thank you for registering with our CRM System!</p>
            <p>Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #fff; padding: 10px; border: 1px solid #ddd; word-break: break-all;">
              ${verificationLink}
            </p>
            <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Being Diplomatic. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    sendSmtpEmail.textContent = `
      Hello ${userName},
      
      Thank you for registering with our CRM System!
      
      Please verify your email address by visiting this link:
      ${verificationLink}
      
      This verification link will expire in 24 hours.
      
      If you didn't create an account, please ignore this email.
      
      © ${new Date().getFullYear()} Being Diplomatic. All rights reserved.
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Verification email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

// Send approval email
async function sendApprovalEmail(email, userName) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Account Approved - Welcome to CRM System';
    sendSmtpEmail.to = [{ email: email, name: userName }];
    sendSmtpEmail.sender = { 
      name: 'CRM System', 
      email: process.env.EMAIL_USER 
    };
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 30px; 
            background-color: #2196F3; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to CRM System!</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>Great news! Your account has been approved by the administrator.</p>
            <p>You can now login and access the system.</p>
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/login" class="button">Login Now</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} CRM System. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Approval email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw new Error('Failed to send approval email');
  }
}

// Send password reset email
async function sendPasswordResetEmail(email, resetLink, userName) {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.subject = 'Password Reset Request - CRM System';
    sendSmtpEmail.to = [{ email: email, name: userName }];
    sendSmtpEmail.sender = { 
      name: 'CRM System', 
      email: process.env.EMAIL_USER 
    };
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <body>
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Password Reset Request</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="padding: 12px 30px; background-color: #f44336; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Password reset email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

module.exports = {
  sendVerificationEmail,
  sendApprovalEmail,
  sendPasswordResetEmail
};

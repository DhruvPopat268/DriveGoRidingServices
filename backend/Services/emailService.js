const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendWelcomeEmail = async (userEmail, userName, password, roleName) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Welcome to Hire4Drive Admin Panel',
    html: `
      <h2>Welcome to Hire4Drive Admin Panel</h2>
      <p>Hello ${userName},</p>
      <p>Your admin account has been created successfully!</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Login Credentials:</h3>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p><strong>Role:</strong> ${roleName}</p>
      </div>
      <p>Please login to access your dashboard.</p>
      <p>Best regards,<br>Hire4Drive Team</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    //console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const sendOfflineStaffWelcomeEmail = async (userEmail, password) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: 'Welcome to Hire4Drive Offline Booking Panel',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Hire4Drive Offline Booking Panel</h2>
        <p>Hello,</p>
        <p>Your account has been created for the offline booking panel. You can now manage bookings and handle customer requests through our dedicated platform.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="margin-top: 0; color: #333;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.hire4drive.com/" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Access Panel
          </a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>Hire4Drive Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending offline staff welcome email:', error);
    throw error;
  }
};

module.exports = { sendWelcomeEmail, sendOfflineStaffWelcomeEmail };
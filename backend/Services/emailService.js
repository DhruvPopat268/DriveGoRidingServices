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
    subject: 'Welcome to DriveGo Admin Panel',
    html: `
      <h2>Welcome to DriveGo Admin Panel</h2>
      <p>Hello ${userName},</p>
      <p>Your admin account has been created successfully!</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>Login Credentials:</h3>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p><strong>Role:</strong> ${roleName}</p>
      </div>
      <p>Please login to access your dashboard.</p>
      <p>Best regards,<br>DriveGo Team</p>
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

module.exports = { sendWelcomeEmail };
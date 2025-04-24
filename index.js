import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

/* ------------------------------------------
   ✅ MongoDB Connection
------------------------------------------ */
mongoose.connect("mongodb+srv://user:1234qwer@cluster0.zukfyuo.mongodb.net/emailverify", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅'))
  .catch((err) => console.error('❌', err));

/* ------------------------------------------
   ✅ Schema & Model
------------------------------------------ */

// Email Verification Schema
const emailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
});

const EmailVerification = mongoose.model("EmailVerification", emailSchema);

// Verified Email Schema
const verifiedEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  verifiedAt: { type: Date, default: Date.now },
});

const VerifiedEmail = mongoose.model("VerifiedEmail", verifiedEmailSchema);

/* ------------------------------------------
   ✅ OTP Generator
------------------------------------------ */
const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/* ------------------------------------------
   ✅ Email Sender
------------------------------------------ */
const hostEmail = "your-email@gmail.com"; // Replace with your real Gmail
const hostPassword = "your-app-password"; // Use Gmail App Password for security

const sendOTPEmail = async ({ to, otp, htmlMessage }) => {
  const defaultHTML = `
    <div style="background:#e7fbe7;padding:20px;border-radius:10px;font-family:sans-serif;">
      <h2 style="color:#2e7d32;">🔐 OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1 style="color:#1b5e20;">${otp}</h1>
      <p>This OTP is valid for <strong>5 minutes</strong>.</p>
      <hr>
      <small style="color:#888;">Lagan Mehta - Developer</small>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: hostEmail,
      pass: hostPassword,
    },
  });

  await transporter.sendMail({
    from: `"OTP Service" <${hostEmail}>`,
    to,
    subject: "Your OTP for verification",
    html: htmlMessage || defaultHTML,
  });
};

/* ------------------------------------------
   ✅ Send OTP
------------------------------------------ */
const sendOTP = async (email) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    await EmailVerification.findOneAndUpdate(
      { email },
      { otp, otpExpiresAt: expiresAt },
      { upsert: true, new: true }
    );

    await sendOTPEmail({ to: email, otp });
    return { success: true, message: "OTP sent", otp };
  } catch (err) {
    console.error("❌ Failed to send OTP:", err.message);
    return { success: false, message: "OTP send failed" };
  }
};

/* ------------------------------------------
   ✅ Resend OTP
------------------------------------------ */
const resendOTP = async (email) => {
  return await sendOTP(email); // reuses same logic
};

/* ------------------------------------------
   ✅ Check OTP and Store Verified Email
------------------------------------------ */
const checkOTP = async (email, otp) => {
  const record = await EmailVerification.findOne({ email });

  if (!record) return { success: false, message: "Email not found" };
  if (record.otp !== otp) return { success: false, message: "Invalid OTP" };
  if (record.otpExpiresAt < new Date()) return { success: false, message: "OTP expired" };

  // OTP is valid, add email to the VerifiedEmail schema
  try {
    const verifiedEmail = new VerifiedEmail({ email });
    await verifiedEmail.save();

    // Optionally, delete the OTP record after successful verification
    await EmailVerification.deleteOne({ email });

    return { success: true, message: "OTP is valid ✅. Email verified!", email: record.email };
  } catch (err) {
    console.error("❌ Failed to add verified email:", err.message);
    return { success: false, message: "Failed to store verified email" };
  }
};

/* ------------------------------------------
   ✅ Exports
------------------------------------------ */
export { sendOTPEmail, resendOTP, checkOTP };

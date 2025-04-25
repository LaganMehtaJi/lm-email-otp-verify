import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

/* ------------------------------------------
   ✅ MongoDB Connection (Dynamic)
------------------------------------------ */
const connectDB = async (mongoUri) => {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

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
let hostEmail = "";
let hostPassword = "";

const configureEmail = (email, password) => {
  hostEmail = email;
  hostPassword = password;
};

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
  return await sendOTP(email);
};

/* ------------------------------------------
   ✅ Check OTP and Store Verified Email
------------------------------------------ */
const checkOTP = async (email, otp) => {
  const record = await EmailVerification.findOne({ email });

  if (!record) return { success: false, message: "Email not found" };
  if (record.otp !== otp) return { success: false, message: "Invalid OTP" };
  if (record.otpExpiresAt < new Date()) return { success: false, message: "OTP expired" };

  try {
    const verifiedEmail = new VerifiedEmail({ email });
    await verifiedEmail.save();
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
export { connectDB, configureEmail, sendOTP, resendOTP, checkOTP };

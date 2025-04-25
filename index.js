import fs from 'fs';
import nodemailer from 'nodemailer';

/* ------------------------------------------
   ✅ Load & Save Helpers
------------------------------------------ */
const loadUsers = () => {
  try {
    const data = fs.readFileSync('./User.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const saveUsers = (users) => {
  fs.writeFileSync('./User.json', JSON.stringify(users, null, 2));
};

/* ------------------------------------------
   ✅ Clean Expired OTPs
------------------------------------------ */
const cleanExpiredUsers = () => {
  const users = loadUsers();
  const filteredUsers = users.filter(user => Date.now() < user.expiresAt);
  if (filteredUsers.length !== users.length) {
    saveUsers(filteredUsers);
  }
  return filteredUsers;
};

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
   ✅ Email Sender Setup
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
  let users = cleanExpiredUsers();
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  const existing = users.find(u => u.email === email);
  if (existing) {
    existing.otp = otp;
    existing.expiresAt = expiresAt;
  } else {
    users.push({ id: users.length, email, otp, expiresAt });
  }

  saveUsers(users);

  try {
    await sendOTPEmail({ to: email, otp });
    console.log(`📨 OTP Sent to ${email}: ${otp}`);
    return true ;
  } catch (err) {
    console.error("❌ Failed to send OTP:", err.message);
    return false;
  }
};
/* ------------------------------------------
   ✅ Check OTP
------------------------------------------ */
const checkOTP = (email, otp) => {
  let users = cleanExpiredUsers();
  const userIndex = users.findIndex(u => u.email === email);

  if (userIndex === -1) {
    console.log("❌ OTP not verified: Email not found or OTP expired");
     return false;
  }

  if (users[userIndex].otp !== otp) {
    console.log("❌ OTP not verified: Incorrect OTP");
    return false;
  }

  console.log("✅ OTP Verified for:", email);

  // 🗑️ Delete the verified user's data
  const verifiedEmail = users[userIndex].email;
  users.splice(userIndex, 1);
  saveUsers(users);

  return {
    success: true,
    message: "OTP is valid ✅. Email verified!",
    email: verifiedEmail
  };
};


/* ------------------------------------------
   ✅ Exports
------------------------------------------ */
export { configureEmail, sendOTP, checkOTP };

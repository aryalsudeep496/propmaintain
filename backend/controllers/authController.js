const crypto = require('crypto');
const User = require('../models/User');
const { sendTokenResponse, verifyRefreshToken, generateAccessToken } = require('../utils/tokenUtils');
const { sendEmail, emailTemplates } = require('../utils/emailUtils');

// ─── Register ──────────────────────────────────────────────────────────────────
/**
 * @route  POST /api/auth/register
 * @access Public
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role = 'customer', phone } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: { email: 'Email is already registered.' },
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phone: phone || undefined,
    });

    // Generate email verification token
    const rawToken = user.generateEmailVerifyToken();
    await user.save({ validateBeforeSave: false });

    // Build verify URL
    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email/${rawToken}`;

    // Send verification email
    try {
      const { subject, html } = emailTemplates.verifyEmail(user.firstName, verifyUrl);
      await sendEmail(user.email, subject, html);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      // Don't fail registration if email fails; log and continue
    }

   // Auto-verify in development so you can test without email setup
if (process.env.NODE_ENV === 'development') {
  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  await user.save({ validateBeforeSave: false });
}

return res.status(201).json({
  success: true,
  message: process.env.NODE_ENV === 'development'
    ? 'Account created successfully. You can now log in.'
    : 'Account created successfully. Please check your email to verify your account.',
  data: {
    userId:          user._id,
    email:           user.email,
    isEmailVerified: user.isEmailVerified,
  },
});
  } catch (error) {
    console.error('Register error:', error);

    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
        errors: { email: 'Email is already registered.' },
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
};

// ─── Login ─────────────────────────────────────────────────────────────────────
/**
 * @route  POST /api/auth/login
 * @access Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fetch user WITH password field (excluded by default)
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    // Generic message prevents email enumeration
    const invalidMsg = 'Invalid email or password.';

    if (!user) {
      return res.status(401).json({ success: false, message: invalidMsg });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockMinutes} minute(s).`,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementLoginAttempts();
      const attemptsLeft = Math.max(0, 5 - (user.loginAttempts + 1));
      return res.status(401).json({
        success: false,
        message: attemptsLeft > 0
          ? `${invalidMsg} ${attemptsLeft} attempt(s) remaining before lockout.`
          : invalidMsg,
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated. Please contact support.',
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: `Account suspended: ${user.suspendedReason || 'Contact support.'}`,
      });
    }

    // Check email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        data: { email: user.email },
      });
    }

    // Reset failed attempts, update last login
    await user.resetLoginAttempts();
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save({ validateBeforeSave: false });

    return sendTokenResponse(user, 200, res, 'Login successful.');
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

// ─── Verify Email ──────────────────────────────────────────────────────────────
/**
 * @route  GET /api/auth/verify-email/:token
 * @access Public
 */
const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerifyToken:  hashedToken,
      emailVerifyExpire: { $gt: Date.now() },
    }).select('+emailVerifyToken +emailVerifyExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });
    }

    user.isEmailVerified  = true;
    user.emailVerifyToken  = undefined;
    user.emailVerifyExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      const { subject, html } = emailTemplates.welcomeEmail(user.firstName, user.role);
      await sendEmail(user.email, subject, html);
    } catch (e) {
      console.error('Welcome email failed:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ success: false, message: 'Email verification failed.' });
  }
};

// ─── Resend Verification Email ─────────────────────────────────────────────────
/**
 * @route  POST /api/auth/resend-verification
 * @access Public
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'If this email exists and is unverified, a new verification link has been sent.',
      });
    }

    const rawToken = user.generateEmailVerifyToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.CLIENT_URL}/auth/verify-email/${rawToken}`;
    const { subject, html } = emailTemplates.verifyEmail(user.firstName, verifyUrl);
    await sendEmail(user.email, subject, html);

    return res.status(200).json({
      success: true,
      message: 'A new verification email has been sent. Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend verification email.' });
  }
};

// ─── Forgot Password ───────────────────────────────────────────────────────────
/**
 * @route  POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always respond the same way to prevent email enumeration
    const successMsg = 'If an account with that email exists, a password reset link has been sent.';

    if (!user) {
      return res.status(200).json({ success: true, message: successMsg });
    }

    const rawToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/auth/reset-password/${rawToken}`;
    const { subject, html } = emailTemplates.resetPassword(user.firstName, resetUrl);

    try {
      await sendEmail(user.email, subject, html);
    } catch (emailError) {
      // Roll back tokens if email send fails
      user.resetPasswordToken  = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Failed to send reset email. Try again.' });
    }

    return res.status(200).json({ success: true, message: successMsg });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Request failed. Please try again.' });
  }
};

// ─── Reset Password ────────────────────────────────────────────────────────────
/**
 * @route  PUT /api/auth/reset-password/:token
 * @access Public
 */
const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset link. Please request a new one.',
      });
    }

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts       = 0;
    user.lockUntil           = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};

// ─── Change Password (authenticated) ──────────────────────────────────────────
/**
 * @route  PUT /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
        errors: { currentPassword: 'Current password is incorrect.' },
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
};

// ─── Refresh Token ─────────────────────────────────────────────────────────────
/**
 * @route  POST /api/auth/refresh-token
 * @access Public (uses HttpOnly cookie)
 */
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token found.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed.',
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ success: false, message: 'Token refresh failed.' });
  }
};

// ─── Logout ────────────────────────────────────────────────────────────────────
/**
 * @route  POST /api/auth/logout
 * @access Private
 */
const logout = async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ─── Get Me ────────────────────────────────────────────────────────────────────
/**
 * @route  GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshToken,
  logout,
  getMe,
};

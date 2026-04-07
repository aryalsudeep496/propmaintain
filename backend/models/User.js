const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

// ─── Sub-schemas ───────────────────────────────────────────────────────────────

const addressSchema = new mongoose.Schema({
  street:   { type: String, trim: true },
  city:     { type: String, trim: true },
  postcode: {
    type: String,
    trim: true,
    uppercase: true,
    validate: {
      validator: (v) => !v || /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(v),
      message: 'Invalid UK postcode format',
    },
  },
  country: { type: String, trim: true, default: 'UK' },
}, { _id: false });

const serviceProviderProfileSchema = new mongoose.Schema({
  businessName: {
    type: String,
    trim: true,
    maxlength: [100, 'Business name cannot exceed 100 characters'],
  },
  serviceCategories: {
    type: [String],
    enum: ['home_repair', 'home_upgrade', 'tech_digital'],
    default: [],
  },
  // Specific service types within selected categories (e.g. 'Plumbing', 'CCTV Installation')
  serviceTypes: { type: [String], default: [] },
  skills:  { type: [String], default: [] },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
  },
  availabilityRadius: {
    type: Number,
    min: [1, 'Radius must be at least 1 km'],
    max: [200, 'Radius cannot exceed 200 km'],
    default: 25,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  serviceAreaCity: { type: String, trim: true },
  isVerified:    { type: Boolean, default: false },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalReviews:  { type: Number, default: 0 },
  isAvailable:   { type: Boolean, default: true },
}, { _id: false });

// ─── Main User Schema ──────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────────────
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      match: [/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'],
    },

    // ── Contact ────────────────────────────────────────────────────────────────
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => validator.isEmail(v),
        message: 'Please provide a valid email address',
      },
    },

    // ── Phone: unique per user but optional (sparse allows multiple nulls) ─────
    phone: {
      type:   String,
      trim:   true,
      sparse: true,   // unique index below handles duplicates; sparse allows null
      default: undefined,
      validate: {
        validator: (v) => {
          if (!v) return true;
          const cleaned = v.replace(/[\s\-().+]/g, '');
          return /^\d{7,15}$/.test(cleaned);
        },
        message: 'Please provide a valid phone number',
      },
    },

    // ── Auth ───────────────────────────────────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['customer', 'provider', 'admin'],
        message: 'Role must be customer, provider, or admin',
      },
      required: [true, 'Role is required'],
      default: 'customer',
    },

    // ── Profile ────────────────────────────────────────────────────────────────
    avatar:          { type: String, default: null },
    address:         { type: addressSchema, default: () => ({}) },
    providerProfile: { type: serviceProviderProfileSchema, default: null },

    // ── Account Status ─────────────────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },
    isSuspended:     { type: Boolean, default: false },
    suspendedReason: { type: String, default: null },

    // ── Tokens ─────────────────────────────────────────────────────────────────
    emailVerifyToken:    { type: String, select: false },
    emailVerifyExpire:   { type: Date,   select: false },
    resetPasswordToken:  { type: String, select: false },
    resetPasswordExpire: { type: Date,   select: false },
    refreshToken:        { type: String, select: false },

    // ── Security Tracking ──────────────────────────────────────────────────────
    loginAttempts:     { type: Number, default: 0 },
    lockUntil:         { type: Date,   default: null },
    lastLoginAt:       { type: Date,   default: null },
    lastLoginIp:       { type: String, default: null },
    passwordChangedAt: { type: Date,   default: null },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
// Phone: unique but sparse so multiple users without a phone are allowed
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ 'providerProfile.location': '2dsphere' });
userSchema.index({ emailVerifyToken: 1 },   { sparse: true });
userSchema.index({ resetPasswordToken: 1 }, { sparse: true });

// ─── Virtuals ──────────────────────────────────────────────────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Pre-save Hooks ────────────────────────────────────────────────────────────

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
  next();
});

// Initialise provider profile when role is provider
userSchema.pre('save', function (next) {
  if (this.role === 'provider' && !this.providerProfile) {
    this.providerProfile = {};
  }
  next();
});

// ─── Instance Methods ──────────────────────────────────────────────────────────

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.generateEmailVerifyToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerifyToken  = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerifyExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return rawToken;
};

userSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken  = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return rawToken;
};

userSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set:   { loginAttempts: 0, lastLoginAt: new Date() },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedAt;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
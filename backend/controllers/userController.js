const User           = require('../models/User');
const ServiceRequest = require('../models/ServiceRequest');

// ─── Helper: emit new_job_available for every waiting job that matches this provider ──
const notifyProviderOfWaitingJobs = async (provider, io) => {
  if (!io) return;

  const categories   = provider.providerProfile?.serviceCategories || [];
  const serviceTypes = provider.providerProfile?.serviceTypes      || [];

  const filter = {
    status:   { $in: ['pending', 'scheduled'] },
    provider: null,   // unassigned
  };
  if (categories.length > 0)   filter.category    = { $in: categories };
  if (serviceTypes.length > 0) filter.serviceType = { $in: serviceTypes };

  const waitingJobs = await ServiceRequest.find(filter)
    .populate('customer', 'firstName lastName')
    .limit(30)
    .lean();

  if (waitingJobs.length === 0) {
    console.log(`📭 Provider ${provider.email} came online — no waiting jobs match their profile`);
    return;
  }

  console.log(`📬 Provider ${provider.email} came online — notifying of ${waitingJobs.length} waiting job(s)`);

  for (const job of waitingJobs) {
    const customerName = job.customer
      ? `${job.customer.firstName} ${job.customer.lastName}`
      : 'Customer';

    io.to(`user:${provider._id}`).emit('new_job_available', {
      requestId:    job._id.toString(),
      title:        job.title,
      customerName,
      category:     job.category,
      urgency:      job.urgency,
      city:         job.location?.city || '',
      role:         'provider',
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET OWN PROFILE
// @route  GET /api/users/profile
// @access Auth
// ══════════════════════════════════════════════════════════════════════════════
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE OWN PROFILE
// @route  PUT /api/users/profile
// @access Auth
// ══════════════════════════════════════════════════════════════════════════════
const updateProfile = async (req, res) => {
  try {
    const {
      firstName, lastName, phone,
      businessName, serviceCategories, serviceTypes,
      skills, bio, availabilityRadius,
      serviceAreaLocation, serviceAreaCity,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // ── Base fields ──
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName  !== undefined) user.lastName  = lastName;
    if (phone     !== undefined) user.phone     = phone || undefined;

    // ── Provider-only fields ──
    let categoriesChanged = false;
    if (user.role === 'provider') {
      if (!user.providerProfile) user.providerProfile = {};

      if (businessName        !== undefined) user.providerProfile.businessName        = businessName;
      if (serviceCategories   !== undefined) {
        categoriesChanged = JSON.stringify(user.providerProfile.serviceCategories) !== JSON.stringify(serviceCategories);
        user.providerProfile.serviceCategories = serviceCategories;
      }
      if (serviceTypes        !== undefined) {
        if (!categoriesChanged) {
          categoriesChanged = JSON.stringify(user.providerProfile.serviceTypes) !== JSON.stringify(serviceTypes);
        }
        user.providerProfile.serviceTypes = serviceTypes;
      }
      if (skills              !== undefined) user.providerProfile.skills              = skills;
      if (bio                 !== undefined) user.providerProfile.bio                 = bio;
      if (availabilityRadius  !== undefined) user.providerProfile.availabilityRadius  = availabilityRadius;
      if (serviceAreaLocation !== undefined) user.providerProfile.location            = serviceAreaLocation;
      if (serviceAreaCity     !== undefined) user.providerProfile.serviceAreaCity     = serviceAreaCity;
    }

    if (user.role === 'provider') user.markModified('providerProfile');
    await user.save({ validateBeforeSave: true });
    console.log(`✏️  Profile updated: ${user.email}`);

    // If provider is currently available and changed their categories/types,
    // notify them about any waiting jobs that now match their new profile
    if (user.role === 'provider' && categoriesChanged && user.providerProfile?.isAvailable) {
      await notifyProviderOfWaitingJobs(user, req.app.get('io'));
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data:    user,
    });

  } catch (error) {
    console.error('updateProfile error:', error);
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: msg });
    }
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Phone number already in use.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// TOGGLE AVAILABILITY
// @route  PUT /api/users/availability
// @access Provider
// ══════════════════════════════════════════════════════════════════════════════
const toggleAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user?.providerProfile) {
      return res.status(400).json({ success: false, message: 'Provider profile not found.' });
    }

    const wasUnavailable = !user.providerProfile.isAvailable;
    user.providerProfile.isAvailable = !user.providerProfile.isAvailable;
    user.markModified('providerProfile');
    await user.save({ validateBeforeSave: false });

    const nowAvailable = user.providerProfile.isAvailable;
    const status = nowAvailable ? 'available' : 'unavailable';
    console.log(`🔄 Provider ${user.email} is now ${status}`);

    // When provider just came back online, notify them about waiting jobs
    if (wasUnavailable && nowAvailable) {
      await notifyProviderOfWaitingJobs(user, req.app.get('io'));
    }

    return res.status(200).json({
      success:     true,
      message:     `You are now ${status}.`,
      isAvailable: nowAvailable,
    });

  } catch (error) {
    console.error('toggleAvailability error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle availability.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL PROVIDERS
// @route  GET /api/users/admin/providers
// @access Admin
// ══════════════════════════════════════════════════════════════════════════════
const adminGetProviders = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { role: 'provider' };

    const total     = await User.countDocuments(filter);
    const providers = await User.find(filter)
      .select('-password -refreshToken -emailVerifyToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data:    providers,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('adminGetProviders error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch providers.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: VERIFY PROVIDER
// @route  PUT /api/users/admin/providers/:id/verify
// @access Admin
// ══════════════════════════════════════════════════════════════════════════════
const adminVerifyProvider = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'provider') {
      return res.status(404).json({ success: false, message: 'Provider not found.' });
    }

    if (!user.providerProfile) user.providerProfile = {};
    user.providerProfile.isVerified = true;
    await user.save({ validateBeforeSave: false });
    console.log(`✅ Provider verified by admin: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: `Provider ${user.firstName} ${user.lastName} has been verified.`,
      data:    user,
    });

  } catch (error) {
    console.error('adminVerifyProvider error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify provider.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL CUSTOMERS
// @route  GET /api/users/admin/customers
// @access Admin
// ══════════════════════════════════════════════════════════════════════════════
const adminGetCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { role: 'customer' };

    const total     = await User.countDocuments(filter);
    const customers = await User.find(filter)
      .select('-password -refreshToken -emailVerifyToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      data:    customers,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });

  } catch (error) {
    console.error('adminGetCustomers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: TOGGLE SUSPEND
// @route  PUT /api/users/admin/users/:id/suspend
// @access Admin
// ══════════════════════════════════════════════════════════════════════════════
const adminToggleSuspend = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot suspend another admin.' });
    }

    user.isSuspended     = !user.isSuspended;
    user.suspendedReason = user.isSuspended ? (req.body.reason || 'Suspended by admin') : null;
    await user.save({ validateBeforeSave: false });

    const action = user.isSuspended ? 'suspended' : 'unsuspended';
    console.log(`🔐 User ${user.email} ${action} by admin`);

    return res.status(200).json({
      success:     true,
      message:     `User has been ${action}.`,
      isSuspended: user.isSuspended,
    });

  } catch (error) {
    console.error('adminToggleSuspend error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle suspension.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN: GET STATS
// @route  GET /api/users/admin/stats
// @access Admin
// ══════════════════════════════════════════════════════════════════════════════
const adminGetStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProviders,
      totalCustomers,
      availableProviders,
      unavailableProviders,
      totalRequests,
      completedRequests,
      pendingRequests,
      inProgressRequests,
      cancelledRequests,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider', 'providerProfile.isAvailable': true }),
      User.countDocuments({ role: 'provider', 'providerProfile.isAvailable': false }),
      ServiceRequest.countDocuments({}),
      ServiceRequest.countDocuments({ status: 'completed' }),
      ServiceRequest.countDocuments({ status: 'pending' }),
      ServiceRequest.countDocuments({ status: 'in_progress' }),
      ServiceRequest.countDocuments({ status: 'cancelled' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalProviders,
        totalCustomers,
        availableProviders,
        unavailableProviders,
        totalRequests,
        completedRequests,
        pendingRequests,
        inProgressRequests,
        cancelledRequests,
      },
    });

  } catch (error) {
    console.error('adminGetStats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  toggleAvailability,
  adminGetProviders,
  adminVerifyProvider,
  adminGetCustomers,
  adminToggleSuspend,
  adminGetStats,
};

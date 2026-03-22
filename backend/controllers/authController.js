const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

/* ====================================================== */
/* TOKEN GENERATOR */
/* ====================================================== */

const generateToken = (user) => {
  const secret =
    process.env.JWT_SECRET || 'fallback_secret_change_in_production'

  return jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: '7d',
  })
}

/* ====================================================== */
/* REGISTER USER */
/* ====================================================== */

const register = async (req, res) => {
  console.log(
    '🔍 [REGISTER] Raw req.body:',
    JSON.stringify({
      ...req.body,
      password: req.body.password?.substring(0, 2) + '...',
    }),
  )
  console.log('🔍 [REGISTER] Raw password:', `'${req.body.password}'`)
  console.log('🔍 [REGISTER] Raw length:', req.body.password?.length)
  const rawPassword = req.body.password || ''
  const trimmedPassword = rawPassword.trim()
  console.log('🔍 [REGISTER] Trimmed password:', `'${trimmedPassword}'`)
  console.log('🔍 [REGISTER] Trimmed length:', trimmedPassword.length)
  const { name, email, role, phone, college, batch } = req.body

  try {
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res
        .status(400)
        .json({ message: 'Email already registered. Try logging in instead.' })
    }

    const nameRegex = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/

    if (!name || !nameRegex.test(name)) {
      return res
        .status(400)
        .json({ message: 'Name must contain only letters and numbers.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' })
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

    if (!trimmedPassword || !passwordRegex.test(trimmedPassword)) {
      return res.status(400).json({
        message:
          'Password must contain uppercase, lowercase, number, and special character.',
      })
    }

    const user = new User({
      name,
      email,
      password: trimmedPassword, // Use trimmed password
      role: role || 'user',
      phone: phone || '',
      college: college || '',
      batch: batch || '',
    })

    await user.save()

    // Fetch saved user to log final stored hash
    const savedUser = await User.findOne({ email }).select('password')
    console.log(
      '🔍 [REGISTER] FINAL stored hash:',
      savedUser?.password?.substring(0, 20) + '...',
    )

    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        college: user.college,
        batch: user.batch,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)

    res.status(500).json({
      message: 'Server error. Please try again later.',
    })
  }
}

/* ====================================================== */
/* LOGIN USER (AUTO REGISTER) */
/* ====================================================== */

const login = async (req, res) => {
  try {
    console.log(
      '🔍 [LOGIN] Raw req.body:',
      JSON.stringify({
        ...req.body,
        password: req.body.password?.substring(0, 2) + '...',
      }),
    )
    console.log('🔍 [LOGIN] Raw entered email:', `'${req.body.email}'`)
    const rawPassword = req.body.password || ''
    console.log('🔍 [LOGIN] Raw password:', `'${rawPassword}'`)
    console.log('🔍 [LOGIN] Raw length:', rawPassword.length)
    const { email, password } = req.body
    const cleanPassword = password.trim()
    console.log('🔍 [LOGIN] Clean password (trimmed):', `'${cleanPassword}'`)
    console.log('🔍 [LOGIN] Clean length:', cleanPassword.length)
    console.log(
      '🔍 [LOGIN] First char codes:',
      Array.from(cleanPassword.slice(0, 5))
        .map((c) => c.charCodeAt(0))
        .join(', '),
    )

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password required',
      })
    }

    let user = await User.findOne({ email })
    console.log(
      '🔍 [LOGIN] Stored hash preview:',
      user?.password ? `'${user.password.substring(0, 20)}...'` : 'NO USER',
    )

    if (!user) {
      return res.status(404).json({
        message: 'User not found. Please register first.',
      })
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password)
    console.log(
      '🔍 [LOGIN] bcrypt.compare(cleanPassword, hash) result:',
      isMatch,
    )
    console.log('🔍 [LOGIN] DEBUG END')

    if (!isMatch) {
      return res.status(401).json({
        message: 'Incorrect password',
      })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken(user)

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        college: user.college,
        batch: user.batch,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error('Login error:', error)

    res.status(500).json({
      message: 'Server error',
    })
  }
}

/* ====================================================== */
/* GET PROFILE */
/* ====================================================== */

const getProfile = async (req, res) => {
  console.log(
    `📋 [${req.requestId || 'NO-ID'}] PROFILE API HIT - USER:`,
    req.user?._id,
  )
  try {
    console.log(`👤 [${req.requestId || 'NO-ID'}] FETCHING PROFILE FROM DB`)
    const user = await User.findById(req.user._id).select('-password')
    console.log(
      `✅ [${req.requestId || 'NO-ID'}] PROFILE RESPONSE SENT:`,
      user?._id || 'NULL',
    )

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.status(200).json(user)
  } catch (error) {
    console.error('Get profile error:', error)

    res.status(500).json({
      message: 'Error fetching profile',
    })
  }
}

/* ====================================================== */
/* UPDATE PROFILE */
/* ====================================================== */

const updateProfile = async (req, res) => {
  console.log('🚀 PROFILE UPDATE START')
  console.log('👉 USER:', req.user)
  console.log('👉 BODY:', req.body)
  const { name, phone, college, batch, bio } = req.body

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (college !== undefined) user.college = college
    if (batch !== undefined) user.batch = batch
    if (bio !== undefined) user.bio = bio

    await user.save()

    res.status(200).json({
      message: 'Profile updated successfully',
      user,
    })
  } catch (error) {
    console.error('Update profile error:', error)

    res.status(500).json({
      message: 'Error updating profile',
    })
  }
}

/* ====================================================== */
/* UPLOAD PROFILE PHOTO */
/* ====================================================== */

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
      })
    }

    const profilePhotoUrl = `/uploads/${req.file.filename}`

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: profilePhotoUrl },
      { new: true },
    )

    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: user.profilePhoto,
    })
  } catch (error) {
    console.error('Upload photo error:', error)

    res.status(500).json({
      message: 'Error uploading photo',
    })
  }
}

/* ====================================================== */
/* CHANGE PASSWORD */
/* ====================================================== */

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)

    if (!isMatch) {
      return res.status(400).json({
        message: 'Current password is incorrect',
      })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    user.password = hashedPassword

    await user.save()

    res.status(200).json({
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Change password error:', error)

    res.status(500).json({
      message: 'Error changing password',
    })
  }
}

/* ====================================================== */
/* GET USER BY ID */
/* ====================================================== */

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      })
    }

    res.status(200).json(user)
  } catch (error) {
    console.error('Get user error:', error)

    res.status(500).json({
      message: 'Error fetching user',
    })
  }
}

/* ====================================================== */
/* BECOME ORGANIZER */
/* ====================================================== */

const becomeOrganizer = async (req, res) => {
  const { organizerName, organizationName, category } = req.body

  try {
    const user = await User.findById(req.user._id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: {},
        error: 'USER_NOT_FOUND',
      })
    }

    if (user.role === 'organizer') {
      return res.status(400).json({
        success: false,
        message: 'You are already an organizer',
        data: {},
        error: 'ALREADY_ORGANIZER',
      })
    }

    user.role = 'organizer'
    user.organizerName = organizerName || user.name
    user.organizationName = organizationName || ''
    user.category = category || ''

    await user.save()

    await createAuditLog('USER_BECAME_ORGANIZER', user._id, null, {
      userId: user._id,
      oldRole: 'user',
      newRole: 'organizer',
    })

    res.status(200).json({
      success: true,
      message: 'Successfully activated as organizer',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizerName: user.organizerName,
          organizationName: user.organizationName,
          category: user.category,
        },
      },
      error: null,
    })
  } catch (error) {
    console.error('Become organizer error:', error)
    paymentLogger.logPaymentEvent(
      'BECOME_ORGANIZER_ERROR',
      req.user?._id,
      null,
      null,
      error,
    )

    res.status(500).json({
      success: false,
      message: 'Error activating organizer',
      data: {},
      error: error.message,
    })
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  changePassword,
  getUserById,
  becomeOrganizer,
}

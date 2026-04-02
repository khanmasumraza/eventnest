const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')

/* ====================================================== */
/* TOKEN GENERATOR                                        */
/* ====================================================== */

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_change_in_production'
  return jwt.sign({ id: user._id, role: user.role }, secret, { expiresIn: '7d' })
}

/* ====================================================== */
/* REGISTER                                               */
/* ====================================================== */

const register = async (req, res) => {
  console.log('🔍 [REGISTER] req.body:', JSON.stringify({
    ...req.body,
    password: req.body.password?.substring(0, 2) + '...',
  }))
  const rawPassword = req.body.password || ''
  const trimmedPassword = rawPassword.trim()
  const { name, email, role, phone, college, batch } = req.body

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered. Try logging in instead.' })
    }

    const nameRegex = /^[A-Za-z0-9]+( [A-Za-z0-9]+)*$/
    if (!name || !nameRegex.test(name)) {
      return res.status(400).json({ message: 'Name must contain only letters and numbers.' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format.' })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!trimmedPassword || !passwordRegex.test(trimmedPassword)) {
      return res.status(400).json({
        message: 'Password must contain uppercase, lowercase, number, and special character.',
      })
    }

    const user = new User({
      name, email, password: trimmedPassword,
      role: role || 'user',
      phone: phone || '', college: college || '', batch: batch || '',
    })

    await user.save()
    const token = generateToken(user)

    res.status(201).json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        phone: user.phone, college: user.college, batch: user.batch,
        profilePhoto: user.profilePhoto, bio: user.bio,
      },
    })
  } catch (error) {
    console.error('❌ [REGISTER] Error:', error)
    res.status(500).json({ message: 'Server error. Please try again later.' })
  }
}

/* ====================================================== */
/* LOGIN                                                  */
/* ====================================================== */

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const cleanPassword = password.trim()

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register first.' })
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' })
    }

    user.lastLogin = new Date()
    await user.save()

    const token = generateToken(user)
    console.log(`✅ [LOGIN] ${user.email} logged in | role: ${user.role}`)

    res.status(200).json({
      token,
      user: {
        id: user._id, name: user.name, email: user.email, role: user.role,
        phone: user.phone, college: user.college, batch: user.batch,
        profilePhoto: user.profilePhoto, bio: user.bio,
      },
    })
  } catch (error) {
    console.error('❌ [LOGIN] Error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

/* ====================================================== */
/* GET PROFILE                                            */
/* ====================================================== */

const getProfile = async (req, res) => {
  const reqId = req.requestId || Date.now()
  console.log(`📋 [${reqId}] PROFILE HIT | user._id: ${req.user?._id}`)
  console.log(`   └─ Authorization header: ${req.headers.authorization?.substring(0, 50)}`)

  try {
    const user = await User.findById(req.user._id).select('-password')

    if (!user) {
      console.error(`❌ [${reqId}] User not found in DB`)
      return res.status(404).json({ message: 'User not found' })
    }

    console.log(`✅ [${reqId}] Profile returning: ${user.email} | role: "${user.role}"`)
    res.status(200).json(user)
  } catch (error) {
    console.error(`❌ [${reqId}] getProfile error:`, error)
    res.status(500).json({ message: 'Error fetching profile' })
  }
}

/* ====================================================== */
/* UPDATE PROFILE                                         */
/* ====================================================== */

const updateProfile = async (req, res) => {
  const { name, phone, college, batch, bio } = req.body
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (college !== undefined) user.college = college
    if (batch !== undefined) user.batch = batch
    if (bio !== undefined) user.bio = bio

    await user.save()
    res.status(200).json({ message: 'Profile updated successfully', user })
  } catch (error) {
    console.error('❌ [UPDATE-PROFILE] Error:', error)
    res.status(500).json({ message: 'Error updating profile' })
  }
}

/* ====================================================== */
/* UPLOAD PROFILE PHOTO                                   */
/* ====================================================== */

const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const profilePhotoUrl = `/uploads/${req.file.filename}`
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePhoto: profilePhotoUrl },
      { new: true }
    )

    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      profilePhoto: user.profilePhoto,
    })
  } catch (error) {
    console.error('❌ [UPLOAD-PHOTO] Error:', error)
    res.status(500).json({ message: 'Error uploading photo' })
  }
}

/* ====================================================== */
/* CHANGE PASSWORD                                        */
/* ====================================================== */

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' })

    user.password = await bcrypt.hash(newPassword, 10)
    await user.save()
    res.status(200).json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('❌ [CHANGE-PASSWORD] Error:', error)
    res.status(500).json({ message: 'Error changing password' })
  }
}

/* ====================================================== */
/* GET USER BY ID                                         */
/* ====================================================== */

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.status(200).json(user)
  } catch (error) {
    console.error('❌ [GET-USER-BY-ID] Error:', error)
    res.status(500).json({ message: 'Error fetching user' })
  }
}

/* ====================================================== */
/* BECOME ORGANIZER                                       */
/* ====================================================== */

const becomeOrganizer = async (req, res) => {
  const reqId = Date.now()
  console.log(`\n🚀 [${reqId}] BECOME-ORGANIZER HIT`)
  console.log(`   ├─ req.user:`, JSON.stringify(req.user))
  console.log(`   ├─ req.body:`, JSON.stringify(req.body))
  console.log(`   └─ auth header:`, req.headers.authorization?.substring(0, 50))

  const { organizerName, organizationName, category } = req.body

  try {
    console.log(`🔍 [${reqId}] Finding user: ${req.user._id}`)
    const user = await User.findById(req.user._id)

    if (!user) {
      console.error(`❌ [${reqId}] User NOT FOUND in DB`)
      return res.status(404).json({ success: false, message: 'User not found', error: 'USER_NOT_FOUND' })
    }

    console.log(`✅ [${reqId}] Found: ${user.email} | current role: "${user.role}"`)

    if (user.role === 'organizer') {
      console.warn(`⚠️ [${reqId}] Already organizer — returning fresh token`)
      const freshToken = generateToken(user)
      return res.status(400).json({
        success: false, message: 'You are already an organizer',
        token: freshToken, error: 'ALREADY_ORGANIZER',
      })
    }

    console.log(`📝 [${reqId}] Setting role = 'organizer'`)
    console.log(`   └─ isModified before:`, user.isModified('role'))

    user.role = 'organizer'
    user.organizerName = organizerName || user.name
    user.organizationName = organizationName || ''
    user.category = category || ''

    console.log(`   └─ user.role before save:`, user.role)
    console.log(`   └─ isModified after:`, user.isModified('role'))

    await user.save()
    console.log(`💾 [${reqId}] user.save() complete`)

    // Immediately re-fetch to confirm DB write
    const verify = await User.findById(user._id).select('role email')
    console.log(`🔎 [${reqId}] DB VERIFY: email=${verify.email} | role="${verify.role}"`)

    if (verify.role !== 'organizer') {
      console.error(`🔥 [${reqId}] SILENT WRITE FAIL — DB still shows role: "${verify.role}"`)
      return res.status(500).json({
        success: false,
        message: 'Role update failed silently in DB',
        error: 'DB_WRITE_FAILED',
      })
    }

    const newToken = generateToken(user)
    console.log(`🔑 [${reqId}] New token issued | role in payload: "organizer"`)
    console.log(`✅ [${reqId}] Sending 200 success response`)

    res.status(200).json({
      success: true,
      message: 'Successfully activated as organizer',
      token: newToken,
      data: {
        user: {
          id: user._id, name: user.name, email: user.email, role: user.role,
          organizerName: user.organizerName,
          organizationName: user.organizationName,
          category: user.category,
        },
      },
      error: null,
    })
  } catch (error) {
    console.error(`💥 [${reqId}] EXCEPTION:`)
    console.error(`   ├─ message:`, error.message)
    console.error(`   ├─ name:`, error.name)
    console.error(`   └─ stack:`, error.stack)
    res.status(500).json({ success: false, message: 'Error activating organizer', error: error.message })
  }
}

module.exports = {
  register, login, getProfile, updateProfile,
  uploadProfilePhoto, changePassword, getUserById, becomeOrganizer,
}
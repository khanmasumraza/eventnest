const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/User')

module.exports = function (passport) {

  /* ============================================================ */
  /* VALIDATE ENV VARS AT STRATEGY REGISTRATION TIME              */
  /* ============================================================ */
  // These are checked here — not at file load time —
  // so dotenv.config() in server.js has already run
  const clientID = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientID) {
    console.error('❌ FATAL: GOOGLE_CLIENT_ID is not defined in .env')
    throw new Error('GOOGLE_CLIENT_ID is required for Google OAuth')
  }

  if (!clientSecret) {
    console.error('❌ FATAL: GOOGLE_CLIENT_SECRET is not defined in .env')
    throw new Error('GOOGLE_CLIENT_SECRET is required for Google OAuth')
  }

  console.log('✅ Google OAuth strategy initializing...')
  console.log('Client ID loaded:', clientID.substring(0, 10) + '...')
  console.log('Callback URL: http://localhost:5000/api/auth/google/callback')

  /* ============================================================ */
  /* GOOGLE STRATEGY                                              */
  /* ============================================================ */
  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: 'http://localhost:5000/api/auth/google/callback',

        // Passes the request object into the verify callback
        // Useful for logging requestId in future
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile, done) => {
        console.log('🔄 Google verify callback triggered')

        try {
          /* ── Validate profile ───────────────────────────────── */
          if (!profile) {
            console.error('❌ Google returned empty profile')
            return done(new Error('Google returned empty profile'), null)
          }

          if (!profile.emails || profile.emails.length === 0) {
            console.error('❌ Google profile missing email')
            return done(new Error('Google profile missing email'), null)
          }

          const googleEmail = profile.emails[0].value
          const googleId = profile.id

          // FIX: Fallback for missing displayName
          const displayName =
            profile.displayName ||
            profile.name?.givenName ||
            googleEmail.split('@')[0] ||
            'User'

          const avatar = profile.photos?.[0]?.value || ''

          console.log('📧 Google login email:', googleEmail)

          /* ── Case 1: User exists by googleId ────────────────── */
          let user = await User.findOne({ googleId })

          if (user) {
            console.log('✅ Existing user found by googleId:', user.email)

            user.lastLogin = new Date()

            // Update avatar if not set
            if (!user.avatar && avatar) {
              user.avatar = avatar
            }

            try {
              await user.save()
            } catch (saveError) {
              // Non-fatal — user found, login can proceed even if save fails
              console.error('⚠️ Failed to update lastLogin:', saveError.message)
            }

            return done(null, user)
          }

          /* ── Case 2: User exists by email (link accounts) ───── */
          user = await User.findOne({ email: googleEmail })

          if (user) {
            console.log('✅ Existing user found by email, linking Google account:', user.email)

            user.googleId = googleId
            user.provider = 'google'
            user.lastLogin = new Date()

            if (!user.avatar && avatar) {
              user.avatar = avatar
            }

            try {
              await user.save()
            } catch (saveError) {
              console.error('⚠️ Failed to link Google account:', saveError.message)
              // Fatal here — we found the user but couldn't link
              // Return the user anyway so login succeeds
            }

            return done(null, user)
          }

          /* ── Case 3: New user — create account ──────────────── */
          console.log('🆕 Creating new Google user for:', googleEmail)

          const newUser = await User.create({
            googleId,
            name: displayName,
            email: googleEmail,
            provider: 'google',
            avatar,
            lastLogin: new Date(),
          })

          console.log('✅ New Google user created:', newUser.email)
          return done(null, newUser)

        } catch (error) {
          console.error('❌ Google OAuth verify error:', error.message)

          // Handle MongoDB duplicate key error
          // Can happen in rare race condition where two requests
          // try to create the same user simultaneously
          if (error.code === 11000) {
            console.error('⚠️ Duplicate key error — attempting user lookup')
            try {
              const existingUser = await User.findOne({
                $or: [
                  { googleId: profile.id },
                  { email: profile.emails?.[0]?.value },
                ],
              })
              if (existingUser) {
                console.log('✅ Recovered from duplicate key — user found')
                return done(null, existingUser)
              }
            } catch (recoveryError) {
              console.error('❌ Recovery lookup failed:', recoveryError.message)
            }
          }

          return done(error, null)
        }
      },
    ),
  )

  console.log('✅ Google OAuth strategy registered successfully')
}
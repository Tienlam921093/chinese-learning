/**
 * PASSPORT CONFIG — Google + Facebook OAuth
 * Dùng UserModel.findOrCreateOAuth thay vì query trực tiếp
 *
 * FIX N19: Đọc OAuth secrets qua env.js (hỗ trợ Docker secret files)
 */
const passport        = require('passport');
const GoogleStrategy  = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const UserModel       = require('../models/user.model');
const env             = require('./env');

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ── Google ──
if (env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy(
    {
      clientID:     env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL:  `${env.BASE_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await UserModel.findOrCreateOAuth({
          name:       profile.displayName,
          email:      profile.emails?.[0]?.value || `${profile.id}@google.oauth`,
          provider:   'google',
          providerId: profile.id,
          avatarUrl:  profile.photos?.[0]?.value || null,
        });
        done(null, user);
      } catch (err) {
        console.error('[OAuth] Google error:', err.message);
        done(err);
      }
    }
  ));
}

// ── Facebook ──
if (env.FACEBOOK_APP_ID) {
  passport.use(new FacebookStrategy(
    {
      clientID:     env.FACEBOOK_APP_ID,
      clientSecret: env.FACEBOOK_APP_SECRET,
      callbackURL:  `${env.BASE_URL}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await UserModel.findOrCreateOAuth({
          name:       profile.displayName,
          email:      profile.emails?.[0]?.value || `${profile.id}@facebook.oauth`,
          provider:   'facebook',
          providerId: profile.id,
          avatarUrl:  profile.photos?.[0]?.value || null,
        });
        done(null, user);
      } catch (err) {
        console.error('[OAuth] Facebook error:', err.message);
        done(err);
      }
    }
  ));
}

module.exports = passport;


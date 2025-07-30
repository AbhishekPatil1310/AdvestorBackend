const fp = require('fastify-plugin');
const env = require('../config/env');
const User = require('../models/user.model');
const {
  generateRefreshToken,
  revokeRefreshToken,
  seconds,
} = require('../utils/token.util');
// for fastify.authentication
function setAuthCookies(reply, accessToken, refreshToken) {
  const isProd = env.NODE_ENV === 'production';

  reply
    .setCookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: seconds(env.JWT_ACCESS_EXPIRES_IN),
    })
    .setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/', // ✅ match with controller logout()
      maxAge: seconds(env.JWT_REFRESH_EXPIRES_IN),
    });
}

async function jwtPlugin(fastify) {
  // 1️⃣ Register fastify-jwt
  fastify.register(require('@fastify/jwt'), {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES_IN },
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  // 2️⃣ Auth decorator with refresh-token fallback
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      // Try access token
      await request.jwtVerify();
    } catch (err) {
      // Access token failed → try refresh token
      const refreshToken = request.cookies.refreshToken;
      if (!refreshToken) {
        return reply.unauthorized('Not authenticated');
      }

      let decoded;
      try {
        decoded = await this.jwt.verify(refreshToken);
      } catch {
        return reply.unauthorized('Invalid refresh token');
      }

      const user = await User.findById(decoded.sub).select('-password');
      if (!user) return reply.unauthorized('User not found');

      const newAccessToken = await reply.jwtSign({
        sub: user._id,
        role: user.role,
      });

      setAuthCookies(reply, newAccessToken, refreshToken);

      request.user = { sub: user._id, role: user.role };
      request.userData = user; // ✅ reuse loaded user
      return;
    }

    // If access token was valid, fetch full user details
    const user = await User.findById(request.user.sub).select('-password');
    if (!user) return reply.unauthorized('User not found');

    request.userData = user;
  });
}

module.exports = fp(jwtPlugin);

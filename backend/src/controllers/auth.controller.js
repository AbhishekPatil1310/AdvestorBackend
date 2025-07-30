const User = require('../models/user.model');
const Token = require('../models/token.model');
const {
  generateRefreshToken,
  revokeRefreshToken,
  seconds,
} = require('../utils/token.util');
const env = require('../config/env');

/**
 * Helper: sets HTTP‑only auth cookies.
 */
function setAuthCookies(reply, accessToken, refreshToken) {
  const accessMaxAge = seconds(env.JWT_ACCESS_EXPIRES_IN);
  const refreshMaxAge = seconds(env.JWT_REFRESH_EXPIRES_IN);

  reply
    .setCookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: '/',
      maxAge: accessMaxAge,
    })
    .setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      path: 'api/v1/auth',
      maxAge: refreshMaxAge,
    });
}

/* ───────────────── register ───────────────── */
module.exports.register = async function register(request, reply) {
  try {
    const { name, email, password, role = 'user' } = request.body;

    const existing = await User.findOne({ email });
    if (existing) return reply.badRequest('Email already registered');
    if (!['user', 'advertiser', 'admin'].includes(role))
      return reply.badRequest('Invalid role');

    const user = await User.create({ name, email, password, role });

    const accessToken = await reply.jwtSign({ sub: user._id, role: user.role });
    const refreshToken = await generateRefreshToken(user._id, reply);

    setAuthCookies(reply, accessToken, refreshToken);

    reply.code(201).send({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    request.log.error(err);
    reply.internalServerError();
  }
};

/* ───────────────── login ───────────────── */
module.exports.login = async function login(request, reply) {
  try {
    const { email, password } = request.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) return reply.unauthorized('Invalid credentials');

    const isMatch = await user.isPasswordMatch(password);
    if (!isMatch) return reply.unauthorized('Invalid credentials');

    const accessToken = await reply.jwtSign({ sub: user._id, role: user.role });
    const refreshToken = await generateRefreshToken(user._id, reply);

    setAuthCookies(reply, accessToken, refreshToken);

    reply.send({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    request.log.error(err);
    reply.internalServerError();
  }
};

/* ───────────────── refresh ───────────────── */
// src/controllers/auth.controller.js
module.exports.refresh = async function refresh(request, reply) {
  try {
    // 1️⃣  read the token from body OR cookie
    const refreshToken =
      request.body?.refreshToken || request.cookies.refreshToken;
    if (!refreshToken) return reply.badRequest('Refresh token required');

    // 2️⃣  verify *explicit* token string
    let decoded;
    try {
      //  ✨  `this` inside a Fastify handler === fastify instance
      decoded = await this.jwt.verify(refreshToken);
      //            ↑↑              ↑↑
      //            fastify.jwt.verify(token)
    } catch {
      return reply.unauthorized('Invalid refresh token');
    }

    // 3️⃣  confirm the token is still in DB
    const tokenHash = Token.createHashedToken(refreshToken);
    const stored = await Token.findOne({ tokenHash, user: decoded.sub });
    if (!stored) return reply.unauthorized('Refresh token revoked');

    // 4️⃣  issue new access token, reuse refresh token
    const accessToken = await reply.jwtSign({
      sub: decoded.sub,
      role: decoded.role,
    });
    setAuthCookies(reply, accessToken, refreshToken);

    return reply.send({ accessToken });
  } catch (err) {
    request.log.error(err);
    reply.internalServerError();
  }
};

/* ───────────────── logout ───────────────── */
module.exports.logout = async function logout(request, reply) {
  try {
    const refreshToken =
      request.body?.refreshToken || request.cookies.refreshToken;
    if (refreshToken) await revokeRefreshToken(refreshToken);

    reply
      .clearCookie('accessToken', { path: '/' })
      .clearCookie('refreshToken', { path: '/api/v1/auth' })
      .send({ message: 'Logged out' });
  } catch (err) {
    request.log.error(err);
    reply.internalServerError();
  }
};

module.exports.getCurrentUser = async function (request, reply) {
  try {
    reply.send({ user: request.userData });
  } catch (err) {
    request.log.error(err);
    reply.internalServerError();
  }
};

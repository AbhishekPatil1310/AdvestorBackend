const crypto = require('crypto');
const env = require('../config/env');
const Token = require('../models/token.model');

function seconds(str) {
  const match = /([0-9]+)([smhd])/i.exec(str);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 0;
  }
}

async function generateRefreshToken(userId, reply) {
  const refreshToken = await reply.jwtSign(
    { sub: userId },
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
  );

  const tokenHash = Token.createHashedToken(refreshToken);
  const expiresSeconds = seconds(env.JWT_REFRESH_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresSeconds * 1000);

  await Token.create({ tokenHash, user: userId, expiresAt });

  return refreshToken;
}

async function revokeRefreshToken(token) {
  const tokenHash = Token.createHashedToken(token);
  await Token.deleteOne({ tokenHash });
}

module.exports = { seconds, generateRefreshToken, revokeRefreshToken };

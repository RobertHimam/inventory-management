"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = createAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = require("jsonwebtoken");
const crypto_1 = require("crypto");
function createAccessToken(payload, secret, ttlSeconds = 900) {
    const now = Math.floor(Date.now() / 1000);
    const payloadWithExp = { ...payload, exp: now + ttlSeconds };
    return (0, jsonwebtoken_1.sign)(payloadWithExp, secret);
}
function verifyAccessToken(token, secret) {
    try {
        const decoded = (0, jsonwebtoken_1.verify)(token, secret);
        return { sub: decoded.sub, role: decoded.role };
    }
    catch (err) {
        return null;
    }
}
function createRefreshToken(payload, secret, ttlSeconds = 604800) {
    const now = Math.floor(Date.now() / 1000);
    const payloadWithJti = { ...payload, jti: (0, crypto_1.randomUUID)(), exp: now + ttlSeconds };
    return (0, jsonwebtoken_1.sign)(payloadWithJti, secret);
}
function verifyRefreshToken(token, secret) {
    try {
        const decoded = (0, jsonwebtoken_1.verify)(token, secret);
        return { sub: decoded.sub, role: decoded.role, jti: decoded.jti };
    }
    catch (err) {
        return null;
    }
}
//# sourceMappingURL=tokens.js.map
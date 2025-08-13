const jwt = require("jsonwebtoken");
const testPayload = { sub: "test_user_123", email: "test@example.com", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 };
const token = jwt.sign(testPayload, process.env.CLERK_SECRET_KEY || "fallback-secret");
console.log("Test Token:", token);

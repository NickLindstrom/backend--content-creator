const authIntegration = require("../integrations/supabase/authIntegration");

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        error: "Missing bearer token"
      });
    }

    const user = await authIntegration.verifyAccessToken(token);

    req.auth = {
      userId: user.id,
      email: user.email,
      token
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authMiddleware
};

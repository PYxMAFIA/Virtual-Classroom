const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Authentication token required' });

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Invalid Authorization header format' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });

    // Normalize shape
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      name: payload.name || payload.college,
    };

    next();
  });
};

module.exports = authenticateToken;

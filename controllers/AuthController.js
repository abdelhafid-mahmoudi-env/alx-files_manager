const { v4: uuidv4 } = require('uuid');
const { createHash } = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class AuthController {
  static async getConnect(req, res) {
    if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
      return res.status(401).json({ message: 'Missing Auth Header' });
    }
    const credentials = Buffer.from(req.headers.authorization.split(' ')[1], 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    if (!email || !password) return res.status(401).json({ error: 'Unauthorized' });

    const hash = createHash('sha1').update(password).digest('hex');
    const user = await dbClient.db.collection('users').findOne({ email, password: hash });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 86400);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    const user = await redisClient.get(`auth_${token}`);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await redisClient.del(`auth_${token}`);
    res.status(204);
    res.end();
    return null;
  }
}
module.exports = AuthController;

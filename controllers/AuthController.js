import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const base64Credentials = auth.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [email, password] = credentials.split(':');
      const hashedPassword = sha1(password);
      const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 86400);
      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error during user authentication:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const deleted = await redisClient.del(`auth_${token}`);
      if (!deleted) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return res.status(204).send();
    } catch (error) {
      console.error('Error during user sign-out:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AuthController;

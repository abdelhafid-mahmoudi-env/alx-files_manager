import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import db from '../utils/db';
import redis from '../utils/redis';

class AuthController {
  static getConnect(request, response) {
    const myauthValue = request.header('Authorization');
    const encodedCredentialsString = myauthValue.split(' ')[1];
    const buffer = Buffer.from(encodedCredentialsString, 'base64');
    const decodedCredentialsString = buffer.toString('ascii');

    const [email, password] = decodedCredentialsString.split(':');

    if (!email || !password) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    return (async (userEmail, userPassword) => {
      const user = await db.getUser({ email: userEmail, password: sha1(userPassword) });
      if (!user) {
        return response.status(401).json({ error: 'Unauthorized' });
      }
      const access_token = uuidv4();
      const key = `auth_${access_token}`;
      await redis.set(key, user._id.toString(), 86400);
      return response.status(200).json({ token });
    })(email, password);
  }

  static async getDisconnect(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redis.get(keystring);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    await redis.del(keystring);
    return response.status(204).end();
  }
}

module.exports = AuthController;

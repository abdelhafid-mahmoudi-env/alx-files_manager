import sha1 from 'sha1';
import { ObjectID } from 'mongodb';
import db from '../utils/db';
import redis from '../utils/redis';

class UsersController {
  static postNew(request, response) {
    const { email } = request.body;
    const { password } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return response.status(400).json({ error: 'Missing password' });
    }

    return (async (userEmail, userPassword) => {
      let _id;
      try {
        const user = await db.getUser({ email: userEmail });
        if (user) {
          return response.status(400).json({ error: 'Already exist' });
        }
        _id = await db.createUser({ email: userEmail, password: sha1(userPassword) });
      } catch (error) {
        console.log(error);
        return response.status(501);
      }
      return response.status(201).json({ id: _id, email: userEmail });
    })(email, password);
  }

  static async getMe(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userIdString = await redis.get(keystring);
    if (!userIdString) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const user = await db.getUser({ _id: new ObjectID(userIdString) });
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    return response.status(200).json({ id: userIdString, email: user.email });
  }
}

module.exports = UsersController;

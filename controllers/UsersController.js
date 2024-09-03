const mongo = require('mongodb');
const { createHash } = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

class UsersController {
  static async postNew(request, response) {
    try {
      const { email, password } = request.body;

      if (!email) {
        return response.status(400).json({ error: 'Missing email' });
      }

      if (!password) {
        return response.status(400).json({ error: 'Missing password' });
      }

      const collection = dbClient.db.collection('users');
      const cursor = collection.find({ email });
      if (await cursor.count() > 0) {
        return response.status(400).json({ error: 'Already exist' });
      }
      const hash = createHash('sha1');
      hash.update(password);
      const user = await collection.insertOne({ email, password: hash.digest('hex') });

      return response.status(201).json({ email, id: user.insertedId });
    } catch (err) {
      console.log(err);
    }
    return null;
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    const id = await redisClient.get(`auth_${token}`);
    const objectId = new mongo.ObjectID(id);
    const user = await dbClient.db.collection('users').findOne({ _id: objectId });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({ id, email: user.email });
  }
}

module.exports = UsersController;

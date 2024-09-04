import db from '../utils/db';
import redis from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    response.status(200).json({ redis: redis.isAlive(), db: db.isAlive() });
  }

  static async getStats(request, response) {
    const user = await db.nbUsers();
    const file = await db.nbFiles();
    response.status(200).json({ users: user, files: file });
  }
}

module.exports = AppController;

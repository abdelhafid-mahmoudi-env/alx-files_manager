const Redis = require('../utils/redis');
const DB = require('../utils/db');

class AppController {
  static getStatus(req, res) {
    if (Redis.isAlive() && DB.isAlive()) {
      return res.status(200).json({ redis: true, db: true });
    }
    return res.status(400).send('Redis and MongoDB not connected');
  }

  static getStats(req, res) {
    (async () => {
      const users = await DB.nbUsers();
      const files = await DB.nbFiles();
      return res.status(200).json({ users, files });
    })();
  }
}

module.exports = AppController;

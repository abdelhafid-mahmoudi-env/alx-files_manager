import redis from 'redis';
import {  promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.connected = true

    this.client.on('error', (error) => {
      console.log(`Redis client not connected due to: ${error.message}`);
      this.connected = false;
    });
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    return getAsync(key);
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;

// class RedisClient
const redis = require('redis');
const util = require('util');

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => console.log(`Redis connection error: ${err.message}`));
  }
  
  isAlive() {
    return this.client.connected; 
  }
  

  async get(key) {
    const getAsync = util.promisify(this.client.get).bind(this.client);
    return getAsync(key);
  }

  async set(key, value, time) {
    const setAsync = util.promisify(this.client.set).bind(this.client);
    return setAsync(key, value, 'EX', time);
  }

  async del(key) {
    const delAsync = util.promisify(this.client.del).bind(this.client);
    const value = await delAsync(key);
  }
}

const redisClient = new RedisClient;
module.exports = redisClient;

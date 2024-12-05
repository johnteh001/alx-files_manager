import { MongoClient } from 'mongodb';
const crypto = require('crypto');

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    MongoClient(`mongodb://${this.host}:${this.port}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).connect().then((client) => {
      this.client = client;
      this.db = this.client.db(this.dbName);
    }).catch((err) => {
      console.error(err.message);
    });
  }

  isAlive() {
    if (this.db) return true;
    return false;
  }

  async nbUsers() {
    const collection = this.db.collection('users');
    return collection.countDocuments();
  }

  async nbFiles() {
    const collection = this.db.collection('files');
    return collection.countDocuments();
  }

  async hashing(password) {
    const hash = crypto.createHash('sha1');
    const data = hash.update(password, 'utf-8');
    const genHash = data.digest('hex');
    return genHash;
  }

}

const dbClient = new DBClient();

export default dbClient;

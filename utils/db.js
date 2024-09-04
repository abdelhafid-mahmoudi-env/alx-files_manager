import { MongoClient } from 'mongodb';

const hostname = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '27017';
const db = process.env.DB_DATABASE || 'files_manager';

const url = `mongodb://${hostname}:${port}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect().then(() => {
      this.db = this.client.db(db);
    }).catch((err) => {
      console.log(`Mongodb client not connected to the database: ${err}`);
    });
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const userCount = await this.db.collection('users').estimatedDocumentCount();
    return userCount;
  }

  async nbFiles() {
    const fileCount = await this.db.collection('files').estimatedDocumentCount();
    return fileCount;
  }

  async getUser(userDetails) {
    const user = await this.db.collection('users').findOne(userDetails);
    return user;
  }

  async createUser(newUser) {
    const result = await this.db.collection('users').insertOne(newUser);
    return result.insertedId;
  }

  async getFile(fileDetails) {
    const file = await this.db.collection('files').findOne(fileDetails);
    return file;
  }

  async createFile(newFile) {
    const result = await this.db.collection('files').insertOne(newFile);
    return result.insertedId;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;

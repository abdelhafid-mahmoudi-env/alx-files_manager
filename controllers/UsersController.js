import { ObjectId } from 'mongodb';
import sha1 from 'sha1';
import Queue from 'bull';
import dbClient from '../utils/db';
import userUtils from '../utils/user';

const userQueue = new Queue('userQueue');

class UsersController {
  static async postNew(request, response) {
    const { email, password } = request.body;
    if (!email) return response.status(400).send({ error: 'Missing email' });
    if (!password) { return response.status(400).send({ error: 'Missing password' }); }
    const stringEmailExists = await dbClient.usersCollection.findOne({ email });
    if (stringEmailExists) { return response.status(400).send({ error: 'Already exist' }); }
    const sha1PasswordString = sha1(password);
    let resultUser;
    try {
      resultUser = await dbClient.usersCollection.insertOne({
        email,
        password: sha1PasswordString,
      });
    } catch (err) {
      await userQueue.add({});
      return response.status(500).send({ error: 'Error creating user.' });
    }
    const user = {
      id: resultUser.insertedId,
      email,
    };
    await userQueue.add({
      userId: resultUser.insertedId.toString(),
    });
    return response.status(201).send(user);
  }

  static async getMe(request, response) {
    const { userId } = await userUtils.getUserIdAndKey(request);
    const userData = await userUtils.getUser({
      _id: ObjectId(userId),
    });

    if (!userData) return response.status(401).send({ error: 'Unauthorized' });
    const process = { id: userData._id, ...userData };
    delete process._id;
    delete process.password;

    return response.status(200).send(process);
  }
}

export default UsersController;

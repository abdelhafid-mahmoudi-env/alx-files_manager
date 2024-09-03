import Queue from 'bull';
import dbClient from '../utils/db';
import { promises as fs } from 'fs';
import imageThumbnail from 'image-thumbnail';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }
  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.localPath;
  const thumbnailSizes = [500, 250, 100];

  try {
    for (const size of thumbnailSizes) {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      await fs.writeFile(`${filePath}_${size}`, thumbnail);
    }
    done();
  } catch (error) {
    done(error);
  }
});

userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  const user = await dbClient.db.collection('users').findOne({ _id: userId });
  if (!user) {
    throw new Error('User not found');
  }

  console.log(`Welcome ${user.email}!`);
  done();
});

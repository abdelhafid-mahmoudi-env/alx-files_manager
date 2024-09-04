import Queue from 'bull';
import { writeFile } from 'fs';
import { ObjectID } from 'mongodb';
const imageThumbnail = require('image-thumbnail');
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');

fileQueue.process(async (job, done) => {
  if (!Object.hasOwn(job.data, 'fileId')) {
    throw new Error('Missing fileId');
  }
  if (!Object.hasOwn(job.data, 'userId')) {
    throw new Error('Missing userId');
  }
  const file = await dbClient.getFile({
    _id: new ObjectID(job.data.fileId),
    userId: new ObjectID(job.data.userId),
  });
  if (!file) {
    throw new Error('File not found');
  }

  const width500Option = { width: 500 };
  const width250Option = { width: 250 };
  const width100Option = { width: 100 };

  try {
    const thumbnailWidth500 = await imageThumbnail(`${file.localPath}`, width500Option);
    const thumbnailWidth250 = await imageThumbnail(`${file.localPath}`, width250Option);
    const thumbnailWidth100 = await imageThumbnail(`${file.localPath}`, width100Option);

    writeFile(`${file.localPath}_500`, thumbnailWidth500, (err) => console.error(err));
    writeFile(`${file.localPath}_250`, thumbnailWidth250, (err) => console.error(err));
    writeFile(`${file.localPath}_100`, thumbnailWidth100, (err) => console.error(err));
    done();
  } catch (e) {
    console.error(e);
  }
});

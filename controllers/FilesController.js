import Queue from 'bull';
import { existsSync, mkdir, writeFile } from 'fs';
import { ObjectID } from 'mongodb';
import mime from 'mime-types';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redisClient.get(keystring);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.getUser({ _id: new ObjectID(userId) });
    if (!user) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { isPublic = false } = request.body;
    const { name } = request.body;
    if (!name) {
      return response.status(400).json({ error: 'Missing name' });
    }
    const { type } = request.body;
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return response.status(400).json({ error: 'Missing type' });
    }
    const { data } = request.body;
    if (!data && type !== 'folder') {
      return response.status(400).json({ error: 'Missing data' });
    }
    const { parentId = 0 } = request.body;
    if (parentId) {
      const file = await dbClient.getFile({ _id: new ObjectID(parentId) });
      if (!file) {
        return response.status(400).json({ error: 'Parent not found' });
      }
      if (file.type !== 'folder') {
        return response.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const saveToFile = {
      userId: user._id,
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : new ObjectID(parentId),
    };

    if (type === 'folder') {
      try {
        const resultDbId = await dbClient.createFile(saveToFile);
        saveToFile.id = resultDbId;
        saveToFile.userId = user._id.toString();
        saveToFile.parentId = saveToFile.parentId === '0' ? 0 : saveToFile.parentId.toString();
        delete saveToFile._id;
        return response.status(201).json(saveToFile);
      } catch (e) {
        console.error(e.message);
        return response.status(500).json({ msg: 'Internal server error occured.' });
      }
    }
    const pathFolder = process.env.FOLDER_PATH || '/tmp/files_manager';
    const pathFile = `${pathFolder}/${uuidv4()}`;
    const buffer = Buffer.from(data, 'base64');
    mkdir(pathFolder, { recursive: true }, (err) => {
      if (err) {
        return response.status(400).json({ error: err.message });
      }
      writeFile(pathFile, buffer, (err) => {
        if (err) {
          return response.status(400).json({ error: err.message });
        }
        return true;
      });
      return true;
    });
    saveToFile.localPath = pathFile;
    try {
      const resultDbId = await dbClient.createFile(saveToFile);
      delete saveToFile.localPath;
      saveToFile.id = resultDbId;
      saveToFile.userId = user._id.toString();
      saveToFile.parentId = saveToFile.parentId === '0' ? 0 : saveToFile.parentId.toString();
    } catch (e) {
      console.error(e.message);
      return response.status(500).json({ msg: 'Internal server error occured.' });
    }
    delete saveToFile._id;
    if (type === 'image') {
      const fileQueue = new Queue('fileQueue', 'redis://127.0.0.1:6379');
      fileQueue.add({ fileId: saveToFile.id, userId: saveToFile.userId });
    }
    return response.status(201).json(saveToFile);
  }

  static async getShow(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redisClient.get(keystring);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;
    const file = await dbClient.getFile({ _id: new ObjectID(id), userId: new ObjectID(userId) });

    if (!file) {
      return response.status(404).json({ error: 'Not found' });
    }
    file.id = file._id;
    delete file._id;
    delete file.localPath;
    return response.status(200).json(file);
  }

  static async getIndex(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redisClient.get(keystring);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { parentId = 0, page = 0 } = request.query;
    let filter_all;
    if (!parentId) {
      filter_all = { userId: new ObjectID(userId) };
    } else {
      filter_all = { userId: new ObjectID(userId), parentId: new ObjectID(parentId) };
    }
    return dbClient.db.collection('files').aggregate(
      [
        { $match: filter_all },
        {
          $facet: {
            data: [{ $skip: 20 * +page }, { $limit: 20 }],
          },
        },
      ],
    ).toArray((err, result) => {
      if (err) {
        console.error(err.message);
        return response.status(404).json({ error: 'Not found' });
      }
      const data = result[0].data.map((field) => {
        const _f = {
          ...field,
          id: field._id,
        };
        delete _f._id;
        delete _f.localPath;
        return _f;
      });
      return response.status(200).json(data);
    });
  }

  static async putPublish(request, response) {
    const token = request.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;
    const file = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: new ObjectID(id), userId: new ObjectID(userId) },
      { $set: { isPublic: true } },
      { returnOriginal: false },
    );

    if (!file.lastErrorObject.updatedExisting) {
      return response.status(404).json({ error: 'Not found' });
    }
    file.value.id = file.value._id;
    delete file.value._id;
    delete file.value.localPath;
    return response.status(200).json(file.value);
  }

  static async putUnpublish(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redisClient.get(keystring);
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = request.params;
    const file = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: new ObjectID(id), userId: new ObjectID(userId) },
      { $set: { isPublic: false } },
      { returnOriginal: false },
    );

    if (!file.lastErrorObject.updatedExisting) {
      return response.status(404).json({ error: 'Not found' });
    }
    file.value.id = file.value._id;
    delete file.value._id;
    delete file.value.localPath;
    return response.status(200).json(file.value);
  }

  static async getFile(request, response) {
    const access_token = request.header('X-Token');
    const keystring = `auth_${access_token}`;
    const userId = await redisClient.get(keystring);

    const { id } = request.params;
    const { size = 0 } = request.query;
    const file = await dbClient.getFile({ _id: new ObjectID(id) });
    if (!file) {
      console.error('File was not found!!!');
      return response.status(404).json({ error: 'Not found' });
    }
    if ((!file.isPublic && !userId) || (!file.isPublic && file.userId.toString() !== userId)) {
      return response.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return response.status(400).json({ error: "A folder doesn't have content" });
    }

    const fileName = size > 0 ? `${file.localPath}_${size}` : file.localPath;
    if (!existsSync(fileName)) {
      return response.status(404).json({ error: 'Not found' });
    }
    const content = mime.contentType(file.name);
    return response.header('Content-Type', content).status(200).sendFile(fileName);
  }
}

module.exports = FilesController;

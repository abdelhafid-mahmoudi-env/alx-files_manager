import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import imageThumbnail from 'image-thumbnail';
import Queue from 'bull';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: parentId });
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileDocument = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDocument);
      return res.status(201).json({ id: result.insertedId, ...fileDocument });
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    await fs.mkdir(folderPath, { recursive: true });

    const localPath = path.join(folderPath, uuidv4());
    await fs.writeFile(localPath, Buffer.from(data, 'base64'));

    fileDocument.localPath = localPath;

    const result = await dbClient.db.collection('files').insertOne(fileDocument);

    if (type === 'image') {
      fileQueue.add({ userId, fileId: result.insertedId });
    }

    res.status(201).json({ id: result.insertedId, ...fileDocument });
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });

    if (!file) return res.status(404).json({ error: 'Not found' });

    res.status(200).json(file);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;

    const files = await dbClient.db.collection('files')
      .find({ userId, parentId })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray();

    res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: fileId }, { $set: { isPublic: true } });
    res.status(200).json({ ...file, isPublic: true });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const fileId = req.params.id;
    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });

    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: fileId }, { $set: { isPublic: false } });
    res.status(200).json({ ...file, isPublic: false });
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const size = req.query.size;

    const file = await dbClient.db.collection('files').findOne({ _id: fileId });

    if (!file) return res.status(404).json({ error: 'Not found' });
    if (file.type === 'folder') return res.status(400).json({ error: "A folder doesn't have content" });
    if (!file.isPublic) {
      const token = req.headers['x-token'];
      if (!token) return res.status(404).json({ error: 'Not found' });

      const userId = await redisClient.get(`auth_${token}`);
      if (file.userId !== userId) return res.status(404).json({ error: 'Not found' });
    }

    let filePath = file.localPath;
    if (size) {
      filePath = `${file.localPath}_${size}`;
    }

    try {
      const fileData = await fs.readFile(filePath);
      const mimeType = mime.lookup(file.name);
      res.setHeader('Content-Type', mimeType);
      res.status(200).send(fileData);
    } catch (error) {
      res.status(404).json({ error: 'Not found' });
    }
  }
}

export default FilesController;

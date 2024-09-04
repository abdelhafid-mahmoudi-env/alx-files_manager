import { Router } from 'express';
import AppController from '../controllers/AppController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';

const navigator = Router();

navigator.get('/status', AppController.getStatus);
navigator.get('/stats', AppController.getStats);
navigator.post('/users', UsersController.postNew);
navigator.get('/users/me', UsersController.getMe);
navigator.get('/connect', AuthController.getConnect);
navigator.get('/disconnect', AuthController.getDisconnect);
navigator.post('/files', FilesController.postUpload);
navigator.get('/files/:id', FilesController.getShow);
navigator.get('/files', FilesController.getIndex);
navigator.put('/files/:id/publish', FilesController.putPublish);
navigator.put('/files/:id/unpublish', FilesController.putUnpublish);
navigator.get('/files/:id/data', FilesController.getFile);

module.exports = navigator;

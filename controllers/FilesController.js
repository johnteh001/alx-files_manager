import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { v4 as uuidv4, } from 'uuid';
import path from 'path';
import fs from 'fs';
import { ObjectId, } from 'mongodb';
import Queue from 'bull';
import mime from 'mime-types';

const fileQueue = new Queue('fileQueue', {
  redis: {
  host: '127.0.0.1',
  port: 6379,
  }
});
class FilesController {
  // find user based on request
  static async findUser(req) {
    const token = req.get('X-Token');
    if (!token)
      return null;
    const userToken = `auth_${token}`;
    const userId = await redisClient.get(userToken);
    if (userId) {
      const db = dbClient.db.collection('users');
      const user = await db.findOne({_id: ObjectId(userId),});
      if (user)
        return user;
    }
    return null;
  }

  // check if directory path exists

  static async validatePath(path) {
    return new Promise((resolve) => {
      fs.access(path, fs.constants.F_OK, (err) => {
        resolve(!err);
     });
    });
  }

  // helper function to write data to file
  static async writeContent(filePath, data) {
    fs.promises.writeFile(filePath, data, 'utf-8', (error) => {
      if (error) reject(false);
      resolve(true);
    });
  }
  static async postUpload(req, res) {
    // validate user
    const user = await FilesController.findUser(req);
    if (!user) {
      res.status(401).send({error: 'Unauthorized',});
      return;
    }
    const types = ['folder', 'file', 'image'];
    const { name, type, parentId, isPublic, data, } = req.body;
    
    if (!name) {
      res.status(400).json({error: "Missing name"});
      return;
    }
    
    if (!type || !types.includes(type)) {
      res.status(400).json({error: "Missing type"});
      return;
    }
    
    if (!data && (type !== 'folder')) {
      res.status(400).json({error: "Missing data"});
      return;
    }

    if (parentId) {
      const db = dbClient.db.collection('files');
      const file = await db.findOne({_id: ObjectId(parentId),});
      if (!file) {
        res.status(400).json({error: "Parent not found"});
	return;
      }
      if (file.type !== 'folder') {
        res.status(400).json({error: "Parent is not a folder",});
	return;
      }
    }
    
    const newFile = {
      name,
      type, 
      parentId: parentId || 0,
      isPublic: isPublic || false,
      userId: user._id.toString(),
    };
    
    if (newFile.type === 'folder') {
      const db =  dbClient.db.collection('files');
      const result = await db.insertOne(newFile);
      newFile.id = result.insertedId;
      delete newFile._id;
      res.status(201).json(newFile);
    } else {
      const folderPath = process.env.FOLDER_PATH || "/tmp/files_manager";
      const fileName = uuidv4();
      const filePath = path.join(folderPath, fileName);
      
      newFile.localPath = filePath;
      const plainData = Buffer.from(data, 'base64').toString('utf8');
      
      // creating directory
      const validPath = await FilesController.validatePath(folderPath);
      if (!validPath) {
        await fs.promises.mkdir(folderPath, {recursive: true} );
      }
      try {
        const success = await FilesController.writeContent(filePath, plainData);
	const db = dbClient.db.collection('files');
	const result = await db.insertOne(newFile);
        const resContent = { ...newFile, id: result.insertedId, };
	delete resContent._id;
	delete resContent.localPath;
	
	 // processing thumbnails
	if (resContent.type === 'image') {
          fileQueue.add({
            userId: resContent.userId,
	    fileId: resContent.id });
	}
	res.setHeader('Content-Type', 'application/json');
	res.status(201).json(resContent);
      } catch (error) {
        console.log(error.message);
        res.status(400).json({error: "internal error"});
        return;
      }
    }
  }

  // retrieves  the file document based on the id
  static async getShow(req, res) {
    const fileId = req.params.id;
    const user = await FilesController.findUser(req);
    if (!user) {
      res.status(401).send({error: 'Unauthorized',});
      return;
    }
    const db = dbClient.db.collection('files');
    const userFile = {_id: ObjectId(fileId), userId: user._id.toString(),};
    const doc = await db.findOne(userFile);
    if (!doc) {
      res.status(404).json({error: "Not found"});
    } else {
      doc.id = doc._id;
      delete doc._id;
      delete doc.localPath;
      res.status(200).json(doc);
    }
  }

  static async getIndex(req, res) {
    const { parentId, page, }  = req.query;
    const user = await FilesController.findUser(req);
    if (!user) {
      res.status(401).send({error: 'Unauthorized',});
      return;
    }
    let search;
    const db = dbClient.db.collection('files');
    if (!parentId) {
      search = {userId: user._id.toString(), };
    } else {
      search = {userId: user._id.toString(), parentId,};
    }
    
    // pagination elements
    const limit = 20;
    const pageNumber = page || 1;
    const skips = (pageNumber - 1) * limit;

    // pagination using aggregation
    const result = await db.aggregate([
      {
        $match: search,
      },
      {
	$skip: skips,
      },
      {
        $limit: limit,
      },
    ]).toArray();

    const output = result.map((file) => {
      const newFile = { ...file, id: file._id,};
      delete newFile._id;
      delete newFile.localPath;
      return newFile;
    });
    res.status(200).json(output);
  }
  // sets isPublic to true

  static async putPublish(req, res) {
    const user = await FilesController.findUser(req);
    if (!user) {
      res.status(401).send({error: 'Unauthorized',});
      return;
    }
    const fileId = req.params.id;
    const db = dbClient.db.collection('files');
    const queryFile = {_id: ObjectId(fileId), userId: user._id.toString(),};
    const doc = await db.findOne(queryFile);
    if (!doc) {
      res.status(404).json({error: "Not found"});
    } else {
      const update = {$set: {isPublic: true,}};
      await db.updateOne({ _id: ObjectId(fileId),}, update).catch((err) => {
        console.log(err.message);
      });
      const results = await db.findOne(queryFile);
      results.id = results._id;
      delete results._id;
      delete results.localPath;
      return res.status(200).json(results);
    }
  }

  // sets isPublic to false
  static async putUnpublish(req, res) {
    const user = await FilesController.findUser(req);
    if (!user) {
      res.status(401).send({error: 'Unauthorized',});
      return;
    }
    const fileId = req.params.id;
    const queryFile = {_id: ObjectId(fileId), userId: user._id.toString(),};
    const db = dbClient.db.collection('files');
    const doc = await db.findOne(queryFile);
    if (!doc) {
      res.status(401).json({error: "Unauthorized"});
      return;
    } else {
      const query = {_id: ObjectId(fileId),};
      const update = {$set: {isPublic: false,},};
      await db.updateOne(query, update);
      const results = await db.findOne(queryFile);
      results.id = results._id;
      delete results._id;
      delete results.localPath;
      res.status(200).json(results);
    }
  }
  // returns content of file document based on the id

  static async getFile(req, res) {
    const fileId = req.params.id;
    const { size } = req.query;
    const db = dbClient.db.collection('files');
    const file = await db.findOne({_id: ObjectId(fileId),});
    if (!(await file)) {
      res.status(404).json({error: "Not found"});
      return;
    }
    // check user authentication
    const user = await FilesController.findUser(req);
    if (file.isPublic === false) {
      if (user) {
        if (user._id.toString() !== file.userId) {
          res.status(404).json({error: "Not found"});
          return;
	}
      } else {
	res.status(404).json({error: "Not found"});
	return;
      }
    }

    if (file.type === 'folder') {
      res.status(400).json({error: "A folder doesn't have content"});
      return;
    }
    let path = file.localPath;
    if (size && file.type === 'image') {
      path = `${file.localPath}_${size}`;
    }
    const verified = await FilesController.validatePath(path);
    if (!verified) {
      res.status(404).json({error: "Not found"});
      return;
    } else {
      res.set('Content-Type', mime.lookup(file.name));
      res.status(200).sendFile(path);
    }
  }
}

export default FilesController;

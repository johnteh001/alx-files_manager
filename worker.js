import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import Queue from 'bull';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';

const fileQueue = new Queue('fileQueue', {
  redis: {
  host: '127.0.0.1',
  port: 6379,
  }
});
const thumbnails = async (width, localPath) => {
  const options = {width, };
  const thumbnail = await imageThumbnail(localPath, options);
  return thumbnail;
};

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;
  if (!fileId) {
    done(new Error('Missing fileId'));
  } 
  if (!userId) {
    done(new Error('Missing userId'));
  }
  const db = dbClient.db.collection('files');
  const file = await files.findOne({_id: fileId, userId});
  if (!file) {
    done(new Error(new Error('File not found'));
  }
  
  // thumbnails
  const path500 = `${file.localPath}_500`;
  const path250 = `${file.localPath}_250`;
  const path100 = `${file.localPath}_100`;
  
  try {
    const thumb500 = await thumbnails(500, file.localPath);
    const thumb250 = await thumbnails(250, file.localPath);
    const thumb100 = await thumbnails(100, file.localPath);

    await fs.promises.writeFile(path500, thumb500);
    await fs.promises.writeFile(path250, thumb250);
    await fs.promises.writeFile(path100, thumb100);
  } catch (err) {
    console.error(error.message);
  }
});

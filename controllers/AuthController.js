import dbClient from '../utils/db';
import redisClient from '../utils/redis';
const { v4: uuidv4, } = require('uuid');

exports.getConnect = async (req, res) => {
  const header = req.get('Authorization');
  if (!header) {
    res.status(401).json({error: 'Uauthorized'});
    return;
  }
  const b64Credentials = header.split(' ')[1];
  const credentials = Buffer.from(b64Credentials, 'base64').toString('utf8');
  const email = credentials.split(':')[0];
  const password = credentials.split(':')[1];

  if (!email || !password) {
    res.status(401).json({error: 'Unauthorized'});
    return;
  }
  
  const db = dbClient.db.collection('users');
  if (dbClient.isAlive()) {
    const passHash = await dbClient.hashing(password);
    const userObj = {email, password: passHash};
    const user = await db.findOne(userObj); // check if user exists
    if (user) {
      const token = uuidv4();
      const key = `auth_${token}`;
      if (redisClient.isAlive()) {
        await redisClient.set(key, user._id.toString(), 86400); 
	res.status(200).json({token,});
	return;
      }
    } else {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }
  }
  res.status(500).json({error: 'database down'});
}

exports.getDisconnect = async (req, res) => {
  const token = req.get('X-Token');
  if (token) {
    const userToken = `auth_${token}`;
    const verifyUser = await redisClient.get(userToken);
    if (verifyUser) {
      await redisClient.del(userToken);
      res.status(204).json();
      return;
    }
  }
  res.status(401).json({error: 'Unauthorized'});
}

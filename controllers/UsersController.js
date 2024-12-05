import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { ObjectId } from 'mongodb';

exports.postNew = async (req, res) => {
  const email = req.body.email;
  if (!email) {
    res.status(400).json({error: "Missing email"});
    return;
  }
  const password = req.body.password;
  if (!password) {
    res.status(400).json({error: "Missing password"});
    return;
  }
  if (dbClient.isAlive()) {
    const db = dbClient.db.collection('users');
    const user = await db.findOne({ email } );
    if (user) {
      res.status(400).json({error: "Alreay exist"});
      return;
    }
    const passHash = await dbClient.hashing(password);
    const userObj = {email, password: passHash};
    const newUser = await db.insertOne(userObj);
    res.status(201).json({id: newUser.insertedId, email});
  }
}

exports.getMe = async (req, res) => {
  const authHeader = req.get('X-Token');
  if (!authHeader) {
    res.status(401).json({error: "Unauthorized"});
    return;
  }
  if (redisClient.isAlive() && dbClient.isAlive()) {
    const key = `auth_${authHeader}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      res.status(401).json({error: 'Aauthorized'});
      return;
    }
    const db = dbClient.db.collection('users');
    const user = await db.findOne({_id: ObjectId(userId),});
    if (user) {
      res.status(200).json({id: userId, email: user.email,});
    } else {
      res.status(401).json({error: 'Unauthorized'});
      return;
    }
  }
}

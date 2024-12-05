import redisClient from '../utils/redis';
import dbClient from '../utils/db';

exports.getStatus = (req, res) => {
  const rStatus = redisClient.isAlive();
  const dbStatus = dbClient.isAlive();
  res.status(200).json({"redis": `${rStatus}`,
	                "db": `${dbStatus}`});
};

exports.getStats = async (req, res) => {
  if (dbClient.isAlive()) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    res.status(200).json({"users": `${users}`, "files": `${files}`});
  }
};

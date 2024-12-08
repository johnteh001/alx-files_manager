/* const { MongoClient } = require('mongodb');
// or as an es module:
// import { MongoClient } from 'mongodb'

// Connection URL
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'myProject';

async function main() {
  // Use connect method to connect to the server
  await client.connect();
  console.log('Connected successfully to server');
  const db = client.db(dbName);
  const collection = db.collection('documents');

  // the following code examples can be pasted here...

  return 'done.';
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
*/
const path = require('path');
const fs = require('fs');
async function writeContent(filePath, data) {
      fs.promises.writeFile(filePath, data, 'utf-8', (error) => {
        if (error) reject(false);
        resolve(true)
      });
}
(async() => {
  const file = "tiest.txt";
  const data = "I love Hello file\n";
  try {
    await writeContent(file, data);
    console.log("done");
  } catch (error) {
	  console.log(error.message);
  }
})();

import express from "express";
import cors from "cors"
import 'dotenv/config';
import { MongoClient } from 'mongodb';
const app = express()
app.use(cors());
app.use(express.json());
const port = 5000

// connect mongodv 
const client = new MongoClient(process.env.MONGO_DB_CLIENT_ID);

export async function connectToMongoDB() {

    await client.connect();
    console.log('You successfully connected to MongoDB!');
    return client;
  }
  
const startserver = async () => {
    
  await connectToMongoDB();
  const db = client.db('onlinelibrary');
  const bookCollection = db.collection('books')

  //add books
  app.post('/books', async (req, res) => {
    const data = req.body;

      const book = {
        ...data,
        createdAt: new Date(),
      };
    const result = await bookCollection.insertOne(book)
    res.send(result);
})

  // get books
  app.get('/books', async (req, res) => {
    const limit = Number(req.query.limit);

    let query = bookCollection.find().sort({ createdAt: -1 });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const books = await query.toArray();

    res.send(books);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
startserver();

import express from "express";
import cors from "cors"
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
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
  const borrowCollection = db.collection('borrows');

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

  app.get("/books/:id", async (req, res) => {
    const id = req.params.id;
    const result = await bookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result);
  });

  // add brrows 
 
app.post('/borrows', async (req, res) => {
  try {
    const { bookId, bookTitle, bookImage, userEmail } = req.body;
    const alreadyBorrowed = await borrowCollection.findOne({
      bookId: bookId,
    });

    if (alreadyBorrowed) {
      return res.status(409).send({
        success: false,
        message: 'This book is already borrowed!',
      });
    }

    // Borrow date
    const borrowDate = new Date();
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 7);

    const borrowData = {
      bookId,
      bookTitle,
      bookImage,
      userEmail,
      borrowDate,
      returnDate,
    };

    const result = await borrowCollection.insertOne(borrowData);

    res.status(201).send({
      success: true,
      message: 'Book borrowed successfully!',
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: 'Failed to borrow book',
    });
  }
});


  // get brrows 
  app.get("/borrows", async (req, res) => {
    const data = await borrowCollection.find().toArray();
    res.send(data);
  })

  // delete 
  app.delete('/borrows/:id', async (req, res) => {
    const id = req.params.id;

    const result = await borrowCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send(result);
  });

  //  update
  
  
app.patch('/books/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;

    const filter = {
      _id: new ObjectId(id),
    };

    const updateDoc = {
      $set: {
        ...updatedData,
        updatedAt: new Date(),
      },
    };

    const result = await bookCollection.updateOne(filter, updateDoc);

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: 'Failed to update book',
    });
  }
});

  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
startserver();

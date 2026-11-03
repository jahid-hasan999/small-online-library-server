import express from "express";
import cors from "cors"
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { createRemoteJWKSet, jwtVerify } from "jose";
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

  // add verifytoken

  const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ msg: "Unuthorized!" });
    }
      const token = authHeader.split(" ")[1]
      if (!token) {
        return res.status(401).send({ msg: 'Unuthorized!' });
    }
    
    const jwks = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_ID}/api/auth/jwks`),
    );

    const { payload } = await jwtVerify(token, jwks);
    req.user = payload;
    next();
  }

  //add books
  app.post('/books', verifyToken,async (req, res) => {
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

  app.get("/books/:id", verifyToken,async (req, res) => {
    const id = req.params.id;
    const result = await bookCollection.findOne({ _id: new ObjectId(id) })
    res.send(result);
  });

  // add brrows 
 
app.post('/borrows', verifyToken, async (req, res) => {
  try {
    const { bookId, bookTitle, bookImage } = req.body;

    // Get logged-in user's email from verified JWT
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).send({
        success: false,
        message: 'Unauthorized user!',
      });
    }

    // Check if THIS user already borrowed THIS book
    const alreadyBorrowed = await borrowCollection.findOne({
      bookId: bookId,
      userEmail: userEmail,
    });

    if (alreadyBorrowed) {
      return res.status(409).send({
        success: false,
        message: 'You have already borrowed this book!',
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
    console.error('Borrow Error:', error);

    res.status(500).send({
      success: false,
      message: 'Failed to borrow book',
    });
  }
});


  // get brrows 
  app.get("/borrows", verifyToken, async (req, res) => {
    
    const userEmail = req.user.email;
    const data = await borrowCollection.find({ userEmail }).toArray();
    res.send(data);
  })

  // delete 
 app.delete('/borrows/:id', verifyToken, async (req, res) => {
   const id = req.params.id;
   const userEmail = req.user.email;

   const result = await borrowCollection.deleteOne({
     _id: new ObjectId(id),
     userEmail: userEmail,
   });

   res.send(result);
 });

  // my update
  
app.patch('/books/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const userEmail = req.user.email;

    const { addedBy, createdAt, ...updatedData } = req.body;

    const filter = {
      _id: new ObjectId(id),
      'addedBy.email': userEmail,
    };

    const updateDoc = {
      $set: {
        ...updatedData,
        updatedAt: new Date(),
      },
    };

    const result = await bookCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: 'Book not found or you are not the owner',
      });
    }

    res.send(result);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      success: false,
      message: 'Failed to update book',
    });
  }
});

  // my book delete 
  app.delete('/books/:id', verifyToken, async (req, res) => {
    try {
      const id = req.params.id;
      const userEmail = req.user.email;

      const result = await bookCollection.deleteOne({
        _id: new ObjectId(id),
        'addedBy.email': userEmail,
      });

      if (result.deletedCount === 0) {
        return res.status(404).send({
          success: false,
          message: 'Book not found or you are not the owner',
        });
      }

      res.send(result);
    } catch (error) {
      console.error(error);

      res.status(500).send({
        success: false,
        message: 'Failed to delete book',
      });
    }
  });
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
startserver();

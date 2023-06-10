const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ixkqk3t.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections
    const userCollection = client.db("frippoDb").collection("user");
    const classCollection = client.db("frippoDb").collection("classes");

    
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      // console.log(process.env.ACCESS_TOKEN_SECRET)
      res.send({ token })
  });



//! user related api
app.get('/users', async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

//storing user data in database
app.post('/users', async (req, res) => {
    const user = req.body;
    console.log('user', user)
    const query = {email: user.email};
    const existingUser = await userCollection.findOne(query);
    console.log('existing user', existingUser);
    if (existingUser) {
        return res.send({message: 'User already exists'})
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
})

      // setting  a user role to admin
      app.patch('/users/admin/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id);
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                role: 'admin'
            },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);

    });

 // setting  a user role to instructor
 app.patch('/users/instructor/:id', async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
      $set: {
          role: 'instructor'
      },
  };

  const result = await userCollection.updateOne(filter, updateDoc);
  res.send(result);

});



// ! class related api
 // for getting all the classes
 app.get('/classes', async (req, res) => {
  const result = await classCollection.find().toArray();
  res.send(result);
});

// posting new class
app.post('/classes', async (req, res) => {
  const classData = req.body;
  const result = await classCollection.insertOne(classData);
  res.send(result);
});

 // show all the approved classes
 app.get('/approved-classes', async (req, res) => {
  const result = await classCollection.find({ status: 'approved' }).toArray();
  res.send(result);
});



 // getting the first 6 popular classes sort by number of enrolled students
 app.get('/popular-classes', async (req, res) => {
  try {
      const popularClasses = await classCollection.find().sort({ numberOfStudents: -1 }).limit(6).toArray();
      res.send(popularClasses);
  } catch (err) {
      console.error(err);
      res.status(400).send('Internal server error');
  }
});







    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {

    res.send('Sports Academy is running!');

})

app.listen(port, () => {
    console.log(`Sports Academy is running on port ${port}`);
})


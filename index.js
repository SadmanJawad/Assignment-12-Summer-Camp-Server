const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
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

    const userCollection = client.db("frippoDb").collection("user");
    const classCollection = client.db("frippoDb").collection("classes");


//! user related api
app.post('/user', async (req, res) => {
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

// ! class related api
 // for getting all the classes
 app.get('/classes', async (req, res) => {
  const result = await classCollection.find().toArray();
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
      res.status(500).send('Internal server error');
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


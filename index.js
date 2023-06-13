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
    const selectedCollection = client.db("frippoDb").collection("selected");
    const enrolledCollection = client.db("MelodyMaster").collection("enrolled");



    
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

  // get classes according to the instructor email
  app.get('/classes/:email', async (req, res) => {
    const email = req.params.email;
    const result = await classCollection.find({ instructorEmail: email }).toArray();
    res.send(result);
});


 // changing class  to approved put method
 app.put('/classes/approved/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
      $set: {
          status: 'approved'
      },
  };
  const result = await classCollection.updateOne(filter, updateDoc);
  res.send(result);
});
// changing class to deny , put method
app.put('/classes/denied/:id', async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
      $set: {
          status: 'denied'
      },
  };
  const result = await classCollection.updateOne(filter, updateDoc);
  res.send(result);
});
// inserting feedback to a class
app.put('/classes/feedback/:id', async (req, res) => {
  const id = req.params.id;
  const feedback = req.body;
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
      $set: {
          feedback: feedback.inputValue
      },
  };
  const result = await classCollection.updateOne(filter, updateDoc);
  res.send(result);
});

// ! selected classes related apis
        // post selected class to database
        app.post('/classes/selected', async (req, res) => {
            const selectedClass = req.body;
            const result = await selectedCollection.insertOne(selectedClass);
            res.send(result);
        });

                // get selected class by email
                app.get('/classes/selected/:email', async (req, res) => {
                    const email = req.params.email;
                    const query = { userEmail: email }
                    const result = await selectedCollection.find(query).toArray();
                    res.send(result);
                });
                // get selected class by id
                app.get('/classes/get/:id', async (req, res) => {
                    const id = req.params.id;
                    const query = { _id: new ObjectId(id) };
                    const result = await selectedCollection.findOne(query);
                    res.send(result);
                });
        
                // deleting a selected class by id
                app.delete('/classes/selected/:id', async (req, res) => {
                    const id = req.params.id;
                    const query = { _id: new ObjectId(id) }
                    const result = await selectedCollection.deleteOne(query);
                    res.send(result);
                });






// ! instructor related apis
        // for getting all the instructors
        app.get('/instructors', async (req, res) => {
          const pipeline = [
              {
                  $lookup: {
                      from: "classes",
                      localField: "email",
                      foreignField: "instructorEmail",
                      as: "classes",
                  },
              },
              {
                  $project: {
                      _id: 0,
                      name: 1,
                      email: 1,
                      photoURL: 1,
                      numberOfClasses: {
                          $cond: {
                              if: { $isArray: "$classes" },
                              then: { $size: "$classes" },
                              else: 0,
                          },
                      },
                      classes: {
                          $cond: {
                              if: { $isArray: "$classes" },
                              then: "$classes.name",
                              else: [],
                          },
                      },
                  },
              },
          ];

          const instructors = await userCollection.aggregate(pipeline).toArray();
          res.send(instructors);
      });


        // getting the first 6 popular classes sort by number of class taken
        app.get('/instructors/popular', async (req, res) => {
          const pipeline = [
              {
                  $lookup: {
                      from: "classes",
                      localField: "email",
                      foreignField: "instructorEmail",
                      as: "classes",
                  },
              },
              {
                  $project: {
                      _id: 0,
                      name: 1,
                      photoURL: 1,
                      numberOfStudents: {
                          $cond: {
                              if: { $isArray: "$classes" },
                              then: { $sum: "$classes.numberOfStudents" },
                              else: 0,
                          },
                      },
                      numberOfClasses: {
                          $cond: {
                              if: { $isArray: "$classes" },
                              then: { $size: "$classes" },
                              else: 0,
                          },
                      },
                      classes: {
                          $cond: {
                              if: { $isArray: "$classes" },
                              then: { $arrayElemAt: ["$classes.name", 0] },
                              else: "",
                          },
                      },
                  },
              },
              { $sort: { numberOfStudents: -1 } },
              { $limit: 6 },
          ];

          const instructors = await userCollection.aggregate(pipeline).toArray();
          res.send(instructors);
      });



       //! create payment intent
       app.post('/create-payment-intent',verifyJWT, async (req, res) => {
        const { price } = req.body;

        const amount = parseInt(price * 100);
        console.log(price, amount)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ["card"],
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
        });

    });

   // getting enrolled class by email
        app.get('/enrolled/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await enrolledCollection.find(query).toArray();
            res.send(result);
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


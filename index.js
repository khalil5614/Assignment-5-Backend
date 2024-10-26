const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASSWORD}@freecluster.e76lb.mongodb.net/?retryWrites=true&w=majority&appName=FreeCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //    await client.connect();
    const database = client.db("codeCloud");

    const userCollection = database.collection("users");
    const categoriesCollection = database.collection("categories");
    const productCollection = database.collection("products");
    const ordersCollection = database.collection("orders");

    app.get("/", (req, res) => res.send("Code Cloud on Vercel"));

    //-----------users------------

    app.post("/api/users", async (req, res) => {
      const users = req.body;

      const result = await userCollection.insertOne(users);
      res.send(result);
    });
    app.get("/api/users", async (req, res) => {
      const query = userCollection.find();
      const result = await query.toArray();
      res.send(result);
    });
    app.get("/api/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { uid: id };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.put("/api/users/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { uid: id };
      const option = { upsert: true };

      const updatedUser = {
        $set: {
          displayName: user.displayName,
          email: user.email,
          phone: user.phone,
          photoUrl: user.photoUrl,
          address: user.address,
          isAdmin: user.isAdmin,
          isBlocked: user.isBlocked,
        },
      };

      const result = await userCollection.updateOne(
        filter,
        updatedUser,
        option
      );
      res.send(result);
    });

    app.delete("/api/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { uid: id };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    //-----------end users------------

    //-----------categories----------------

    app.post("/api/categories", async (req, res) => {
      const category = req.body;
      const result = await categoriesCollection.insertOne(category);
      res.send(result);
    });

    app.get("/api/categories", async (req, res) => {
      const query = categoriesCollection.find();
      const result = await query.toArray();
      res.send(result);
    });

    app.get("/api/categories/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await categoriesCollection.findOne(query);

      res.send(result);
    });

    app.put("/api/categories/:id", async (req, res) => {
      const id = req.params.id;
      const category = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };

      const updatedCategory = {
        $set: {
          title: category.title,
          thumbnailUrl: category.thumbnailUrl,
        },
      };

      const result = await categoriesCollection.updateOne(
        filter,
        updatedCategory,
        option
      );
      res.send(result);
    });

    app.delete("/api/categories/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await categoriesCollection.deleteOne(query);
      res.send(result);
    });

    //-----------end categories------------

    //-----------products----------------
    app.post("/api/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get("/api/products", async (req, res) => {
      const query = productCollection.find();
      const result = await query.toArray();
      res.send(result);
    });
    app.get("/api/categories/products/:category", async (req, res) => {
      const category = req.params.category;
      const searchQuery = { category: category };
      const query = productCollection.find(searchQuery);
      const result = await query.toArray();
      res.send(result);
    });
    app.get("/api/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await productCollection.findOne(query);

      res.send(result);
    });
    //-----------end products------------
    //-----------buy products------------

    app.post("/api/buy", async (req, res) => {
      const { userId, productId, quantity } = req.body;

      try {
        const user = await userCollection.findOne({ uid: userId });
        const product = await productCollection.findOne({ _id: productId });

        if (!user || !product) {
          return res.status(404).json({ message: "User or Product not found" });
        }
        const totalAmount = product.price * quantity;

        // if (product.stock < quantity) {
        //   return res.status(400).json({ message: "Insufficient stock" });
        // }

        // // Deduct balance from user and reduce product stock
        // product.stock -= quantity;

        // // Save updates

        //        await productCollection.save();

        // Create an order
        const order = {
          userId: userId,
          products: [{ prodId: productId, qty: quantity }],
          totalAmount,
          orderDate: new Date(),
        };

        const result = await ordersCollection.insertOne(order);

        //res.status(201).json({ message: "Purchase successful", order });
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Get order details by order ID
    app.get("/api/orders/:orderId", async (req, res) => {
      try {
        const orderId = req.params.orderId;
        const order = await ordersCollection.findOne({
          _id: new ObjectId(orderId),
        });

        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }

        const user = await userCollection.findOne(
          { uid: order.userId },
          { projection: { name: 1, email: 1 } }
        );
        const products = await Promise.all(
          order.products.map(async (item) => {
            const product = await productCollection.findOne(
              { _id: item.prodId },
              { projection: { title: 1, price: 1 } }
            );
            return { ...product, quantity: item.quantity };
          })
        );

        res.status(200).json({ ...order, user, products });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    // Send a ping to confirm a successful connection
    //    await client.db("admin").command({ ping: 1 });
    //console.log( "Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  //console.log(`Bootcamp React Node CRUD Server is Running on ${port}`);
});
module.exports = app;

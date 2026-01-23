const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "skilledboys_secret"; // ⚠️ Production me .env use karna

// ✅ MongoDB Connect
mongoose.connect("mongodb://127.0.0.1:27017/skilledboys", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.log(err));
// const mongoose = require("mongoose");

// const MONGO_URI = "mongodb+srv://skilleduser:Skilled12345@skilledboys.imt6bk8.mongodb.net/skilledboys?retryWrites=true&w=majority";

// mongoose.connect(MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => console.log("✅ MongoDB Atlas connected"))
// .catch(err => console.error("❌ MongoDB connection error:", err));


// ✅ Worker Schema
const workerSchema = new mongoose.Schema({
  name: String,
  number: { type: String, unique: true },
  password: String,
  category: String,
  location: String,
  experience: Number,
  gender: String,
  startTime: String,
  endTime: String,
  age: Number,
  rating: { type: Number, default: 0 },
  photo: String,
  status: { type: String, default: "working" },
  createdAt: { type: Date, default: Date.now },
});

const Worker = mongoose.model("Worker", workerSchema);

// ✅ Middleware: Verify Token
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // user.id
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// ✅ Register Worker
app.post("/api/workers/register", async (req, res) => {
  try {
    const { name, number, password, category, location, experience, gender, startTime, endTime, age, photo } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWorker = new Worker({
      name,
      number,
      password: hashedPassword,
      category,
      location,
      experience,
      gender,
      startTime,
      endTime,
      age,
      photo,
    });

    await newWorker.save();
    res.json({ success: true, message: "Worker registered successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error saving worker" });
  }
});

// ✅ Worker Login
app.post("/api/workers/login", async (req, res) => {
  const { number, password } = req.body;

  try {
    const worker = await Worker.findOne({ number });
    if (!worker) return res.status(400).json({ success: false, message: "Worker not found" });

    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: worker._id }, JWT_SECRET, { expiresIn: "1d" });

    res.json({
      success: true,
      token,
      worker: {
        id: worker._id,
        name: worker.name,
        number: worker.number,
        category: worker.category,
        location: worker.location,
        age: worker.age,
        gender: worker.gender,
        status: worker.status,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Worker Profile (Secure) → Only Logged-in Worker Can See
app.get("/api/workers/profile", authMiddleware, async (req, res) => {
  try {
    const worker = await Worker.findById(req.user.id).select("-password"); // password hide
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found" });

    res.json({ success: true, worker });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Update Worker Profile
app.put("/api/workers/:id", async (req, res) => {
  try {
    const updated = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, worker: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
});

// ✅ Toggle Worker Status (Working / Not Working)
app.put("/api/workers/status/:id", async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) return res.status(404).json({ success: false, message: "Worker not found" });

    worker.status = worker.status === "working" ? "not working" : "working";
    await worker.save();

    res.json({ success: true, status: worker.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
});

// ✅ Search Workers
app.get("/api/workers", async (req, res) => {
  const { category, location } = req.query;
  let query = {};
  if (category) query.category = new RegExp(`^${category}$`, "i");
  if (location) query.location = new RegExp(`^${location}$`, "i");

  try {
    const workers = await Worker.find(query).select("-password");
    res.json(workers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Start server
app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));

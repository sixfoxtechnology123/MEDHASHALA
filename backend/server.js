require("dotenv").config();
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const seedAdmin = require("./utils/seedAdmin");

const examRoutes = require("./routes/examRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const syllabusRoutes = require("./routes/syllabusRoutes");
const mockTestRoutes = require("./routes/mockTestRoutes");
const sidebarRoutes = require("./routes/sidebarRoutes");
const app = express();

app.use(cors());
app.use(express.json());


app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/public", sidebarRoutes);
app.use("/api/master/exam", examRoutes);
app.use("/api/exams", examRoutes);

// This line is already correct for axios.get("/master/category/...")
app.use("/api/master/category", categoryRoutes);
app.use("/api/master/syllabus", syllabusRoutes);
app.use("/api/master/mock-test", mockTestRoutes);


const PORT = process.env.PORT || 5004;

const startServer = async () => {
  await connectDB();
  await seedAdmin();
  app.listen(PORT, () =>
    console.log(`🚀 MEDHASHALA Server running on http://localhost:${PORT}`)
  );
};

startServer();

import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AI Marketplace Backend is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

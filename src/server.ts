import app from "./app";
import { connectDB } from "./database/connectDB";

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});

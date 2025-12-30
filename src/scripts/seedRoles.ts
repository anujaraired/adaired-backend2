import mongoose from "mongoose";
import Role from "../models/role.model";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const seedRoles = async (): Promise<void> => {
  try {
    // Check if the Customer role already exists
    const customerRole = await Role.findOne({ name: "customer" }).lean();
    if (!customerRole) {
      await Role.create({
        name: "customer",
        description: "Default role for customers",
        status: true,
        permissions: [],
        users: [],
      });
      console.log("Customer role created successfully");
    } else {
      console.log("Customer role already exists");
    }
  } catch (error) {
    console.error("Error seeding roles:", error);
    throw error;
  }
};

// Execute seeding if run as a standalone script
if (require.main === module) {
  const runSeed = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI!);
      console.log("Connected to MongoDB");
      await seedRoles();
      console.log("Seeding completed");
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  };

  runSeed();
}

export default seedRoles;

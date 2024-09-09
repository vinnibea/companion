import mongoose from "mongoose";

export default async () => {

  try {
    await mongoose.connect(useRuntimeConfig().mongoUrl);
    console.log("DB connection established.");
  } catch (err) {
    console.error("DB connection failed.", err);
  }
};
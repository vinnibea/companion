import mongoose from "mongoose";

export default async () => {

  try {
    const config = useRuntimeConfig();
    await mongoose.connect(config.mongoUrl);
    console.log("DB connection established.");
  } catch (err) {
    console.error("DB connection failed.", err);
  }
};
import mongoose from 'mongoose'

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required')
  }
  return uri
}

export async function connectDB() {
  try {
    await mongoose.connect(getMongoUri())
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  }
}

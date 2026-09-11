import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import { connectDB } from '../src/lib/db'
import { User } from '../src/models/User'

async function makeAdmin() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: npx tsx scripts/makeAdmin.ts <email>')
    process.exit(1)
  }

  try {
    await connectDB()
    const user = await User.findOne({ email: email.trim().toLowerCase() })
    
    if (!user) {
      console.error(`User with email ${email} not found.`)
      process.exit(1)
    }

    user.isAdmin = true
    user.isApproved = true // ensure they are approved too
    user.isDisabled = false // ensure they are enabled
    await user.save()

    console.log(`✅ Success: ${user.email} is now an Admin!`)
    process.exit(0)
  } catch (error) {
    console.error('Error making user admin:', error)
    process.exit(1)
  }
}

makeAdmin()

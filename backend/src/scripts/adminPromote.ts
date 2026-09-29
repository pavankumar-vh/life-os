/**
 * Admin Bootstrap / Recovery CLI
 * --------------------------------
 * Promotes an existing user to host administrator.
 *
 * This is an OPERATOR-ONLY recovery mechanism. It must only be executed by
 * the self-hosting operator from inside the production Docker container.
 * It is NOT reachable via any HTTP endpoint.
 *
 * Usage (production Docker):
 *   docker exec lifeos-backend node dist/scripts/adminPromote.js <email>
 *
 * Or via the package script:
 *   docker exec lifeos-backend npm run admin:promote -- <email>
 *
 * When to use:
 *   - Your account was created BEFORE the first-account-admin bootstrap was
 *     deployed, so it is still a regular user without admin access.
 *   - You need to recover host admin access after accidentally removing all admins.
 *
 * What it does:
 *   - Finds the user by email (case-insensitive)
 *   - Sets isAdmin = true
 *   - Sets isApproved = true
 *   - Sets isDisabled = false
 *   - Saves via Mongoose (triggers schema middleware if any)
 *   - Exits 0 on success, 1 on any failure
 *
 * Security:
 *   - Does NOT expose any HTTP endpoint
 *   - Does NOT log passwords, tokens, or secrets
 *   - Requires direct container access (operator privilege)
 */

import * as dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import { connectDB } from '../lib/db'
import { User } from '../models/User'

export interface PromoteResult {
  success: true
  name: string
  email: string
  wasAdmin: boolean
  wasApproved: boolean
  wasDisabled: boolean
}

/**
 * Core promotion logic — exported so it can be unit-tested without spawning
 * a full process. The CLI entry point below calls this and handles exit codes.
 */
export async function promoteUser(email: string): Promise<PromoteResult> {
  const normalizedEmail = email.trim().toLowerCase()

  await connectDB()

  const user = await User.findOne({ email: normalizedEmail })

  if (!user) {
    await mongoose.disconnect()
    throw new Error(`No user found with email: ${normalizedEmail}`)
  }

  const wasAdmin    = user.isAdmin
  const wasApproved = user.isApproved
  const wasDisabled = user.isDisabled

  user.isAdmin    = true
  user.isApproved = true
  user.isDisabled = false
  await user.save()

  await mongoose.disconnect()

  return {
    success: true,
    name: user.name,
    email: user.email,
    wasAdmin,
    wasApproved,
    wasDisabled,
  }
}

/**
 * CLI entry point — only runs when this file is executed directly (not imported
 * by tests). Reads process.argv, calls promoteUser, and sets the exit code.
 */
async function main(): Promise<void> {
  const email = process.argv[2]

  if (!email || !email.trim()) {
    console.error('Usage: node dist/scripts/adminPromote.js <email>')
    console.error('Example: node dist/scripts/adminPromote.js operator@example.com')
    process.exit(1)
  }

  try {
    const result = await promoteUser(email)

    console.log('\n✅ Admin bootstrap successful!')
    console.log(`   User  : ${result.name} <${result.email}>`)
    console.log(`   isAdmin    : ${result.wasAdmin}    → true`)
    console.log(`   isApproved : ${result.wasApproved} → true`)
    console.log(`   isDisabled : ${result.wasDisabled} → false`)
    console.log('\n   The user can now log in and access the Host Control Center.')

    process.exit(0)
  } catch (error) {
    const msg = (error as Error).message
    if (msg.startsWith('No user found with email:')) {
      console.error(`\n❌ ${msg}`)
      console.error('   Check the email address and try again.')
    } else {
      console.error('\n❌ Admin bootstrap failed:', error)
    }
    process.exit(1)
  }
}

// Only run when executed directly — not when imported by Jest
if (require.main === module) {
  main()
}

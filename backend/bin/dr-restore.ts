import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

dotenv.config()

import '../src/models/User'
import '../src/models/Task'
import '../src/models/Goal'
import '../src/models/Project'
import '../src/models/Habit'
import '../src/models/Note'
import '../src/models/Journal'
import '../src/models/Workout'
import '../src/models/Meal'
import '../src/models/SleepLog'
import '../src/models/WaterLog'
import '../src/models/BodyLog'
import '../src/models/Expense'
import '../src/models/Book'
import '../src/models/Bookmark'
import '../src/models/Flashcard'
import '../src/models/Capture'
import '../src/models/AuditLog'
import '../src/models/Gratitude'
import '../src/models/WishlistItem'
import '../src/models/FocusSession'

import { connectDB } from '../src/lib/db'

import readline from 'readline'

const TEMP_DIR = path.join(process.cwd(), 'lifeos-recovery-tmp')

function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

async function main() {
  const archivePath = process.argv[2]
  
  if (!archivePath || !archivePath.endsWith('.tar.gz')) {
    console.error('Usage: npx tsx bin/dr-restore.ts <path-to-archive.tar.gz>')
    process.exit(1)
  }
  
  if (!fs.existsSync(archivePath)) {
    console.error(`File not found: ${archivePath}`)
    process.exit(1)
  }

  console.log('=== Life OS Disaster Recovery Restore ===')
  
  console.log('[1/7] Extracting Archive...')
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true })
  
  // Extract to TEMP_DIR directly, stripping the top-level 'lifeos-recovery' folder if it exists
  execSync(`tar -xzf ${archivePath} -C ${TEMP_DIR}`)
  
  // Depending on how it was packaged, the files might be inside TEMP_DIR/lifeos-recovery
  let sourceDir = TEMP_DIR
  if (fs.existsSync(path.join(TEMP_DIR, 'lifeos-recovery'))) {
    sourceDir = path.join(TEMP_DIR, 'lifeos-recovery')
  }

  const manifestPath = path.join(sourceDir, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('Error: Invalid backup archive (missing manifest.json).')
    process.exit(1)
  }

  console.log('[2/7] Validating Manifest & Checksums...')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  console.log(`  -> Backup Type: ${manifest.backupType}`)
  console.log(`  -> Timestamp: ${manifest.timestamp}`)
  console.log(`  -> App Version: ${manifest.appVersion}`)
  console.log(`  -> Git SHA: ${manifest.git.sha}`)
  
  const dbDir = path.join(sourceDir, 'database')
  if (!fs.existsSync(dbDir)) {
    console.error('Error: Missing database directory in archive.')
    process.exit(1)
  }

  for (const [modelName, expectedHash] of Object.entries(manifest.hashes as Record<string, string>)) {
    const file = path.join(dbDir, `${modelName}.jsonl`)
    if (fs.existsSync(file)) {
      const actualHash = await hashFile(file)
      if (actualHash !== expectedHash) {
        console.error(`WARNING: Hash mismatch for ${modelName}.jsonl! Expected ${expectedHash}, got ${actualHash}`)
      }
    }
  }

  console.log('[3/7] Connecting to Target Database...')
  await connectDB()

  console.log('[4/7] Checking for existing data (Safety Checkpoint)...')
  const userCount = await mongoose.model('User').countDocuments()
  if (userCount > 0) {
    console.log(`  -> Target database is NOT empty (contains ${userCount} users).`)
    if (process.env.SKIP_SAFETY_BACKUP !== 'true') {
      console.log('  -> Creating safety checkpoint backup before restore...')
      try {
        execSync('npx tsx bin/dr-backup.ts', { stdio: 'inherit' })
      } catch (e) {
        console.error('  -> Failed to create safety backup. Aborting restore. (Set SKIP_SAFETY_BACKUP=true to bypass)')
        process.exit(1)
      }
    } else {
      console.log('  -> SKIP_SAFETY_BACKUP is true. Skipping checkpoint.')
    }
  } else {
    console.log('  -> Target database is empty. No safety checkpoint needed.')
  }

  console.log('[5/7] Restoring Collections (Upsert Merge)...')
  const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.jsonl'))
  
  for (const file of files) {
    const modelName = file.replace('.jsonl', '')
    const Model = mongoose.model(modelName)
    const filePath = path.join(dbDir, file)
    
    console.log(`  -> Restoring ${modelName}...`)
    
    const fileStream = fs.createReadStream(filePath)
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity })
    
    let batch: any[] = []
    let totalUpserted = 0
    
    for await (const line of rl) {
      if (!line.trim()) continue
      const doc = JSON.parse(line)
      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: doc },
          upsert: true
        }
      })
      
      if (batch.length >= 500) {
        await Model.bulkWrite(batch, { ordered: false })
        totalUpserted += batch.length
        batch = []
      }
    }
    
    if (batch.length > 0) {
      await Model.bulkWrite(batch, { ordered: false })
      totalUpserted += batch.length
    }
    
    console.log(`     Done: ${totalUpserted} records.`)
  }

  console.log('[6/7] Cleaning up temporary files...')
  fs.rmSync(TEMP_DIR, { recursive: true, force: true })

  console.log('[7/7] Restore Complete! System is ready.')
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal Error during DR Restore:', err)
  process.exit(1)
})

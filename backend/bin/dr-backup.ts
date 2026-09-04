import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import crypto from 'crypto'
import mongoose from 'mongoose'
import * as dotenv from 'dotenv'

// Ensure we load environment variables
dotenv.config()

// Import all models so they register with Mongoose
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
import { getUserDriveClient, getDriveFolderId } from '../src/lib/BackupService'

const OUT_DIR = path.join(process.cwd(), 'lifeos-recovery')
const DB_DIR = path.join(OUT_DIR, 'database')
const PKG_JSON = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
const BACKUP_FORMAT = 'DR-1.0'

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getGitMeta() {
  try {
    const sha = execSync('git rev-parse HEAD').toString().trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
    return { sha, branch }
  } catch (e) {
    return { sha: 'unknown', branch: 'unknown' }
  }
}

function getSafeConfig() {
  return {
    PORT: process.env.PORT || '3000',
    NODE_ENV: process.env.NODE_ENV || 'production',
    B2_REGION: process.env.B2_REGION,
    B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
    B2_PUBLIC_URL: process.env.B2_PUBLIC_URL,
    // explicitly ignoring secrets
  }
}

/**
 * Computes SHA-256 for a file.
 */
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
  console.log('=== Life OS Disaster Recovery Backup ===')
  
  await ensureDir(OUT_DIR)
  await ensureDir(DB_DIR)

  console.log('[1/5] Connecting to Database...')
  await connectDB()

  console.log('[2/5] Exporting Collections (Streaming JSONL)...')
  const modelNames = mongoose.modelNames()
  const collectionsSummary: Record<string, number> = {}
  const collectionHashes: Record<string, string> = {}
  
  for (const modelName of modelNames) {
    const Model = mongoose.model(modelName)
    const outFile = path.join(DB_DIR, `${modelName}.jsonl`)
    
    // We stream cursor to avoid OOM on 1GB RAM machines
    const cursor = Model.find().lean().cursor()
    const writeStream = fs.createWriteStream(outFile)
    
    let count = 0
    for await (const doc of cursor) {
      writeStream.write(JSON.stringify(doc) + '\n')
      count++
    }
    writeStream.end()
    
    // Wait for stream to finish writing
    await new Promise(resolve => writeStream.on('finish', resolve))
    
    collectionsSummary[modelName] = count
    collectionHashes[modelName] = await hashFile(outFile)
    console.log(`  -> ${modelName}: ${count} records`)
  }

  console.log('[3/5] Generating Manifest & Config...')
  const gitMeta = getGitMeta()
  const manifest = {
    backupType: 'DISASTER_RECOVERY',
    formatVersion: BACKUP_FORMAT,
    appVersion: PKG_JSON.version,
    timestamp: new Date().toISOString(),
    git: gitMeta,
    nodeVersion: process.version,
    collections: collectionsSummary,
    hashes: collectionHashes
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(path.join(OUT_DIR, 'config.json'), JSON.stringify(getSafeConfig(), null, 2))

  console.log('[4/5] Creating Compressed Archive...')
  const timestampStr = manifest.timestamp.replace(/[:.]/g, '-').slice(0, 19)
  const archiveName = `LifeOS_DR_${timestampStr}_${gitMeta.sha.slice(0,7)}.tar.gz`
  const archivePath = path.join(process.cwd(), archiveName)
  
  // Use POSIX tar for portability (available on Mac/Ubuntu)
  execSync(`tar -czf ${archiveName} -C ${process.cwd()} lifeos-recovery`)
  
  console.log(`  -> Archive created: ${archivePath}`)
  
  // Cleanup temporary dir
  fs.rmSync(OUT_DIR, { recursive: true, force: true })

  console.log('[5/5] Backup Complete.')
  
  // Optional Google Drive Upload
  const uploadUserId = process.env.DR_UPLOAD_USER_ID
  if (uploadUserId) {
    console.log(`[+] DR_UPLOAD_USER_ID set. Uploading to Google Drive for user: ${uploadUserId}...`)
    try {
      const drive = await getUserDriveClient(uploadUserId)
      const folderId = await getDriveFolderId(drive)
      
      const file = await drive.files.create({
        requestBody: {
          name: archiveName,
          parents: [folderId],
          mimeType: 'application/gzip',
        },
        media: {
          mimeType: 'application/gzip',
          body: fs.createReadStream(archivePath),
        },
        fields: 'id,webViewLink',
      })
      
      console.log(`  -> Upload successful! File ID: ${file.data.id}`)
      console.log(`  -> Link: ${file.data.webViewLink}`)
    } catch (e) {
      console.error('  -> Failed to upload to Google Drive:', e)
    }
  } else {
    console.log(`[!] DR_UPLOAD_USER_ID not set. Archive remains safely on local disk.`)
  }
  
  process.exit(0)
}

main().catch(err => {
  console.error('Fatal Error during DR Backup:', err)
  process.exit(1)
})

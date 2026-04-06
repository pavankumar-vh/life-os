import mongoose, { Schema, Document } from 'mongoose'

export type VaultFileType = 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'archive' | 'other'

export interface IVaultFile extends Document {
  userId: mongoose.Types.ObjectId
  name: string          // display name (user can rename)
  originalName: string  // original filename
  url: string           // B2 public URL
  key: string           // B2 storage key (for deletion)
  mimeType: string
  sizeBytes: number
  fileType: VaultFileType
  folder: string        // virtual folder path, e.g. "Documents/Work"
  tags: string[]
  starred: boolean
  encrypted: boolean    // future: client-side encryption flag
  createdAt: Date
  updatedAt: Date
}

function detectFileType(mime: string): VaultFileType {
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.match(/zip|rar|7z|tar|gz/)) return 'archive'
  if (mime.match(/word|excel|powerpoint|spreadsheet|presentation|doc|xls|ppt/)) return 'document'
  if (mime.match(/text\//)) return 'document'
  return 'other'
}

const VaultFileSchema = new Schema<IVaultFile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  originalName: { type: String, required: true },
  url: { type: String, required: true },
  key: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  fileType: {
    type: String,
    enum: ['image', 'pdf', 'video', 'audio', 'document', 'archive', 'other'],
    default: 'other',
  },
  folder: { type: String, default: 'Root' },
  tags: [{ type: String }],
  starred: { type: Boolean, default: false },
  encrypted: { type: Boolean, default: false },
}, { timestamps: true })

VaultFileSchema.static('detectFileType', detectFileType)
VaultFileSchema.index({ userId: 1, folder: 1 })
VaultFileSchema.index({ userId: 1, starred: 1 })

export { detectFileType }
export const VaultFile = mongoose.model<IVaultFile>('VaultFile', VaultFileSchema)

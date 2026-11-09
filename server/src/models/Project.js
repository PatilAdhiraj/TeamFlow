import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
}, { timestamps: true })

export default mongoose.model('Project', projectSchema)

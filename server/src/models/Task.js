import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 4000, default: '' },
  status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do', required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium', required: true },
  dueDate: { type: Date, default: null },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
}, { timestamps: true })

export default mongoose.model('Task', taskSchema)

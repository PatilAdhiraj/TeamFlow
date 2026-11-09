import { Router } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Workspace from '../models/Workspace.js'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import { createWorkspaceMemberGuard } from '../middleware/workspaceAccess.js'

const router = Router()
const requireWorkspaceMember = createWorkspaceMemberGuard(Workspace)
const workspaceSchema = z.object({ name: z.string().trim().min(1).max(80) })
const projectSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional().default(''),
})

router.get('/', async (req, res) => {
  const workspaces = await Workspace.find({ members: req.user.id }).sort({ createdAt: 1 })
  return res.json({ workspaces })
})

router.post('/', async (req, res) => {
  const { name } = workspaceSchema.parse(req.body)
  const workspace = await Workspace.create({ name, owner: req.user.id, members: [req.user.id] })
  return res.status(201).json({ workspace })
})

router.get('/:workspaceId/projects', requireWorkspaceMember, async (req, res) => {
  const projects = await Project.find({ workspace: req.workspace.id }).sort({ createdAt: 1 })
  return res.json({ projects })
})

router.post('/:workspaceId/projects', requireWorkspaceMember, async (req, res) => {
  const input = projectSchema.parse(req.body)
  const project = await Project.create({ ...input, workspace: req.workspace.id })
  return res.status(201).json({ project })
})

router.get('/:workspaceId/members', requireWorkspaceMember, async (req, res) => {
  const members = await User.find({ _id: { $in: req.workspace.members } }).select('name email').sort({ name: 1 })
  return res.json({
    members: members.map((member) => ({ _id: member.id, name: member.name, email: member.email })),
  })
})

router.post('/:workspaceId/members', requireWorkspaceMember, async (req, res) => {
  if (String(req.workspace.owner) !== req.user.id) {
    return res.status(403).json({ message: 'Only the workspace owner can add members.' })
  }
  const input = z.object({ email: z.string().email().max(254).transform((email) => email.toLowerCase().trim()) }).parse(req.body)
  const user = await User.findOne({ email: input.email }).select('_id')
  if (!user) return res.status(404).json({ message: 'No TeamFlow account exists for that email.' })
  await Workspace.updateOne({ _id: req.workspace.id }, { $addToSet: { members: user.id } })
  return res.status(200).json({ message: 'Member added.' })
})

router.delete('/:workspaceId/members/:memberId', requireWorkspaceMember, async (req, res) => {
  if (String(req.workspace.owner) !== req.user.id) {
    return res.status(403).json({ message: 'Only the workspace owner can remove members.' })
  }
  if (!mongoose.isValidObjectId(req.params.memberId)) {
    return res.status(400).json({ message: 'Invalid member ID.' })
  }
  if (String(req.workspace.owner) === req.params.memberId) {
    return res.status(400).json({ message: 'The workspace owner cannot be removed.' })
  }
  const isMember = req.workspace.members.some((member) => String(member) === req.params.memberId)
  if (!isMember) return res.status(404).json({ message: 'Workspace member not found.' })

  await Workspace.updateOne(
    { _id: req.workspace.id },
    { $pull: { members: new mongoose.Types.ObjectId(req.params.memberId) } },
  )
  await Task.updateMany(
    { workspace: req.workspace.id, assignee: req.params.memberId },
    { $set: { assignee: null } },
  )
  return res.status(204).end()
})

export { projectSchema }
export default router

import { Router } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import User from '../models/User.js'
import Workspace from '../models/Workspace.js'
import { createWorkspaceMemberGuard } from '../middleware/workspaceAccess.js'

const router = Router()
const requireWorkspaceMember = createWorkspaceMemberGuard(Workspace)
const taskFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']).optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  dueDate: z.union([
    z.iso.date().transform((date) => new Date(`${date}T00:00:00.000Z`)),
    z.iso.datetime().transform((date) => new Date(date)),
    z.null(),
  ]).optional(),
  assignee: z.union([z.string().regex(/^[a-f\d]{24}$/i), z.null()]).optional(),
}
const createTaskSchema = z.object(taskFields)
const updateTaskSchema = z.object(Object.fromEntries(
  Object.entries(taskFields).map(([key, schema]) => [key, schema.optional()]),
)).refine((value) => Object.keys(value).length > 0, 'At least one field is required.')

async function validateAssignee(assignee, workspace) {
  if (!assignee) return null
  if (!mongoose.isValidObjectId(assignee)) return false
  const member = await User.exists({ _id: { $eq: assignee, $in: workspace.members } })
  return member ? assignee : false
}

async function findAuthorizedProject(req, res, next) {
  try {
    const project = await Project.findById(req.params.projectId).select('workspace')
    if (!project) return res.status(404).json({ message: 'Project not found.' })
    req.params.workspaceId = String(project.workspace)
    req.project = project
    return requireWorkspaceMember(req, res, next)
  } catch (error) {
    return next(error)
  }
}

router.get('/projects/:projectId/tasks', findAuthorizedProject, async (req, res) => {
  const filter = { project: req.project.id, workspace: req.workspace.id }
  if (req.query.status) {
    const parsed = z.enum(['To Do', 'In Progress', 'Done']).safeParse(req.query.status)
    if (!parsed.success) return res.status(400).json({ message: 'Invalid task status filter.' })
    filter.status = parsed.data
  }
  if (req.query.assignee) {
    if (!mongoose.isValidObjectId(req.query.assignee) || !req.workspace.members.some((member) => String(member) === req.query.assignee)) {
      return res.status(400).json({ message: 'Invalid assignee filter.' })
    }
    filter.assignee = req.query.assignee
  }
  const tasks = await Task.find(filter).populate('assignee', 'name email').sort({ createdAt: -1 })
  return res.json({ tasks })
})

router.post('/projects/:projectId/tasks', findAuthorizedProject, async (req, res) => {
  const input = createTaskSchema.parse(req.body)
  const assignee = await validateAssignee(input.assignee, req.workspace)
  if (assignee === false) return res.status(400).json({ message: 'The assignee must be a workspace member.' })
  const task = await Task.create({
    ...input,
    dueDate: input.dueDate || null,
    assignee,
    project: req.project.id,
    workspace: req.workspace.id,
  })
  await task.populate('assignee', 'name email')
  return res.status(201).json({ task })
})

async function findAuthorizedTask(req, res, next) {
  try {
    const task = await Task.findById(req.params.taskId)
    if (!task) return res.status(404).json({ message: 'Task not found.' })
    req.task = task
    req.params.workspaceId = String(task.workspace)
    return requireWorkspaceMember(req, res, next)
  } catch (error) {
    return next(error)
  }
}

router.patch('/tasks/:taskId', findAuthorizedTask, async (req, res) => {
  const input = updateTaskSchema.parse(req.body)
  if (Object.hasOwn(input, 'assignee')) {
    const assignee = await validateAssignee(input.assignee, req.workspace)
    if (assignee === false) return res.status(400).json({ message: 'The assignee must be a workspace member.' })
    input.assignee = assignee
  }
  Object.assign(req.task, input)
  await req.task.save()
  await req.task.populate('assignee', 'name email')
  return res.json({ task: req.task })
})

router.delete('/tasks/:taskId', findAuthorizedTask, async (req, res) => {
  await req.task.deleteOne()
  return res.status(204).end()
})

export default router

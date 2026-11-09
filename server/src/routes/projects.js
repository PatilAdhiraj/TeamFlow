import { Router } from 'express'
import { z } from 'zod'
import Project from '../models/Project.js'
import Task from '../models/Task.js'
import Workspace from '../models/Workspace.js'
import { createWorkspaceMemberGuard } from '../middleware/workspaceAccess.js'

const router = Router()
const requireWorkspaceMember = createWorkspaceMemberGuard(Workspace)
const projectParams = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
    if (!project) return res.status(404).json({ message: 'Project not found.' })
    req.params.workspaceId = String(project.workspace)
    req.project = project
    return requireWorkspaceMember(req, res, next)
  } catch (error) {
    return next(error)
  }
}
const projectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0, 'At least one field is required.')

router.patch('/:projectId', projectParams, async (req, res) => {
  const input = projectSchema.parse(req.body)
  Object.assign(req.project, input)
  await req.project.save()
  return res.json({ project: req.project })
})

router.delete('/:projectId', projectParams, async (req, res) => {
  await Task.deleteMany({ project: req.project.id, workspace: req.workspace.id })
  await req.project.deleteOne()
  return res.status(204).end()
})

export default router

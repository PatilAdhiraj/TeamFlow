export function createWorkspaceMemberGuard(WorkspaceModel) {
  return async function requireWorkspaceMember(req, res, next) {
    try {
      const workspace = await WorkspaceModel.findOne({
        _id: req.params.workspaceId,
        members: req.user.id,
      }).select('_id owner members')

      if (!workspace) return res.status(404).json({ message: 'Workspace not found.' })
      req.workspace = workspace
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

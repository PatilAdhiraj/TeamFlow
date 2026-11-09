import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceMemberGuard } from './workspaceAccess.js'

const workspaceId = '66e4ce2b840c1d852e6d9d21'
const userId = '66e4ce2b840c1d852e6d9d22'

function makeResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test('workspace member guard attaches a workspace and continues', async () => {
  const workspace = { id: workspaceId, owner: userId, members: [userId] }
  const WorkspaceModel = { findOne: () => ({ select: async () => workspace }) }
  const guard = createWorkspaceMemberGuard(WorkspaceModel)
  const req = { params: { workspaceId }, user: { id: userId } }
  const res = makeResponse()
  let continued = false

  await guard(req, res, () => { continued = true })

  assert.equal(continued, true)
  assert.equal(req.workspace, workspace)
  assert.equal(res.statusCode, 200)
})

test('workspace member guard denies non-members without revealing the workspace', async () => {
  const WorkspaceModel = { findOne: () => ({ select: async () => null }) }
  const guard = createWorkspaceMemberGuard(WorkspaceModel)
  const req = { params: { workspaceId }, user: { id: userId } }
  const res = makeResponse()
  let continued = false

  await guard(req, res, () => { continued = true })

  assert.equal(continued, false)
  assert.equal(res.statusCode, 404)
  assert.deepEqual(res.body, { message: 'Workspace not found.' })
})

test('workspace member guard forwards database errors', async () => {
  const failure = new Error('database unavailable')
  const WorkspaceModel = { findOne: () => ({ select: async () => { throw failure } }) }
  const guard = createWorkspaceMemberGuard(WorkspaceModel)
  let forwarded

  await guard({ params: { workspaceId }, user: { id: userId } }, makeResponse(), (error) => { forwarded = error })

  assert.equal(forwarded, failure)
})

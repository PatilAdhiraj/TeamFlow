import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const REFRESH_INTERVAL_MS = 15_000

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) {
    const error = new Error(data?.message || 'Something went wrong.')
    error.status = response.status
    throw error
  }
  return data
}

const initials = (name = '') => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
const dueDateOnly = (date) => date ? new Date(date).toISOString().slice(0, 10) : ''
const formatDate = (date) => date ? new Date(`${dueDateOnly(date)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
const isOverdue = (date) => {
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${dueDateOnly(date)}T00:00:00`) < today
}

function AuthScreen({ onAuthenticated, initialError }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState(initialError || '')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user } = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) })
      onAuthenticated(user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand brand-light" href="#"><span className="brand-mark">T</span> teamflow</a>
        <div className="intro-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A calmer way to work together</div>
          <h1>Make good work<br /><span>happen.</span></h1>
          <p>Bring your team, projects, and next big ideas into one clear space.</p>
        </div>
        <div className="intro-foot"><span>01</span> Workspace for your best work</div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-heading">
            <p className="eyebrow">YOUR TEAM'S NEW HOME</p>
            <h2>{mode === 'login' ? 'Welcome back' : 'Get started'}</h2>
            <p>{mode === 'login' ? 'Pick up right where you left off.' : 'Create your account and start building together.'}</p>
          </div>
          <form onSubmit={submit} className="form-stack">
            {mode === 'register' && (
              <label>Your name<input autoComplete="name" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Alex Morgan" /></label>
            )}
            <label>Email address<input autoComplete="email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label>
            <label>Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>
            {error && <div className="error-message" role="alert">{error}</div>}
            <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-switch">{mode === 'login' ? 'New to TeamFlow?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
          <p className="auth-legal">By continuing, you agree to keep your team’s work thoughtful and respectful.</p>
        </div>
      </section>
    </main>
  )
}

function Dialog({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><div><p className="eyebrow">TEAMFLOW</p><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
        {children}
      </section>
    </div>
  )
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('teamflow-theme') === 'dark' ? 'dark' : 'light')
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [authError, setAuthError] = useState('')
  const [workspaces, setWorkspaces] = useState([])
  const [workspaceId, setWorkspaceId] = useState('')
  const workspaceIdRef = useRef('')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [filterStatus, setFilterStatus] = useState('All status')
  const [filterAssignee, setFilterAssignee] = useState('All people')
  const [modal, setModal] = useState('')
  const [selectedTask, setSelectedTask] = useState(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [pageError, setPageError] = useState('')

  const activeWorkspace = workspaces.find((workspace) => workspace._id === workspaceId)
  const activeProject = projects.find((project) => project._id === projectId)
  const canManageMembers = Boolean(activeWorkspace && String(activeWorkspace.owner) === user?.id)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('teamflow-theme', theme)
  }, [theme])

  const loadWorkspaces = useCallback(async () => {
    const data = await request('/workspaces')
    setWorkspaces(data.workspaces)
    const currentWorkspaceId = workspaceIdRef.current
    const nextWorkspaceId = data.workspaces.some((workspace) => workspace._id === currentWorkspaceId)
      ? currentWorkspaceId
      : data.workspaces[0]?._id || ''
    workspaceIdRef.current = nextWorkspaceId
    setWorkspaceId(nextWorkspaceId)
    if (nextWorkspaceId !== currentWorkspaceId || !nextWorkspaceId) {
      setProjects([])
      setProjectId('')
      setTasks([])
      setMembers([])
      setFilterStatus('All status')
      setFilterAssignee('All people')
    }
  }, [])

  const loadWorkspaceData = useCallback(async () => {
    if (!workspaceId) return
    const [projectData, memberData] = await Promise.all([
      request(`/workspaces/${workspaceId}/projects`),
      request(`/workspaces/${workspaceId}/members`),
    ])
    setProjects(projectData.projects)
    setProjectId((current) => projectData.projects.some((project) => project._id === current) ? current : projectData.projects[0]?._id || '')
    setMembers(memberData.members)
  }, [workspaceId])

  const loadTasks = useCallback(async () => {
    if (!projectId) return
    const params = new URLSearchParams()
    if (filterStatus !== 'All status') params.set('status', filterStatus)
    if (filterAssignee !== 'All people') params.set('assignee', filterAssignee)
    const data = await request(`/projects/${projectId}/tasks?${params}`)
    setTasks(data.tasks)
  }, [projectId, filterStatus, filterAssignee])

  useEffect(() => {
    request('/auth/me')
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch((error) => {
        if (error.status !== 401) setAuthError(error.message)
      })
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    if (!user) return
    loadWorkspaces().catch((error) => setPageError(error.message))
  }, [user, loadWorkspaces])

  useEffect(() => {
    if (!user) return
    loadWorkspaceData().catch((error) => setPageError(error.message))
  }, [user, loadWorkspaceData])

  useEffect(() => {
    if (!user) return
    loadTasks().catch((error) => setPageError(error.message))
  }, [user, loadTasks])

  useEffect(() => {
    if (!user) return

    let refreshInProgress = false
    let lastRefreshAt = 0
    async function refreshSharedData() {
      const now = Date.now()
      if (document.visibilityState !== 'visible' || refreshInProgress || now - lastRefreshAt < 1000) return
      lastRefreshAt = now
      refreshInProgress = true
      try {
        await Promise.all([loadWorkspaces(), loadWorkspaceData(), loadTasks()])
      } catch (error) {
        setPageError(error.message)
      } finally {
        refreshInProgress = false
      }
    }

    const interval = window.setInterval(refreshSharedData, REFRESH_INTERVAL_MS)
    window.addEventListener('focus', refreshSharedData)
    document.addEventListener('visibilitychange', refreshSharedData)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshSharedData)
      document.removeEventListener('visibilitychange', refreshSharedData)
    }
  }, [user, loadWorkspaces, loadWorkspaceData, loadTasks])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function perform(action) {
    setBusy(true)
    setPageError('')
    try {
      await action()
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await request('/auth/logout', { method: 'POST' })
    setUser(null)
    setWorkspaces([])
    workspaceIdRef.current = ''
    setWorkspaceId('')
    setProjects([])
    setProjectId('')
    setTasks([])
    setMembers([])
    setFilterStatus('All status')
    setFilterAssignee('All people')
    setSelectedTask(null)
    setModal('')
    setPageError('')
  }

  async function createWorkspace(event) {
    event.preventDefault()
    const name = new FormData(event.currentTarget).get('name')
    await perform(async () => {
      const { workspace } = await request('/workspaces', { method: 'POST', body: JSON.stringify({ name }) })
      await loadWorkspaces()
      workspaceIdRef.current = workspace._id
      setWorkspaceId(workspace._id)
      setModal('')
      setNotice('Workspace created')
    })
  }

  async function createProject(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await perform(async () => {
      const { project } = await request(`/workspaces/${workspaceId}/projects`, { method: 'POST', body: JSON.stringify({ name: form.get('name'), description: form.get('description') }) })
      await loadWorkspaceData()
      setProjectId(project._id)
      setModal('')
      setNotice('Project created')
    })
  }

  async function saveTask(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      status: form.get('status'),
      priority: form.get('priority'),
      dueDate: form.get('dueDate') || null,
      assignee: form.get('assignee') || null,
    }
    await perform(async () => {
      if (selectedTask) {
        await request(`/tasks/${selectedTask._id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        setNotice('Task updated')
      } else {
        await request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(payload) })
        setNotice('Task created')
      }
      await loadTasks()
      setModal('')
      setSelectedTask(null)
    })
  }

  async function addMember(event) {
    event.preventDefault()
    if (!workspaceId || !canManageMembers) {
      setPageError('Only the workspace owner can add members.')
      return
    }
    const form = event.currentTarget
    const email = new FormData(form).get('email')
    await perform(async () => {
      await request(`/workspaces/${workspaceId}/members`, { method: 'POST', body: JSON.stringify({ email }) })
      const { members: updated } = await request(`/workspaces/${workspaceId}/members`)
      setMembers(updated)
      setNotice('Member added')
      form.reset()
    })
  }

  async function removeMember(member) {
    if (!canManageMembers || !workspaceId) {
      if (!canManageMembers) setPageError('Only the workspace owner can remove members.')
      return
    }
    if (!window.confirm(`Remove ${member.name} from this workspace? Their assigned tasks will become unassigned.`)) return

    await perform(async () => {
      await request(`/workspaces/${workspaceId}/members/${member._id}`, { method: 'DELETE' })
      const { members: updated } = await request(`/workspaces/${workspaceId}/members`)
      setMembers(updated)

      if (filterAssignee === member._id) {
        setFilterAssignee('All people')
        if (projectId) {
          const { tasks: updatedTasks } = await request(`/projects/${projectId}/tasks`)
          setTasks(updatedTasks)
        }
      } else if (projectId) {
        await loadTasks()
      }

      setNotice(`${member.name} removed from workspace`)
    })
  }

  async function changeStatus(task, status) {
    await perform(async () => {
      await request(`/tasks/${task._id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      await loadTasks()
    })
  }

  async function deleteTask() {
    if (!selectedTask || !window.confirm(`Delete "${selectedTask.title}"? This can't be undone.`)) return
    await perform(async () => {
      await request(`/tasks/${selectedTask._id}`, { method: 'DELETE' })
      await loadTasks()
      setSelectedTask(null)
      setModal('')
      setNotice('Task deleted')
    })
  }

  const columns = useMemo(() => [
    { name: 'To Do', hint: 'Ready when you are', tone: 'todo' },
    { name: 'In Progress', hint: 'Work in motion', tone: 'progress' },
    { name: 'Done', hint: 'Nicely done', tone: 'done' },
  ], [])
  const filteredTasks = tasks
  const completedCount = tasks.filter((task) => task.status === 'Done').length

  if (booting) return <div className="loading-screen"><span className="brand-mark">T</span><span>Getting your workspace ready…</span></div>
  if (!user) return <AuthScreen initialError={authError} onAuthenticated={setUser} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark">T</span> teamflow</a>
        <div className="workspace-picker-wrap">
          <label className="eyebrow" htmlFor="workspace-picker">WORKSPACE</label>
          <select id="workspace-picker" value={workspaceId} onChange={(event) => { workspaceIdRef.current = event.target.value; setWorkspaceId(event.target.value); setProjectId(''); setProjects([]); setTasks([]); setMembers([]); setFilterStatus('All status'); setFilterAssignee('All people'); setPageError('') }}>
            {workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.name}</option>)}
          </select>
        </div>
        <button className="sidebar-new-workspace" onClick={() => setModal('workspace')}><span>＋</span> New workspace</button>
        <div className="sidebar-section-heading"><span>YOUR PROJECTS</span><button className="small-icon-button" onClick={() => activeWorkspace && setModal('project')} aria-label="Create project" disabled={!activeWorkspace}>＋</button></div>
        <nav className="project-nav" aria-label="Projects">
          {projects.map((project, index) => (
            <button key={project._id} className={`project-nav-item ${project._id === projectId ? 'active' : ''}`} onClick={() => { setProjectId(project._id); setTasks([]) }}>
              <span className={`project-glyph glyph-${index % 4}`}>{project.name.slice(0, 1).toUpperCase()}</span><span>{project.name}</span>
            </button>
          ))}
          {activeWorkspace && projects.length === 0 && <p className="sidebar-empty">Your first project starts here.</p>}
        </nav>
        <div className="sidebar-bottom">
          <button className="member-link" onClick={() => activeWorkspace && setModal('members')} disabled={!activeWorkspace}><span className="nav-symbol">♧</span> Members & settings</button>
          <button className="settings-link" onClick={() => setModal('settings')}><span className="nav-symbol">⚙</span> Settings</button>
          <div className="profile-card">
            <div className="avatar avatar-dark">{initials(user.name)}</div>
            <div className="profile-copy"><strong>{user.name}</strong><span>{user.email}</span></div>
            <button className="profile-menu" aria-label="Sign out" title="Sign out" onClick={() => perform(signOut)}>↗</button>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>{activeWorkspace?.name || 'Workspace'}</span><span className="breadcrumb-separator">/</span><strong>{activeProject?.name || 'Overview'}</strong></div>
          <div className="topbar-right">
            <div className="avatar-stack" aria-label={`${members.length} workspace members`}>
              {members.slice(0, 3).map((member, index) => <span className={`avatar avatar-${index}`} key={member._id} title={member.name}>{initials(member.name)}</span>)}
              {members.length > 3 && <span className="avatar avatar-more">+{members.length - 3}</span>}
            </div>
            <button className="invite-button" onClick={() => activeWorkspace && setModal('members')} disabled={!activeWorkspace}>Invite people <span>＋</span></button>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div><p className="eyebrow page-eyebrow"><span className="eyebrow-dot" /> YOUR TEAM, IN FLOW</p><h1>{activeProject ? activeProject.name : activeWorkspace ? 'Your workspace' : 'Let’s get started'}</h1><p className="welcome-description">{activeProject?.description || (activeWorkspace ? 'Small steps, shared momentum. Here’s what’s moving today.' : 'Create a workspace to bring your team together.')}</p></div>
            {activeProject && <button className="button button-primary" onClick={() => { setSelectedTask(null); setModal('task') }}><span>＋</span> New task</button>}
          </div>

          {pageError && <div className="page-error" role="alert">{pageError}<button onClick={() => setPageError('')} aria-label="Dismiss error">×</button></div>}

          {!activeWorkspace ? (
            <section className="empty-state"><div className="empty-illustration"><span>✦</span><span>✧</span><i>＋</i></div><h2>A good team starts with a space.</h2><p>Create a workspace for your team’s projects and tasks.</p><button className="button button-primary" onClick={() => setModal('workspace')}>Create a workspace <span>→</span></button></section>
          ) : !activeProject ? (
            <section className="empty-state"><div className="empty-illustration"><span>✦</span><span>✧</span><i>↗</i></div><h2>Every great idea needs a home.</h2><p>Start a project and turn your next idea into a plan.</p><button className="button button-primary" onClick={() => setModal('project')}>Create a project <span>→</span></button></section>
          ) : (
            <>
              <div className="overview-grid">
                <article className="overview-card"><div className="overview-icon icon-lilac">◎</div><div className="overview-copy"><span>Tasks in view</span><strong>{tasks.length.toString().padStart(2, '0')} <small>tasks</small></strong></div><span className="card-sparkline">⌁</span></article>
                <article className="overview-card"><div className="overview-icon icon-peach">◷</div><div className="overview-copy"><span>In progress</span><strong>{tasks.filter((task) => task.status === 'In Progress').length.toString().padStart(2, '0')} <small>moving</small></strong></div><span className="mini-progress"><i style={{ width: `${tasks.length ? Math.round((tasks.filter((task) => task.status === 'In Progress').length / tasks.length) * 100) : 0}%` }} /></span></article>
                <article className="overview-card"><div className="overview-icon icon-mint">✓</div><div className="overview-copy"><span>Completed</span><strong>{completedCount.toString().padStart(2, '0')} <small>done</small></strong></div><span className="card-check">✓</span></article>
              </div>

              <div className="board-heading"><div><h2>Project board <span className="task-count">{tasks.length}</span></h2><p>A little progress adds up.</p></div><div className="board-filters"><label className="filter-control"><span>↕</span><select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} aria-label="Filter by status"><option>All status</option>{columns.map((column) => <option key={column.name}>{column.name}</option>)}</select></label><label className="filter-control"><span>♧</span><select value={filterAssignee} onChange={(event) => setFilterAssignee(event.target.value)} aria-label="Filter by assignee"><option>All people</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label></div></div>

              <div className="board">
                {columns.map((column) => {
                  const columnTasks = filteredTasks.filter((task) => task.status === column.name)
                  return (
                    <section className={`board-column column-${column.tone}`} key={column.name}>
                      <div className="column-heading"><div className="column-title"><span className="status-dot" /> <h3>{column.name}</h3><span className="column-count">{columnTasks.length}</span></div><button className="small-icon-button" onClick={() => { setSelectedTask(null); setModal('task') }} aria-label={`Add task to ${column.name}`}>＋</button></div>
                      <p className="column-hint">{column.hint}</p>
                      <div className="task-list">
                        {columnTasks.map((task) => <article className="task-card" key={task._id} onClick={() => { setSelectedTask(task); setModal('task') }} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter') { setSelectedTask(task); setModal('task') } }}>
                          <div className="task-card-top"><span className={`priority priority-${task.priority.toLowerCase()}`}><i />{task.priority}</span><button className="task-menu" aria-label={`Edit ${task.title}`} onClick={(event) => { event.stopPropagation(); setSelectedTask(task); setModal('task') }}>···</button></div>
                          <h4>{task.title}</h4>
                          {task.description && <p className="task-description">{task.description}</p>}
                          <div className="task-card-footer">
                            {task.dueDate ? <span className={`due-date ${isOverdue(task.dueDate) && task.status !== 'Done' ? 'overdue' : ''}`}><span>◷</span>{formatDate(task.dueDate)}</span> : <span />}
                            <div className="task-assignee">{task.assignee ? <><span className="avatar avatar-assignee" title={task.assignee.name}>{initials(task.assignee.name)}</span><span>{task.assignee.name.split(' ')[0]}</span></> : <span className="unassigned">Unassigned</span>}</div>
                          </div>
                          <div className="task-quick-actions">
                            {columns.filter((next) => next.name !== task.status).map((next) => <button key={next.name} onClick={(event) => { event.stopPropagation(); changeStatus(task, next.name) }}>Move to {next.name}</button>)}
                          </div>
                        </article>)}
                        {columnTasks.length === 0 && <div className="column-empty">Nothing here yet <span>✦</span></div>}
                      </div>
                      <button className="add-task-link" onClick={() => { setSelectedTask(null); setModal('task') }}>＋ Add a task</button>
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {notice && <div className="toast"><span>✓</span>{notice}</div>}
      {busy && <div className="busy-indicator" aria-label="Saving" />}

      {modal === 'workspace' && <Dialog title="Create a workspace" onClose={() => setModal('')}><form className="form-stack modal-form" onSubmit={createWorkspace}><label>Workspace name<input name="name" required maxLength="80" placeholder="e.g. Studio North" autoFocus /></label><p className="form-help">You’ll be the owner and can invite teammates next.</p><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModal('')}>Cancel</button><button className="button button-primary" disabled={busy}>Create workspace <span>→</span></button></div></form></Dialog>}
      {modal === 'project' && <Dialog title="Create a project" onClose={() => setModal('')}><form className="form-stack modal-form" onSubmit={createProject}><label>Project name<input name="name" required maxLength="100" placeholder="e.g. Website refresh" autoFocus /></label><label>Description <span className="optional">(optional)</span><textarea name="description" rows="3" maxLength="1000" placeholder="What are you working toward?" /></label><div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setModal('')}>Cancel</button><button className="button button-primary" disabled={busy}>Create project <span>→</span></button></div></form></Dialog>}
      {modal === 'task' && <Dialog title={selectedTask ? 'Task details' : 'Create a task'} onClose={() => { setModal(''); setSelectedTask(null) }}><form className="form-stack modal-form" onSubmit={saveTask}>
        <label>Task title<input name="title" required maxLength="160" defaultValue={selectedTask?.title || ''} placeholder="What needs to get done?" autoFocus /></label>
        <label>Description <span className="optional">(optional)</span><textarea name="description" rows="3" maxLength="4000" defaultValue={selectedTask?.description || ''} placeholder="Add a few helpful details…" /></label>
        <div className="form-row"><label>Status<select name="status" defaultValue={selectedTask?.status || 'To Do'}>{columns.map((column) => <option key={column.name}>{column.name}</option>)}</select></label><label>Priority<select name="priority" defaultValue={selectedTask?.priority || 'Medium'}><option>Low</option><option>Medium</option><option>High</option></select></label></div>
        <div className="form-row"><label>Due date<input name="dueDate" type="date" defaultValue={dueDateOnly(selectedTask?.dueDate)} /></label><label>Assignee<select name="assignee" defaultValue={selectedTask?.assignee?._id || ''}><option value="">Unassigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label></div>
        <div className="modal-actions modal-actions-split">{selectedTask && <button type="button" className="button button-danger" onClick={deleteTask} disabled={busy}>Delete task</button>}<span /><button type="button" className="button button-quiet" onClick={() => { setModal(''); setSelectedTask(null) }}>Cancel</button><button className="button button-primary" disabled={busy}>{selectedTask ? 'Save changes' : 'Create task'} <span>→</span></button></div>
      </form></Dialog>}
      {modal === 'members' && <Dialog title="Your team" onClose={() => setModal('')}>
        <p className="member-permissions">{canManageMembers ? 'You’re the owner. Owners can add or remove members; members can work on projects and tasks.' : 'Workspace members can work on projects and tasks. Only the owner can add or remove members.'}</p>
        <div className="members-list">{members.map((member) => {
          const isOwner = String(member._id) === String(activeWorkspace?.owner)
          return <div className="member-row" key={member._id}><span className="avatar avatar-assignee">{initials(member.name)}</span><span className="member-info"><strong>{member.name}</strong><small>{member.email}</small></span><span className="member-role">{isOwner ? 'Owner' : 'Member'}</span>{canManageMembers && !isOwner && <button className="member-remove" onClick={() => removeMember(member)} disabled={busy}>Remove</button>}</div>
        })}</div>
        {canManageMembers ? <form className="invite-form" onSubmit={addMember}><label>Add an existing TeamFlow account<input name="email" type="email" required placeholder="teammate@company.com" /></label><button className="button button-primary" disabled={busy}>Add member <span>＋</span></button><p className="form-help">They’ll need to have a TeamFlow account first.</p></form> : <p className="form-help member-readonly-note">Contact the workspace owner to add or remove members.</p>}
      </Dialog>}
      {modal === 'settings' && <Dialog title="Settings" onClose={() => setModal('')}>
        <section className="settings-section account-section">
          <div className="settings-section-heading"><span className="settings-icon">◎</span><div><h3>Signed-in account</h3><p>This is the account you’re currently using.</p></div></div>
          <div className="settings-account" aria-label="Signed-in account details">
            <span className="avatar avatar-dark settings-account-avatar" aria-hidden="true">{initials(user.name)}</span>
            <span className="settings-account-copy"><strong>{user.name}</strong><span>{user.email}</span></span>
          </div>
        </section>
        <section className="settings-section">
          <div className="settings-section-heading"><span className="settings-icon">◐</span><div><h3>Appearance</h3><p>Choose how TeamFlow looks on this device.</p></div></div>
          <div className="theme-options" role="group" aria-label="Color theme">
            <button type="button" className={`theme-option ${theme === 'light' ? 'selected' : ''}`} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}><span className="theme-preview theme-preview-light">☼</span><span>Light</span>{theme === 'light' && <span className="theme-check">✓</span>}</button>
            <button type="button" className={`theme-option ${theme === 'dark' ? 'selected' : ''}`} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}><span className="theme-preview theme-preview-dark">☾</span><span>Dark</span>{theme === 'dark' && <span className="theme-check">✓</span>}</button>
          </div>
          <p className="settings-note">Your choice is saved in this browser.</p>
        </section>
        <section className="settings-section about-section">
          <div className="settings-section-heading"><span className="settings-icon">i</span><div><h3>About TeamFlow</h3><p>A calmer way for small teams to move work forward.</p></div></div>
          <div className="about-details">
            <div><span>Version</span><strong>TeamFlow MVP</strong></div>
            <div><span>Workspace</span><strong>{activeWorkspace?.name || 'No workspace selected'}</strong></div>
            <div><span>Your role</span><strong>{activeWorkspace ? canManageMembers ? 'Owner' : 'Member' : 'Not in a workspace'}</strong></div>
          </div>
          <p className="about-summary">Create projects, organize tasks, set priorities and due dates, and collaborate with workspace members. Workspace owners manage membership; members can work on projects and tasks.</p>
        </section>
      </Dialog>}
    </div>
  )
}

export default App

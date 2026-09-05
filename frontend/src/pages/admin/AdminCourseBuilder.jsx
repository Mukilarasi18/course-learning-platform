import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminCourseBuilder() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('content');

  function load() {
    api.get(`/courses/${id}`).then(setData);
  }
  useEffect(load, [id]);

  if (!data) return <div className="container page">Loading…</div>;
  const { course, modules, tasks, quizzes, projects } = data;

  return (
    <div className="container page">
      <Link to="/admin/courses" className="muted">← All Courses</Link>
      <h2 className="mt-16 mb-24">{course.title}</h2>

      <div className="tabs">
        <div className={`tab ${tab === 'content' ? 'active' : ''}`} onClick={() => setTab('content')}>Lessons</div>
        <div className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>Tasks</div>
        <div className={`tab ${tab === 'quizzes' ? 'active' : ''}`} onClick={() => setTab('quizzes')}>Quizzes</div>
        <div className={`tab ${tab === 'projects' ? 'active' : ''}`} onClick={() => setTab('projects')}>Projects</div>
      </div>

      {tab === 'content' && <ContentTab courseId={id} modules={modules} reload={load} />}
      {tab === 'tasks' && <TasksTab courseId={id} tasks={tasks} reload={load} />}
      {tab === 'quizzes' && <QuizzesTab courseId={id} quizzes={quizzes} reload={load} />}
      {tab === 'projects' && <ProjectsTab courseId={id} projects={projects} reload={load} />}
    </div>
  );
}

// ---------------- LESSONS / MODULES ----------------
function ContentTab({ courseId, modules, reload }) {
  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonForms, setLessonForms] = useState({});

  async function addModule(e) {
    e.preventDefault();
    if (!moduleTitle.trim()) return;
    await api.post(`/courses/${courseId}/modules`, { title: moduleTitle, order_index: modules.length });
    setModuleTitle('');
    reload();
  }

  async function deleteModule(moduleId) {
    if (!confirm('Delete this module and its lessons?')) return;
    await api.del(`/courses/modules/${moduleId}`);
    reload();
  }

  async function addLesson(moduleId) {
    const form = lessonForms[moduleId] || {};
    if (!form.title) return;
    await api.post(`/courses/modules/${moduleId}/lessons`, form);
    setLessonForms({ ...lessonForms, [moduleId]: {} });
    reload();
  }

  async function uploadVideo(moduleId, file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.postForm('/courses/upload', formData);
    setLessonForms({ ...lessonForms, [moduleId]: { ...(lessonForms[moduleId] || {}), video_url: res.url } });
  }

  async function deleteLesson(lessonId) {
    if (!confirm('Delete this lesson?')) return;
    await api.del(`/courses/lessons/${lessonId}`);
    reload();
  }

  return (
    <div>
      <div className="card mb-24">
        <h4 className="mb-8">Add Module</h4>
        <form onSubmit={addModule} className="flex gap-8">
          <input placeholder="Module title (e.g. Getting Started)" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} />
          <button className="btn">Add</button>
        </form>
      </div>

      {modules.map(mod => {
        const form = lessonForms[mod.id] || {};
        return (
          <div key={mod.id} className="card mb-16">
            <div className="flex-between mb-16">
              <h4>{mod.title}</h4>
              <button className="btn small danger" onClick={() => deleteModule(mod.id)}>Delete Module</button>
            </div>
            {mod.lessons.map(l => (
              <div key={l.id} className="lesson-item">
                <span>▶ {l.title}</span>
                <button className="btn small danger" onClick={() => deleteLesson(l.id)}>Remove</button>
              </div>
            ))}
            <div className="card mt-16" style={{ background: '#fafafa' }}>
              <h5 className="mb-8">Add Lesson</h5>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title || ''} onChange={e => setLessonForms({ ...lessonForms, [mod.id]: { ...form, title: e.target.value } })} />
              </div>
              <div className="form-group">
                <label>Video URL (YouTube link, or upload a file below)</label>
                <input value={form.video_url || ''} onChange={e => setLessonForms({ ...lessonForms, [mod.id]: { ...form, video_url: e.target.value } })} placeholder="https://youtube.com/watch?v=…" />
              </div>
              <div className="form-group">
                <label>Or Upload Video File</label>
                <input type="file" accept="video/*" onChange={e => e.target.files[0] && uploadVideo(mod.id, e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Study Notes / Content</label>
                <textarea rows={3} value={form.content || ''} onChange={e => setLessonForms({ ...lessonForms, [mod.id]: { ...form, content: e.target.value } })} />
              </div>
              <button className="btn small" onClick={() => addLesson(mod.id)}>Add Lesson</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- TASKS ----------------
function TasksTab({ courseId, tasks, reload }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100 });

  async function addTask(e) {
    e.preventDefault();
    if (!form.title) return;
    await api.post('/assignments/tasks', { ...form, course_id: Number(courseId) });
    setForm({ title: '', description: '', due_date: '', max_marks: 100 });
    reload();
  }

  async function deleteTask(taskId) {
    if (!confirm('Delete this task?')) return;
    await api.del(`/assignments/tasks/${taskId}`);
    reload();
  }

  return (
    <div>
      <div className="card mb-24">
        <h4 className="mb-16">Create Task</h4>
        <form onSubmit={addTask}>
          <div className="form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            <div className="form-group"><label>Max Marks</label><input type="number" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: Number(e.target.value) })} /></div>
          </div>
          <button className="btn">Create Task</button>
        </form>
      </div>

      <div className="grid">
        {tasks.map(t => (
          <div key={t.id} className="card">
            <h4>{t.title}</h4>
            <p className="muted">{t.description}</p>
            <div className="flex gap-8 mt-8 flex-wrap">
              <Link to={`/admin/submissions/task/${t.id}`}><button className="btn small">Review Submissions</button></Link>
              <button className="btn small danger" onClick={() => deleteTask(t.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- PROJECTS ----------------
function ProjectsTab({ courseId, projects, reload }) {
  const [form, setForm] = useState({ title: '', description: '', max_marks: 100 });

  async function addProject(e) {
    e.preventDefault();
    if (!form.title) return;
    await api.post('/assignments/projects', { ...form, course_id: Number(courseId) });
    setForm({ title: '', description: '', max_marks: 100 });
    reload();
  }

  async function deleteProject(projectId) {
    if (!confirm('Delete this project?')) return;
    await api.del(`/assignments/projects/${projectId}`);
    reload();
  }

  return (
    <div>
      <div className="card mb-24">
        <h4 className="mb-16">Create Project</h4>
        <form onSubmit={addProject}>
          <div className="form-group"><label>Title</label><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="form-group"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="form-group"><label>Max Marks</label><input type="number" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: Number(e.target.value) })} /></div>
          <button className="btn">Create Project</button>
        </form>
      </div>

      <div className="grid">
        {projects.map(p => (
          <div key={p.id} className="card">
            <h4>{p.title}</h4>
            <p className="muted">{p.description}</p>
            <div className="flex gap-8 mt-8 flex-wrap">
              <Link to={`/admin/submissions/project/${p.id}`}><button className="btn small">Review Submissions</button></Link>
              <button className="btn small danger" onClick={() => deleteProject(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- QUIZZES ----------------
function QuizzesTab({ courseId, quizzes, reload }) {
  const [title, setTitle] = useState('');
  const [passPct, setPassPct] = useState(60);
  const [feedbackMode, setFeedbackMode] = useState('immediate');
  const [questions, setQuestions] = useState([{ question_text: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);

  function updateQuestion(qi, text) {
    const copy = [...questions];
    copy[qi].question_text = text;
    setQuestions(copy);
  }
  function updateOption(qi, oi, text) {
    const copy = [...questions];
    copy[qi].options[oi].option_text = text;
    setQuestions(copy);
  }
  function setCorrect(qi, oi) {
    const copy = [...questions];
    copy[qi].options.forEach((o, idx) => o.is_correct = idx === oi);
    setQuestions(copy);
  }
  function addQuestion() {
    setQuestions([...questions, { question_text: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
  }
  function addOption(qi) {
    const copy = [...questions];
    copy[qi].options.push({ option_text: '', is_correct: false });
    setQuestions(copy);
  }
  function removeQuestion(qi) {
    setQuestions(questions.filter((_, idx) => idx !== qi));
  }

  async function createQuiz(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.post('/quizzes', {
      course_id: Number(courseId), title, pass_percentage: Number(passPct), feedback_mode: feedbackMode, questions
    });
    setTitle(''); setQuestions([{ question_text: '', options: [{ option_text: '', is_correct: true }, { option_text: '', is_correct: false }] }]);
    reload();
  }

  async function deleteQuiz(quizId) {
    if (!confirm('Delete this quiz?')) return;
    await api.del(`/quizzes/${quizId}`);
    reload();
  }

  return (
    <div>
      <div className="card mb-24">
        <h4 className="mb-16">Create Quiz</h4>
        <form onSubmit={createQuiz}>
          <div className="form-group"><label>Quiz Title</label><input required value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group"><label>Pass Percentage</label><input type="number" value={passPct} onChange={e => setPassPct(e.target.value)} /></div>
            <div className="form-group">
              <label>Feedback Mode</label>
              <select value={feedbackMode} onChange={e => setFeedbackMode(e.target.value)}>
                <option value="immediate">Immediate</option>
                <option value="delayed">Delayed (instructor reviews first)</option>
              </select>
            </div>
          </div>

          {questions.map((q, qi) => (
            <div key={qi} className="card mb-16" style={{ background: '#fafafa' }}>
              <div className="flex-between mb-8">
                <label>Question {qi + 1}</label>
                {questions.length > 1 && <button type="button" className="btn small danger" onClick={() => removeQuestion(qi)}>Remove</button>}
              </div>
              <input className="mb-8" value={q.question_text} onChange={e => updateQuestion(qi, e.target.value)} placeholder="Question text" />
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex gap-8 mb-8" style={{ alignItems: 'center' }}>
                  <input type="radio" name={`correct-${qi}`} checked={opt.is_correct} onChange={() => setCorrect(qi, oi)} style={{ width: 'auto' }} />
                  <input value={opt.option_text} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`Option ${oi + 1}`} />
                </div>
              ))}
              <button type="button" className="btn small secondary" onClick={() => addOption(qi)}>+ Add Option</button>
            </div>
          ))}
          <button type="button" className="btn secondary mb-16" onClick={addQuestion}>+ Add Question</button>
          <br />
          <button className="btn">Create Quiz</button>
        </form>
      </div>

      <div className="grid">
        {quizzes.map(q => (
          <div key={q.id} className="card">
            <h4>{q.title}</h4>
            <p className="muted" style={{ fontSize: '0.85rem' }}>Pass: {q.pass_percentage}% · {q.feedback_mode}</p>
            <button className="btn small danger mt-8" onClick={() => deleteQuiz(q.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

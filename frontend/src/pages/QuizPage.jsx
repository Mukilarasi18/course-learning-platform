import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function QuizPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/quizzes/${id}/take`).then(setData);
  }, [id]);

  function selectOption(questionId, optionId) {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([question_id, selected_option_id]) => ({
          question_id: Number(question_id), selected_option_id
        }))
      };
      const res = await api.post(`/quizzes/${id}/submit`, payload);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) return <div className="container page">Loading…</div>;
  const { quiz, questions } = data;

  return (
    <div className="container page">
      <Link to={`/courses/${quiz.course_id}`} className="muted">← Back to course</Link>
      <h2 className="mt-16 mb-8">{quiz.title}</h2>
      <p className="muted mb-24">Pass mark: {quiz.pass_percentage}% · Feedback: {quiz.feedback_mode}</p>

      {error && <div className="alert error">{error}</div>}

      {result ? (
        <div className="card">
          <h3>Result</h3>
          <p className={`badge ${result.passed ? 'success' : 'danger'}`}>
            {result.passed ? 'Passed' : 'Not Passed'} — {result.score}/{result.total} ({result.percent}%)
          </p>
          {result.feedback_mode === 'immediate' && result.answers && (
            <div className="mt-16">
              {questions.map(q => {
                const a = result.answers.find(ans => ans.question_id === q.id);
                return (
                  <div key={q.id} className="mb-16">
                    <strong>{q.question_text}</strong>
                    <ul>
                      {q.options.map(opt => {
                        let style = {};
                        if (a && opt.id === a.correct_option_id) style = { color: 'var(--success)', fontWeight: 700 };
                        else if (a && opt.id === a.selected_option_id && !a.is_correct) style = { color: 'var(--danger)', textDecoration: 'line-through' };
                        return <li key={opt.id} style={style}>{opt.option_text}</li>;
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
          {result.feedback_mode === 'delayed' && (
            <p className="muted mt-16">Detailed feedback will be released by your instructor after review.</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {questions.map((q, i) => (
            <div key={q.id} className="card mb-16">
              <strong>{i + 1}. {q.question_text}</strong>
              <div className="mt-8">
                {q.options.map(opt => (
                  <label key={opt.id} style={{ display: 'block', padding: '8px 0', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt.id}
                      onChange={() => selectOption(q.id, opt.id)}
                      style={{ width: 'auto', marginRight: 8 }}
                    />
                    {opt.option_text}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button className="btn" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Quiz'}</button>
        </form>
      )}
    </div>
  );
}

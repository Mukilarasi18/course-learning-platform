import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="container page">
      <div className="card text-center" style={{ padding: '60px 30px' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 10 }}>Learn. Build. Get Certified.</h1>
        <p className="muted" style={{ maxWidth: 500, margin: '0 auto 24px' }}>
          Browse courses, watch video lessons, complete tasks and quizzes, submit projects,
          and earn a verifiable certificate — all in one place.
        </p>
        <div className="flex gap-12" style={{ justifyContent: 'center' }}>
          <Link to="/courses"><button className="btn">Browse Courses</button></Link>
          <Link to="/register"><button className="btn secondary">Get Started</button></Link>
        </div>
      </div>

      <div className="grid mt-32">
        <div className="card">
          <h3>🎥 Video Lessons</h3>
          <p className="muted">Watch structured video content with supporting study materials.</p>
        </div>
        <div className="card">
          <h3>📝 Tasks & Quizzes</h3>
          <p className="muted">Practice with assignments and quizzes with instant or delayed feedback.</p>
        </div>
        <div className="card">
          <h3>🏆 Certificates</h3>
          <p className="muted">Earn a unique, verifiable certificate once you finish a course.</p>
        </div>
      </div>
    </div>
  );
}

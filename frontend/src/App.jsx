import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/Common';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Catalog from './pages/Catalog';
import CourseDetail from './pages/CourseDetail';
import Lesson from './pages/Lesson';
import TaskPage from './pages/TaskPage';
import ProjectPage from './pages/ProjectPage';
import QuizPage from './pages/QuizPage';
import Dashboard from './pages/Dashboard';
import CertificatePage from './pages/CertificatePage';
import VerifyCertificate from './pages/VerifyCertificate';

import AdminHome from './pages/admin/AdminHome';
import AdminCourses from './pages/admin/AdminCourses';
import AdminCourseBuilder from './pages/admin/AdminCourseBuilder';
import AdminRoster from './pages/admin/AdminRoster';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminCertificates from './pages/admin/AdminCertificates';

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/courses" element={<Catalog />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/verify" element={<VerifyCertificate />} />

        <Route path="/lessons/:id" element={<ProtectedRoute role="student"><Lesson /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute role="student"><TaskPage /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute role="student"><ProjectPage /></ProtectedRoute>} />
        <Route path="/quizzes/:id" element={<ProtectedRoute role="student"><QuizPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute role="student"><Dashboard /></ProtectedRoute>} />
        <Route path="/certificates/:courseId" element={<ProtectedRoute role="student"><CertificatePage /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminHome /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute role="admin"><AdminCourses /></ProtectedRoute>} />
        <Route path="/admin/courses/:id" element={<ProtectedRoute role="admin"><AdminCourseBuilder /></ProtectedRoute>} />
        <Route path="/admin/roster/:courseId" element={<ProtectedRoute role="admin"><AdminRoster /></ProtectedRoute>} />
        <Route path="/admin/submissions/:type/:id" element={<ProtectedRoute role="admin"><AdminSubmissions /></ProtectedRoute>} />
        <Route path="/admin/certificates" element={<ProtectedRoute role="admin"><AdminCertificates /></ProtectedRoute>} />

        <Route path="*" element={<div className="container page">Page not found.</div>} />
      </Routes>
    </>
  );
}

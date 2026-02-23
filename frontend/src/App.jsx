import React, { useEffect, useState } from 'react';
import './App.css'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { Spinner } from 'react-bootstrap';
import Home from './pages/home';
import Previous from './pages/previous';
import Upload from './pages/upload';
import AdminLogin from './pages/adminLogin';
import AdminRegister from './pages/adminRegister';
import SuperAdminContent from './components/superAdminContent';
import EvaluateSolution from './pages/evaluateSolution';
import Meet from './pages/meet';
import ClassroomDetail from './pages/ClassroomDetail';
import ReviewSubmissions from './pages/ReviewSubmissions';
import OnboardingGate from './components/OnboardingGate';

const BackendGate = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [dots, setDots] = useState("");
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${BACKEND_URL}/health`);
        setIsReady(true);
      } catch (err) {
        console.log("Waiting for backend...");
        setTimeout(checkHealth, 3000);
      }
    };
    checkHealth();
  }, [BACKEND_URL]);

  useEffect(() => {
    if (!isReady) {
      const interval = setInterval(() => {
        setDots(prev => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--gc-bg)',
        color: 'var(--gc-text-primary)'
      }}>
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Waking up the classroom server{dots}</h2>
        <p style={{ color: 'var(--gc-text-secondary)', fontSize: '14px' }}>This might take a moment if the server was sleeping.</p>
      </div>
    );
  }

  return children;
};

function App() {

  return (
    <div id='App'>
      <BackendGate>
        <BrowserRouter>
          <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
          <OnboardingGate>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/previous" element={<Previous />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/register" element={<AdminRegister />} />
              <Route path="/superadmin" element={<SuperAdminContent />} />
              <Route path="/evaluate" element={<EvaluateSolution />} />
              <Route path="/review-submissions" element={<ReviewSubmissions />} />
              <Route path="/meet" element={<Meet />} />
              <Route path="/meet/:meetingId" element={<Meet />} />
              <Route path="/classroom/:classroomCode" element={<ClassroomDetail />} />
            </Routes>
          </OnboardingGate>
        </BrowserRouter>
      </BackendGate>
    </div>
  )
}

export default App

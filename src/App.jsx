import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireNewProfile, RequireRole } from './components/Guards.jsx';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { AuthProvider } from './lib/auth.jsx';
import BookScribe from './pages/BookScribe.jsx';
import Login from './pages/Login.jsx';
import ScribeDashboard from './pages/ScribeDashboard.jsx';
import ScribeRegister from './pages/ScribeRegister.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentRegister from './pages/StudentRegister.jsx';
import { NotFound, RequestSent, ScribeRegistered, StudentRegistered } from './pages/SuccessScreens.jsx';
import Welcome from './pages/Welcome.jsx';

const student = page => <RequireRole role="student">{page}</RequireRole>;
const scribe = page => <RequireRole role="scribe">{page}</RequireRole>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Welcome />} />
              <Route path="login" element={<Login />} />
              <Route path="register/student" element={<RequireNewProfile role="student"><StudentRegister /></RequireNewProfile>} />
              <Route path="register/scribe" element={<RequireNewProfile role="scribe"><ScribeRegister /></RequireNewProfile>} />
              <Route path="student" element={student(<StudentDashboard />)} />
              <Route path="student/registered" element={student(<StudentRegistered />)} />
              <Route path="student/book" element={student(<BookScribe />)} />
              <Route path="student/requested" element={student(<RequestSent />)} />
              <Route path="scribe" element={scribe(<ScribeDashboard />)} />
              <Route path="scribe/registered" element={scribe(<ScribeRegistered />)} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

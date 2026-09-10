import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TenderList from './pages/TenderList'
import TenderCreate from './pages/TenderCreate'
import TenderDetail from './pages/TenderDetail'
import BidderList from './pages/BidderList'
import BidderCreate from './pages/BidderCreate'
import BidderDetail from './pages/BidderDetail'
import TenderComparison from './pages/TenderComparison'
import Compliance from './pages/Compliance'
import GovernmentSources from './pages/GovernmentSources'
import Reports from './pages/Reports'
import AuditLogs from './pages/AuditLogs'
import BlockchainLedger from './pages/BlockchainLedger'
import PublicVerify from './pages/PublicVerify'
import Profile from './pages/Profile'
import Unauthorized from './pages/Unauthorized'
import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminRoles from './pages/admin/AdminRoles'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Authenticated routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenders"
            element={
              <ProtectedRoute>
                <TenderList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenders/new"
            element={
              <ProtectedRoute>
                <TenderCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenders/:id"
            element={
              <ProtectedRoute>
                <TenderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenders/:id/comparison"
            element={
              <ProtectedRoute>
                <TenderComparison />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidders"
            element={
              <ProtectedRoute>
                <BidderList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidders/new"
            element={
              <ProtectedRoute>
                <BidderCreate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bidders/:id"
            element={
              <ProtectedRoute>
                <BidderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedRoute>
                <Compliance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/government-sources"
            element={
              <ProtectedRoute>
                <GovernmentSources />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Audit trail & Blockchain ledger — evaluators and admins only */}
          <Route
            path="/audit-logs"
            element={
              <RoleRoute roles={['admin', 'evaluator']}>
                <AuditLogs />
              </RoleRoute>
            }
          />
          <Route
            path="/blockchain"
            element={
              <RoleRoute roles={['admin', 'evaluator']}>
                <BlockchainLedger />
              </RoleRoute>
            }
          />

          {/* Publicly verifiable zero-trust portal (No login required) */}
          <Route path="/verify" element={<PublicVerify />} />

          {/* Administration — admins only (mirrors backend require_roles(ADMIN)) */}
          <Route
            path="/admin"
            element={
              <RoleRoute roles={['admin']}>
                <AdminOverview />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleRoute roles={['admin']}>
                <AdminUsers />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <RoleRoute roles={['admin']}>
                <AdminRoles />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RoleRoute roles={['admin']}>
                <AdminSettings />
              </RoleRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

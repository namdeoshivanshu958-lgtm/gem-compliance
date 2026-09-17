import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { AccessibilityProvider } from './context/AccessibilityContext'

import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

import TenderList from './pages/TenderList'
import TenderCreate from './pages/TenderCreate'
import TenderDetail from './pages/TenderDetail'
import TenderComparison from './pages/TenderComparison'

import BidderList from './pages/BidderList'
import BidderCreate from './pages/BidderCreate'
import BidderDetail from './pages/BidderDetail'

import Compliance from './pages/Compliance'
import GovernmentSources from './pages/GovernmentSources'
import Reports from './pages/Reports'
import AuditLogs from './pages/AuditLogs'
import Profile from './pages/Profile'
import Unauthorized from './pages/Unauthorized'

import BlockchainLedger from './pages/BlockchainLedger'
import PublicVerify from './pages/PublicVerify'

// Vendor Portal Pages
import VendorDashboard from './pages/vendor/VendorDashboard'
import VendorTenders from './pages/vendor/VendorTenders'
import VendorApplications from './pages/vendor/VendorApplications'
import VendorDocuments from './pages/vendor/VendorDocuments'
import VendorCompliance from './pages/vendor/VendorCompliance'
import VendorClarifications from './pages/vendor/VendorClarifications'
import VendorNotifications from './pages/vendor/VendorNotifications'
import VendorProfile from './pages/vendor/VendorProfile'

// Officer Console Pages
import OfficerDashboard from './pages/officer/OfficerDashboard'
import OfficerCompare from './pages/officer/OfficerCompare'
import OfficerDecisions from './pages/officer/OfficerDecisions'
import OfficerRiskDashboard from './pages/officer/OfficerRiskDashboard'
import OfficerClarifications from './pages/officer/OfficerClarifications'

import AdminOverview from './pages/admin/AdminOverview'
import AdminUsers from './pages/admin/AdminUsers'
import AdminRoles from './pages/admin/AdminRoles'
import AdminSettings from './pages/admin/AdminSettings'

import ProcurementAssistantModal from './components/assistant/ProcurementAssistantModal'

export default function App() {
  return (
    <BrowserRouter>
      <AccessibilityProvider>
        <AuthProvider>
          <Routes>

            {/* Public Institutional Pages */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<PublicVerify />} />

            {/* Vendor Portal */}
            <Route
              path="/vendor/dashboard"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/tenders"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorTenders />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/applications"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorApplications />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/documents"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorDocuments />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/compliance"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorCompliance />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/clarifications"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorClarifications />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/notifications"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorNotifications />
                </RoleRoute>
              }
            />
            <Route
              path="/vendor/profile"
              element={
                <RoleRoute roles={['bidder', 'admin']}>
                  <VendorProfile />
                </RoleRoute>
              }
            />

            {/* Officer Operations */}
            <Route
              path="/officer/dashboard"
              element={
                <RoleRoute roles={['evaluator', 'admin']}>
                  <OfficerDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/officer/compare"
              element={
                <RoleRoute roles={['evaluator', 'admin']}>
                  <OfficerCompare />
                </RoleRoute>
              }
            />
            <Route
              path="/officer/decisions"
              element={
                <RoleRoute roles={['evaluator', 'admin']}>
                  <OfficerDecisions />
                </RoleRoute>
              }
            />
            <Route
              path="/officer/risk"
              element={
                <RoleRoute roles={['evaluator', 'admin']}>
                  <OfficerRiskDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/officer/clarifications"
              element={
                <RoleRoute roles={['evaluator', 'admin']}>
                  <OfficerClarifications />
                </RoleRoute>
              }
            />

          {/* =========================
              AUTHENTICATED ROUTES
             ========================= */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Tenders */}
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

          {/* Bidders */}
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

          {/* Compliance */}
          <Route
            path="/compliance"
            element={
              <ProtectedRoute>
                <Compliance />
              </ProtectedRoute>
            }
          />

          {/* Government Sources */}
          <Route
            path="/government-sources"
            element={
              <ProtectedRoute>
                <GovernmentSources />
              </ProtectedRoute>
            }
          />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* =========================
              BLOCKCHAIN
             ========================= */}

          <Route
            path="/blockchain"
            element={
              <ProtectedRoute>
                <BlockchainLedger />
              </ProtectedRoute>
            }
          />

          {/* =========================
              AUDIT TRAIL
             ========================= */}

          <Route
            path="/audit-logs"
            element={
              <RoleRoute roles={['admin', 'evaluator']}>
                <AuditLogs />
              </RoleRoute>
            }
          />

          {/* =========================
              ADMINISTRATION
             ========================= */}

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

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <ProtectedRoute>
                <Unauthorized />
              </ProtectedRoute>
            }
          />

          {/* Unknown routes fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
        {/* Persistent Floating AI Procurement Assistant */}
        <ProcurementAssistantModal />
      </AuthProvider>
    </AccessibilityProvider>
  </BrowserRouter>
)
}
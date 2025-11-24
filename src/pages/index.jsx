import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import NewVisit from "./NewVisit";

import Reports from "./Reports";

import Settings from "./Settings";

import Admin from "./Admin";

import Customers from "./Customers";

import Configuration from "./Configuration";

import Analytics from "./Analytics";

import FollowUps from "./FollowUps";

import PlannedVisits from "./PlannedVisits";

import VisitSelector from "./VisitSelector";

import Login from "./Login";

import ProtectedRoute from "@/components/ProtectedRoute";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    NewVisit: NewVisit,
    
    Reports: Reports,
    
    Settings: Settings,
    
    Admin: Admin,
    
    Customers: Customers,
    
    Configuration: Configuration,
    
    Analytics: Analytics,
    
    FollowUps: FollowUps,
    
    PlannedVisits: PlannedVisits,
    
    VisitSelector: VisitSelector,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Component to redirect authenticated users away from login page
function PublicRoute({ children }) {
    const token = localStorage.getItem('access_token');
    if (token) {
        return <Navigate to="/Dashboard" replace />;
    }
    return children;
}

// Protected Layout Wrapper
function ProtectedLayoutWrapper() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/" element={<Navigate to="/Dashboard" replace />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/NewVisit" element={<NewVisit />} />
                <Route path="/Reports" element={<Reports />} />
                <Route path="/Settings" element={<Settings />} />
                <Route path="/Admin" element={<Admin />} />
                <Route path="/Customers" element={<Customers />} />
                <Route path="/Configuration" element={<Configuration />} />
                <Route path="/Analytics" element={<Analytics />} />
                <Route path="/FollowUps" element={<FollowUps />} />
                <Route path="/PlannedVisits" element={<PlannedVisits />} />
                <Route path="/VisitSelector" element={<VisitSelector />} />
            </Routes>
        </Layout>
    );
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    return (
        <Routes>
            {/* Public route - Login page */}
            <Route 
                path="/Login" 
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                } 
            />
            
            {/* Protected routes - require authentication */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <ProtectedLayoutWrapper />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
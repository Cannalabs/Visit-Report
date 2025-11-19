# CANNA Visit Report App

A comprehensive web application for managing shop visit reports, built with React (Vite) frontend and FastAPI backend.

## Features

### Visit Management
- **Multi-step Visit Form**: Structured form with 6 sections (Shop Information, Product Visibility, Training & Support, Commercial Outcomes, Photos & Notes, Signature)
- **Visit Status Workflow**: 
  - **Appointment**: Plan future visits with assigned users, planned dates, and descriptions
  - **Draft**: Work-in-progress visits with auto-save every 5 seconds
  - **Done**: Completed visit reports
- **Auto-save**: Automatic draft saving every 5 seconds with countdown indicator
- **Form Validation**: Required field validation prevents navigation until all mandatory fields are completed
- **PDF Generation**: Generate comprehensive visit report PDFs

### Customer Management
- **Customer Database**: Manage shop/customer information with full CRUD operations
- **Visit Notes**: Store notes for each shop that appear on the first page of new visit reports
- **CSV Import/Export**: Bulk import and export customer data

### Dashboard
- **Statistics Overview**: Key metrics and KPIs with glassmorphism UI design
- **Planned Visits**: View all scheduled appointments with assigned users and visit purposes
- **Recent Visits**: Track recently completed visits
- **Top Performing Shops**: Performance analytics
- **Quick Actions**: Fast access to common tasks

### Reports & Analytics
- **Advanced Filtering**: Filter visits by date range, shop type, priority, and follow-up status
- **Export Options**: Export filtered reports to CSV
- **Visit Table**: Detailed view of all visits with sorting and selection

### User Management
- **Role-based Access**: Admin, Manager, and Sales Rep roles
- **User Profiles**: Customizable user profiles with avatars
- **Audit Logging**: Track all user actions and changes

### Additional Features
- **Product Visibility Scoring**: 0-100 scale for product visibility assessment
- **Sales/Purchase Breakdown**: Detailed sales data with bento box layout
- **Training Tracking**: Record training topics and support materials provided
- **Photo Management**: Upload and manage visit photos
- **E-Signature**: Digital signature capture for visit reports
- **GPS Coordinates**: Optional location tracking
- **Follow-up Management**: Track follow-up requirements and notes

## Tech Stack

### Frontend
- **React 18** with Vite
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **shadcn/ui** component library
- **date-fns** for date formatting
- **jsPDF** for PDF generation

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** ORM
- **PostgreSQL** database
- **Pydantic** for data validation
- **JWT** authentication
- **Automatic database migrations**

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.12+
- PostgreSQL database

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd canna-visit-report-app-b84a0be0
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Frontend Setup**
```bash
npm install
```

4. **Environment Configuration**
- Create `.env` file in backend directory with database connection details
- Configure frontend API endpoints in `src/api/config.js`

5. **Database Setup**
- The app includes automatic database migrations that run on startup
- Tables and columns are created/updated automatically

### Running the Application

**Development Mode:**

Backend:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

Frontend:
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
```

## Project Structure

```
├── backend/
│   ├── routers/          # API route handlers
│   ├── models.py        # Database models
│   ├── schemas.py       # Pydantic schemas
│   ├── migration.py     # Automatic database migrations
│   └── main.py          # FastAPI application
├── src/
│   ├── components/      # React components
│   │   ├── dashboard/   # Dashboard components
│   │   ├── visit-form/  # Visit form sections
│   │   ├── reports/     # Report components
│   │   └── ui/          # Reusable UI components
│   ├── pages/           # Page components
│   ├── api/             # API client code
│   └── utils/           # Utility functions
└── README.md
```

## Key Components

- **NewVisit.jsx**: Main visit form with multi-step navigation and auto-save
- **Dashboard.jsx**: Dashboard with statistics and quick actions
- **Customers.jsx**: Customer management interface
- **Reports.jsx**: Visit reports with filtering and export
- **FormProgress.jsx**: Progress indicator with validation
- **PlannedVisits.jsx**: Display scheduled appointments
- **ShopInfoSection.jsx**: Shop information and visit notes

## Database Schema

### Customers
- Shop information (name, type, address, contact details)
- Visit notes for future reference

### Shop Visits
- Visit details (date, duration, purpose, status)
- Product visibility scores
- Training and support information
- Commercial outcomes and sales data
- Photos and signatures
- Appointment scheduling fields

## API Endpoints

- `POST /api/customers` - Create customer
- `GET /api/customers` - List customers
- `PUT /api/customers/{id}` - Update customer
- `POST /api/shop-visits` - Create visit
- `GET /api/shop-visits` - List visits (with filters)
- `PUT /api/shop-visits/{id}` - Update visit
- `GET /api/users` - List users
- `GET /api/configurations` - Get configurations

## Development Notes

- Auto-save triggers every 5 seconds for draft visits
- Visit status automatically changes from "appointment" to "draft" when user navigates to second page
- First-page fields (shop info, contact info, visit purpose) don't trigger status change from "appointment"
- Form validation prevents navigation until required fields are completed
- Database migrations run automatically on backend startup

## License

[Your License Here]

## Contributing

[Contributing Guidelines Here]

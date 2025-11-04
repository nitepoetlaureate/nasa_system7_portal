# NASA System 7 Portal

A nostalgic web application that brings NASA's vast collection of space data to life through an authentic Apple System 7 interface. This full-stack application seamlessly integrates modern web technologies with retro computing aesthetics to create an engaging educational platform for space enthusiasts.

![NASA System 7 Portal](https://img.shields.io/badge/NASA-System_7_Portal-blue?style=for-the-badge&logo=nasa)
![React](https://img.shields.io/badge/React-18.2+-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933?style=for-the-badge&logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-336791?style=for-the-badge&logo=postgresql)

## 🚀 Features

### Core NASA Integrations
- **🖼️ Astronomy Picture of the Day (APOD)**: Daily stunning space imagery with detailed explanations
- **☄️ Near Earth Object Tracking**: Real-time monitoring of asteroids and comets approaching Earth
- **📊 Resource Navigator**: Comprehensive catalog of NASA software, datasets, and research tools
- **🔍 Advanced Search**: Intelligent search across all NASA resources with filters and sorting

### Authentic System 7 Experience
- **🪟 Classic Window Management**: Draggable, resizable windows with proper z-index handling
- **🎨 Retro Design System**: Faithful recreation of System 7's iconic Chicago font and platinum interface
- **⚡ Smooth Animations**: Modern performance powered by Framer Motion
- **📱 Responsive Design**: System 7 aesthetic adapted for modern devices

### Technical Features
- **🔒 Secure API Integration**: Proxy server prevents NASA API key exposure
- **💾 Data Persistence**: PostgreSQL database for saved items and search history
- **⚡ Performance Optimized**: Intelligent caching and bundle optimization
- **🌐 Cross-Browser Compatible**: Tested across all modern browsers

## 🏗️ Architecture

### Technology Stack

#### Frontend (React)
```
React 18.2+          # Modern UI framework with hooks
Framer Motion         # Smooth animations and gestures
Tailwind CSS          # Utility-first styling
Axios                 # HTTP client for API calls
D3.js                 # Data visualization
```

#### Backend (Node.js)
```
Express.js            # Web framework and API server
Axios                 # NASA/JPL API integration
PostgreSQL (pg)       # Database connection
CORS                  # Cross-origin resource sharing
dotenv               # Environment management
```

#### Database
```
PostgreSQL            # Primary data store
Connection Pooling    # Efficient connection management
Migrations            # Database schema versioning
```

### Project Structure
```
nasa_system7_portal/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/
│   │   │   ├── system7/       # System 7 UI components
│   │   │   │   ├── Desktop.js
│   │   │   │   ├── Window.js
│   │   │   │   ├── MenuBar.js
│   │   │   │   └── DesktopIcon.js
│   │   │   ├── apps/          # NASA data applications
│   │   │   │   ├── ApodApp.js
│   │   │   │   ├── NeoWsApp.js
│   │   │   │   └── ResourceNavigatorApp.js
│   │   │   └── common/        # Shared components
│   │   ├── contexts/          # React context providers
│   │   │   └── AppContext.js  # Window management state
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API service functions
│   │   │   └── nasaApi.js
│   │   └── assets/            # Static assets and icons
│   ├── public/                # Static files
│   ├── package.json           # Frontend dependencies
│   └── tailwind.config.js     # Tailwind configuration
├── server/                    # Node.js/Express backend
│   ├── routes/
│   │   ├── apiProxy.js        # NASA API proxy handler
│   │   └── resourceNavigator.js # Resource catalog API
│   ├── services/              # Business logic
│   ├── middleware/            # Express middleware
│   ├── db.js                  # PostgreSQL connection & setup
│   ├── server.js              # Main server entry point
│   ├── .env                   # Environment variables
│   └── package.json           # Backend dependencies
├── archive/                   # Archived documentation
└── README.md                  # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js** version 14.0 or higher
- **PostgreSQL** version 12.0 or higher
- **npm** or **yarn** package manager

### 1. Obtain NASA API Key
1. Visit [api.nasa.gov](https://api.nasa.gov)
2. Sign up for a free API key
3. Keep your API key secure and never commit it to version control

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb nasa_system7_portal

# Or use your preferred PostgreSQL client
```

### 3. Environment Configuration
```bash
# Navigate to server directory
cd server

# Create and configure .env file
cp .env.example .env
```

Edit `server/.env` with your configuration:
```env
# NASA API Configuration
NASA_API_KEY=your_nasa_api_key_here

# Server Configuration
PORT=3001

# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=nasa_system7_portal
DB_PASSWORD=your_database_password
DB_PORT=5432
```

### 4. Install Dependencies

#### Backend Dependencies
```bash
cd server
npm install
```

#### Frontend Dependencies
```bash
cd ../client
npm install
```

### 5. Database Initialization
```bash
cd ../server
npm run db:init
```
This will create the necessary tables for saved items and search history.

## 🚀 Running the Application

### Development Mode
Both frontend and backend must run simultaneously.

#### Terminal 1: Backend Server
```bash
cd server
npm start
```
Backend will start on `http://localhost:3001`

#### Terminal 2: Frontend Development Server
```bash
cd client
npm start
```
Frontend will start on `http://localhost:3000` and open in your browser

### Production Build
```bash
# Build frontend for production
cd client
npm run build

# Start backend server
cd ../server
npm start
```

## 🔧 API Integration

### Available NASA Endpoints
- **APOD**: `/api/nasa/planetary/apod` - Daily astronomy images
- **NeoWS**: `/api/nasa/neo/rest/v1/feed` - Near Earth Object data
- **Mars Rover**: `/api/nasa/mars-photos/api/v1/rovers` - Mars exploration images
- **EPIC**: `/api/nasa/EPIC/api/natural/images` - Earth imagery

### Proxy Server Architecture
```
Client Request → Express Server → NASA APIs → Response
     (Port 3000)     (Port 3001)     (External)    (Client)
                      API Key Added
```

This proxy approach ensures:
- **Security**: NASA API keys never exposed to client
- **Rate Limiting**: Centralized request management
- **Caching**: Improved performance through intelligent caching
- **Error Handling**: Consistent error responses

## 🎨 System 7 UI Implementation

### Key Features
- **Authentic Typography**: Chicago and Geneva font rendering
- **Platinum Color Scheme**: Classic System 7 gray palette
- **Window Management**: Drag, resize, minimize, and maximize functionality
- **Menu Bar**: Classic Apple menu bar with system controls
- **Desktop Icons**: Clickable application shortcuts

### Components
- **Desktop**: Main workspace with window management
- **Window**: Draggable, resizable application containers
- **MenuBar**: System-wide menu and controls
- **DesktopIcon**: Application launchers

## 📊 Database Schema

### Tables
```sql
-- Saved NASA items (images, datasets, etc.)
CREATE TABLE saved_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    category TEXT,
    description TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Search history for user analytics
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    query_string TEXT NOT NULL,
    search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 Testing

### Running Tests
```bash
# Frontend tests
cd client
npm test

# Backend tests (when implemented)
cd server
npm test
```

### Testing Coverage Goals
- **Unit Tests**: React components and utility functions
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load testing for NASA API integration

## 🚀 Deployment

### Frontend Deployment Options
- **Vercel**: Recommended for React applications
- **Netlify**: Static hosting with CI/CD
- **AWS S3 + CloudFront**: Scalable static hosting

### Backend Deployment Options
- **Heroku**: Easy Node.js deployment
- **AWS Elastic Beanstalk**: Scalable hosting
- **DigitalOcean**: Affordable cloud hosting

### Database Hosting
- **Heroku Postgres**: Managed PostgreSQL
- **AWS RDS**: Relational database service
- **Neon**: Modern PostgreSQL platform

## 🔒 Security Considerations

### Implemented Security Measures
- **API Key Protection**: Server-side key management
- **Input Validation**: All user inputs sanitized
- **CORS Configuration**: Proper cross-origin policies
- **SQL Injection Prevention**: Parameterized queries
- **HTTPS Enforcement**: SSL/TLS for all communications

### Security Best Practices
- Regular dependency updates
- Environment variable protection
- Error message sanitization
- Rate limiting implementation
- Security audit compliance

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style Guidelines
- **ESLint**: JavaScript/React linting
- **Prettier**: Code formatting
- **Conventional Commits**: Standardized commit messages
- **Component Documentation**: JSDoc for all components

### Pull Request Requirements
- [ ] Tests pass for all changes
- [ ] Code follows project style guidelines
- [ ] Documentation updated for new features
- [ ] Security review completed
- [ ] Performance impact assessed

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy loading for large components
- **Bundle Analysis**: Regular bundle size monitoring
- **Image Optimization**: WebP format with fallbacks
- **Caching Strategy**: Service worker implementation

### Backend Optimization
- **API Caching**: Intelligent response caching
- **Database Indexing**: Optimized query performance
- **Connection Pooling**: Efficient database connections
- **Compression**: Gzip compression for responses

## 🗺️ Roadmap

### Phase 1: Core Enhancement (Current)
- [x] Basic NASA API integration
- [x] System 7 UI framework
- [x] Database persistence
- [ ] Enhanced data visualization
- [ ] Advanced search functionality
- [ ] Mobile responsiveness

### Phase 2: Advanced Features
- [ ] User authentication system
- [ ] Real-time data updates
- [ ] Data export capabilities
- [ ] Additional NASA services
- [ ] Enhanced UI components

### Phase 3: Platform Expansion
- [ ] Multi-language support
- [ ] Educational content integration
- [ ] Community features
- [ ] Advanced analytics
- [ ] Mobile applications

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA** for providing amazing open APIs and data
- **Apple** for the inspiration from System 7 design
- **React Community** for excellent tools and libraries
- **Open Source Contributors** who make projects like this possible

## 📞 Support

For questions, issues, or contributions:
- **Issues**: [GitHub Issues](https://github.com/your-username/nasa-system7-portal/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/nasa-system7-portal/discussions)
- **Email**: your-email@example.com

---

**Built with ❤️ for space enthusiasts and retro computing fans**

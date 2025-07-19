# SOP-to-BPMN Converter

A web application that converts Standard Operating Procedures (SOPs) into Business Process Model and Notation (BPMN) diagrams using AI agents and AWS S3 storage.

## 🏗️ Project Structure

```
abhishekarora9.github.io/
├── backend/                          # FastAPI backend server
│   ├── agents/                       # AI processing agents
│   │   ├── __init__.py
│   │   ├── bpmn_template_generator.py
│   │   ├── bpmn_template_refiner.py
│   │   ├── bpmn_xml_generator.py
│   │   ├── bpmn_xml_refiner.py
│   │   └── summary_agent.py
│   ├── services/                     # Business logic services
│   │   ├── __init__.py
│   │   ├── chat_service.py
│   │   └── file_processor.py
│   ├── utils/                        # Utility functions
│   │   ├── __init__.py
│   │   ├── llm_utils.py
│   │   ├── s3_utils.py
│   │   └── text_extraction.py
│   ├── config.py                     # Configuration settings
│   ├── main.py                       # FastAPI application entry point
│   ├── add_user.py                   # User management script
│   ├── remove_user.py                # User removal script
│   └── update_user_role.py           # User role update script
├── frontend/                         # React frontend application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                    # Main React component
│   │   └── index.js
│   ├── package.json
│   └── package-lock.json
└── README.md                         # This file
```

## 🚀 Features

### Core Functionality
- **PDF Upload & Processing**: Upload SOP PDFs for BPMN conversion
- **AI-Powered Conversion**: Multi-agent system for intelligent BPMN generation
- **BPMN Visualization**: Interactive BPMN viewer with zoom, pan, and fullscreen support
- **Batch Processing**: Reprocess multiple files simultaneously
- **File Management**: Organize and manage processed files with S3 storage

### User Management
- **Role-Based Access Control**: Admin and normal user roles
- **Authentication**: Secure login system with token-based auth
- **Access Control**: Admin-only features for batch operations and downloads
- **User Management**: Add, remove, and update user roles

### BPMN Viewer Features
- **Interactive Controls**: Zoom in/out, fit to viewport, reset view
- **Fullscreen Mode**: Immersive viewing experience
- **Keyboard Navigation**: ESC key support for fullscreen exit
- **Drag & Pan**: Navigate large diagrams easily
- **Error Prevention**: Robust error handling for smooth operation

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **AWS S3**: File storage and user data management
- **OpenAI GPT**: AI processing for BPMN generation
- **Uvicorn**: ASGI server for production deployment

### Frontend
- **React**: Modern JavaScript framework
- **BPMN.js**: Professional BPMN viewer and editor
- **Axios**: HTTP client for API communication
- **CSS3**: Modern styling with responsive design

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- AWS S3 bucket with appropriate permissions
- OpenAI API key

## 🔧 Installation & Setup

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Copy the example environment file and configure your credentials:
   ```bash
   cp ../env.example .env
   ```
   
   Edit `.env` file with your actual credentials:
   ```
   AWS_ACCESS_KEY_ID=your_actual_access_key
   AWS_SECRET_ACCESS_KEY=your_actual_secret_key
   AWS_S3_BUCKET=your_actual_bucket_name
   OPENAI_API_KEY=your_actual_openai_key
   JWT_SECRET_KEY=your_actual_jwt_secret
   ```
   
   **⚠️ SECURITY WARNING**: Never commit your `.env` file to version control!

5. **Start the backend server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8000

## 👥 User Management

### Adding Users
```bash
cd backend
python add_user.py username password role
# Example: python add_user.py test1 test1 user
```

### Removing Users
```bash
cd backend
python remove_user.py username
# Example: python remove_user.py testuser
```

### Updating User Roles
```bash
cd backend
python update_user_role.py username new_role
# Example: python update_user_role.py aaror226 admin
```

### Available Roles
- `admin`: Full access to all features including batch operations
- `user`: Standard access with restrictions on admin features

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Different permissions for admin and normal users
- **Input Validation**: Comprehensive validation for all user inputs
- **Error Handling**: Graceful error handling without exposing sensitive information
- **CORS Protection**: Configured CORS for secure cross-origin requests

### **🔒 Security Best Practices**

#### **Environment Variables**
- All sensitive data (API keys, credentials) are stored in environment variables
- Never commit `.env` files to version control
- Use `env.example` as a template for required environment variables

#### **API Key Management**
- OpenAI API keys are loaded from environment variables
- AWS credentials are loaded from environment variables
- JWT secrets are loaded from environment variables

#### **Production Security**
- Enable HTTPS/SSL in production
- Use secure secret management services
- Regularly rotate API keys and credentials
- Monitor for unauthorized access attempts

## 📁 File Processing Workflow

1. **Upload**: User uploads SOP PDF file
2. **Text Extraction**: System extracts text content from PDF
3. **AI Processing**: Multi-agent system processes the content:
   - Template generation
   - Template refinement
   - XML generation
   - XML refinement
4. **BPMN Creation**: Final BPMN diagram is generated
5. **Storage**: All files stored in AWS S3 with organized structure
6. **Visualization**: Interactive BPMN viewer displays the result

## 🎯 API Endpoints

### Authentication
- `POST /login` - User login
- `GET /auth/status` - Check authentication status
- `POST /auth/request-access` - Request account access

### File Management
- `GET /files` - List uploaded files
- `POST /upload` - Upload new file
- `GET /results_structure` - Get processing results structure
- `GET /reprocessable_files` - List files available for reprocessing

### Processing
- `POST /process` - Process uploaded file
- `POST /reprocess` - Reprocess existing file
- `POST /batch_reprocess` - Batch reprocess multiple files (admin only)

### File Access
- `GET /results/{file_id}/{filename}` - Download result files
- `GET /serve_result_file/{file_id}/{filename}` - Serve result files with watermarks

## 🎨 UI Features

### Modern Design
- Clean, minimalist interface
- Responsive design for all screen sizes
- Professional color scheme
- Intuitive navigation

### BPMN Viewer
- **Interactive Controls**: Zoom, pan, fit to viewport
- **Fullscreen Mode**: Immersive viewing experience
- **Keyboard Support**: ESC key for fullscreen exit
- **Error Prevention**: Robust error handling
- **Performance**: Optimized for large diagrams

### User Experience
- **Loading States**: Clear feedback during operations
- **Error Messages**: User-friendly error handling
- **Success Notifications**: Confirmation of completed actions
- **Accessibility**: Keyboard navigation and screen reader support

## 🔧 Configuration

### Backend Configuration (`config.py`)
- AWS S3 settings
- OpenAI API configuration
- JWT settings
- CORS configuration
- File processing parameters

### Frontend Configuration
- API endpoint configuration
- BPMN viewer settings
- UI customization options

## 🚀 Deployment

### Backend Deployment
1. Set up production environment variables
2. Use production ASGI server (Gunicorn + Uvicorn)
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates

### Frontend Deployment
1. Build production version: `npm run build`
2. Serve static files with web server
3. Configure API endpoint for production
4. Set up CDN for optimal performance

## 🐛 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 8000 and 3001 are available
2. **AWS credentials**: Verify S3 bucket permissions and credentials
3. **OpenAI API**: Check API key validity and quota limits
4. **CORS errors**: Verify backend CORS configuration

### Debug Mode
- Backend: Set `DEBUG=True` in environment variables
- Frontend: Use browser developer tools for debugging

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For internal development:
1. Follow the existing code style
2. Add comprehensive error handling
3. Test thoroughly before submitting
4. Update documentation as needed

## 📞 Support

For technical support or questions, contact the development team.

---

**Last Updated**: December 2024
**Version**: 1.0.0
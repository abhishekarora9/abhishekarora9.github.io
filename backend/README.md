# Backend - Modular BPMN Process Builder

This backend provides a modular architecture for processing documents and generating BPMN (Business Process Model and Notation) diagrams using multiple AI agents.

## Project Structure

```
backend/
├── __init__.py                 # Package initialization
├── main.py                     # S3-only modular main file (current)
├── main_original.py            # Original monolithic file (backup)
├── config.py                   # Configuration settings
├── uploads/                    # Temporary upload directory (S3-synced)
├── agents/                     # AI Agent modules
│   ├── __init__.py
│   ├── bpmn_template_generator.py    # Agent 1: Generate BPMN templates
│   ├── bpmn_template_refiner.py      # Agent 2: Refine BPMN templates
│   ├── bpmn_xml_generator.py         # Agent 3: Generate BPMN XML
│   ├── bpmn_xml_refiner.py           # Agent 4: Refine BPMN XML
│   └── summary_agent.py              # Agent 5: Generate summaries
├── services/                   # Business logic services
│   ├── __init__.py
│   ├── file_processor.py             # Main file processing orchestration
│   └── chat_service.py               # Chat interaction service
└── utils/                      # Utility modules
    ├── __init__.py
    ├── llm_utils.py                  # LLM interaction utilities
    ├── text_extraction.py            # Text extraction from various file types
    └── s3_utils.py                   # S3 storage utilities
```

## Architecture Overview

### Agents
Each agent is responsible for a specific step in the BPMN generation process:

1. **BPMN Template Generator**: Extracts process structure from SOP text and creates JSON templates
2. **BPMN Template Refiner**: Validates and improves the generated templates
3. **BPMN XML Generator**: Converts JSON templates to BPMN 2.0 XML
4. **BPMN XML Refiner**: Validates and optimizes the XML for deployment
5. **Summary Agent**: Generates summaries of the processed documents

### Services
- **File Processor**: Orchestrates the entire processing pipeline
- **Chat Service**: Handles interactive chat with processed documents

### Utils
- **LLM Utils**: OpenAI API interactions and XML content extraction
- **Text Extraction**: Extracts text from PDF, images, and other file types
- **S3 Utils**: AWS S3 storage operations

## Usage

### Running the Application
```bash
cd backend
uvicorn main:app --reload
```

The application is now fully modularized and runs on the standard port 8000.

## Key Features

### Modular Design Benefits
- **Separation of Concerns**: Each module has a single responsibility
- **Maintainability**: Easier to modify individual components
- **Testability**: Each module can be tested independently
- **Reusability**: Components can be reused across different parts of the application
- **Scalability**: Easy to add new agents or modify existing ones

### S3-Only Architecture
- **Cloud-Native**: All results stored in S3, no local storage dependency
- **Stateless**: Server can be restarted without losing data
- **Scalable**: Can run multiple instances without data sync issues
- **Automatic Cleanup**: Temporary files cleaned up automatically

### XML Content Cleaning
- Automatically extracts clean BPMN XML from LLM responses
- Removes explanatory text that causes parsing errors in BPMN viewers
- Ensures compatibility with tools like Camunda, bpmn.io, and Zeebe

### File Processing Pipeline
1. File upload and S3 storage
2. Text extraction (PDF, images, DOCX)
3. Multi-agent BPMN generation
4. Output file generation and S3 storage
5. Real-time status tracking
6. On-demand S3 file serving with cleanup

## API Endpoints

The modular version provides the same API endpoints as the original, plus new reprocessing capabilities:

### Core Endpoints
- `POST /upload` - Upload new files for processing
- `POST /process_existing` - Process existing S3 files
- `GET /status/{job_id}` - Get processing status
- `GET /download/{job_id}` - Download final BPMN file
- `GET /download/{job_id}/{output_type}` - Download intermediate outputs
- `POST /chat` - Chat with processed documents
- `GET /job_outputs/{job_id}` - View all outputs (HTML/JSON)
- `GET /files` - List S3 files
- `GET /results_structure` - Get S3 results structure

### Reprocessing Endpoints
- `GET /reprocessable_files` - List files that can be reprocessed
- `POST /reprocess` - Reprocess a single file and replace outputs
- `POST /reprocess_batch` - Reprocess multiple files and replace outputs

## Configuration

Environment variables are managed in `config.py`:
- `AWS_S3_BUCKET` - S3 bucket for file storage
- `AWS_DEFAULT_REGION` - AWS region
- `OPENAI_API_KEY` - OpenAI API key

## Current Status

The application has been successfully modularized and is now running as the main version. The original monolithic file has been preserved as `main_original.py` for reference.

- **Current**: Fully modularized architecture
- **Backup**: Original monolithic file preserved
- **API**: All endpoints remain unchanged
- **Functionality**: All features preserved and enhanced

## Future Enhancements

The modular structure enables easy addition of:
- New AI agents for specialized tasks
- Different text extraction methods
- Alternative storage backends
- Enhanced error handling and retry logic
- Performance monitoring and metrics 
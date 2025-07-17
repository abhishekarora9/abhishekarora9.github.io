from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
import shutil
import time
import threading
import boto3

app = FastAPI()

origins = [
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JOBS = {}
UPLOAD_DIR = "uploads"
RESULT_DIR = "results"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")  # Store your key in an environment variable

def call_llm(prompt):
    response = openai.chat.completions.create(
        model="gpt-4",  # or "gpt-3.5-turbo"
        messages=[
            {"role": "system", "content": "You are a BPMN process builder."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content



s3 = boto3.client('s3')
textract = boto3.client('textract', region_name=os.getenv('AWS_DEFAULT_REGION'))

def upload_to_s3(file_path, bucket, key):
    s3.upload_file(file_path, bucket, key)

def extract_text_from_s3(bucket, key):
    response = textract.start_document_text_detection(
        DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': key}}
    )
    job_id = response['JobId']
    # Poll for result (see Textract docs for full example)
    return job_id

def extract_text_from_pdf(file_path):
    # TODO: Implement PDF text extraction logic
    return "Extracted text from PDF"

def extract_text_from_docx(file_path):
    # TODO: Implement DOCX text extraction logic
    return "Extracted text from DOCX"

def process_file(job_id, file_path):
    # 1. Extract text (AWS Textract or python-docx)
    if file_path.endswith('.pdf') or file_path.endswith('.jpg') or file_path.endswith('.png'):
        sop_content = extract_text_from_pdf(file_path)
    elif file_path.endswith('.docx'):
        sop_content = extract_text_from_docx(file_path)
    else:
        sop_content = "Unsupported file type"

    # 2. Agent 1: BPMN Process Generator
    prompt1 = f"Convert this SOP to a BPMN process template: {sop_content}"
    bpmn_template = call_llm(prompt1)

    # 3. Agent 2: BPMN Process Refiner
    prompt2 = f"Refine this BPMN process template for correctness: {bpmn_template}"
    refined_template = call_llm(prompt2)

    # 4. Agent 3: BPMN XML Generator
    prompt3 = f"Convert this refined BPMN process template to BPMN 2.0 XML: {refined_template}"
    bpmn_xml = call_llm(prompt3)

    # 5. Agent 4: BPMN XML Refiner
    prompt4 = f"Refine this BPMN 2.0 XML for standards compliance: {bpmn_xml}"
    final_bpmn_xml = call_llm(prompt4)

    # 6. Save result
    result_path = os.path.join(RESULT_DIR, f"{job_id}.bpmn.xml")
    with open(result_path, "w") as f:
        f.write(final_bpmn_xml or "")
    JOBS[job_id]["status"] = "completed"
    JOBS[job_id]["result_path"] = result_path

@app.post("/upload")
def upload(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    JOBS[job_id] = {"status": "processing", "file_path": file_path}
    threading.Thread(target=process_file, args=(job_id, file_path)).start()
    return {"job_id": job_id}

@app.get("/status/{job_id}")
def status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"status": "not_found"})
    return {"status": job["status"]}

@app.get("/download/{job_id}")
def download(job_id: str):
    job = JOBS.get(job_id)
    if not job or job["status"] != "completed":
        return JSONResponse(status_code=404, content={"error": "Not ready"})
    return FileResponse(job["result_path"], filename=f"bpmn_{job_id}.xml")



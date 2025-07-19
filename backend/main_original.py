from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, UploadFile, File, Body, Form, Request
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os
import shutil
import time
import threading
import boto3
import openai
import pdfplumber
import json
import urllib.parse


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

S3_BUCKET = os.getenv("AWS_S3_BUCKET")

S3_RESULTS_MAP_PATH = os.path.join(RESULT_DIR, "s3_results_map.json")
if os.path.exists(S3_RESULTS_MAP_PATH):
    with open(S3_RESULTS_MAP_PATH, "r") as f:
        S3_RESULTS_MAP = json.load(f)
else:
    S3_RESULTS_MAP = {}

def save_s3_results_map():
    with open(S3_RESULTS_MAP_PATH, "w") as f:
        json.dump(S3_RESULTS_MAP, f)


openai.api_key = os.getenv("OPENAI_API_KEY")  # Store your key in an environment variable

def call_llm(prompt):
    response = openai.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": "You are a BPMN process builder."},
            {"role": "user", "content": prompt}
        ]
    )
    return response.choices[0].message.content

def extract_xml_content(text):
    """
    Extract XML content from LLM response, removing any explanatory text.
    Looks for content between <?xml and </bpmn:definitions>
    """
    if not text:
        return text
    
    # Find the start of XML content
    xml_start = text.find('<?xml')
    if xml_start == -1:
        # Try alternative XML declarations
        xml_start = text.find('<bpmn:definitions')
        if xml_start == -1:
            return text  # No XML found, return as is
    
    # Find the end of XML content
    xml_end = text.find('</bpmn:definitions>')
    if xml_end == -1:
        # If no proper end found, try to find the last occurrence of bpmn:definitions
        last_def = text.rfind('bpmn:definitions')
        if last_def != -1:
            # Find the closing tag after the last occurrence
            xml_end = text.find('>', last_def)
            if xml_end != -1:
                xml_end += 1
        else:
            return text  # No proper end found, return as is
    
    # Extract the XML content including the closing tag
    xml_content = text[xml_start:xml_end + len('</bpmn:definitions>')]
    
    # Clean up any remaining whitespace and ensure proper formatting
    xml_content = xml_content.strip()
    
    # Ensure the content starts with XML declaration or bpmn:definitions
    if not xml_content.startswith('<?xml') and not xml_content.startswith('<bpmn:definitions'):
        return text  # Something went wrong, return original
    
    return xml_content




s3 = boto3.client('s3')
textract = boto3.client('textract', region_name=os.getenv('AWS_DEFAULT_REGION'))

def upload_to_s3(file_path, bucket, key):
    s3.upload_file(file_path, bucket, key)

def extract_text_from_s3(bucket, key):
    # 1. Start the Textract job
    response = textract.start_document_text_detection(
        DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': key}}
    )
    job_id = response['JobId']

    # 2. Poll for the job to complete
    while True:
        result = textract.get_document_text_detection(JobId=job_id)
        status = result['JobStatus']
        if status in ['SUCCEEDED', 'FAILED']:
            break
        time.sleep(2)  # Wait before polling again

    if status == 'SUCCEEDED':
        # 3. Extract text from all pages
        text = ""
        next_token = None
        while True:
            if next_token:
                result = textract.get_document_text_detection(JobId=job_id, NextToken=next_token)
            for block in result['Blocks']:
                if block['BlockType'] == 'LINE':
                    text += block['Text'] + '\n'
            next_token = result.get('NextToken')
            if not next_token:
                break
        return text.strip() or "(No text found in document)"
    else:
        return "Textract job failed"

def extract_text_from_pdf(file_path):
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    print("Extracted PDF text:", repr(text.strip()))
    return text.strip() or "(No text found in PDF)"

def extract_text_from_docx(file_path):
    # TODO: Implement DOCX text extraction logic
    return "Extracted text from DOCX"

def upload_output_to_s3(local_path, s3_input_key, output_name):
    s3_key = f"results/{s3_input_key}/{output_name}"
    s3.upload_file(local_path, S3_BUCKET, s3_key)
    return s3_key

def download_output_from_s3(s3_input_key, output_name, local_path):
    s3_key = f"results/{s3_input_key}/{output_name}"
    try:
        s3.download_file(S3_BUCKET, s3_key, local_path)
        return True
    except Exception:
        return False

def list_results_structure():
    # List all results in S3 under results/
    response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix="results/")
    files = response.get("Contents", [])
    structure = {}
    for obj in files:
        key = obj["Key"]
        if key.endswith("/"):
            continue
        parts = key.split("/", 2)
        if len(parts) < 3:
            continue
        _, input_s3_key, output_name = parts
        if input_s3_key not in structure:
            structure[input_s3_key] = []
        structure[input_s3_key].append(output_name)
    return structure

def process_file(job_id, file_path):
    try:
        print(f"[process_file] Starting job {job_id} for file {file_path}")
        job = JOBS.get(job_id)
        if job is not None:
            bucket = job.get("bucket", S3_BUCKET)
            s3_key = job.get("s3_key")
        else:
            bucket = S3_BUCKET
            s3_key = None
        # 1. Extract text (pdfplumber for PDF, python-docx for docx, Textract for images)
        if file_path.endswith('.pdf'):
            sop_content = extract_text_from_pdf(file_path)
        elif file_path.endswith('.jpg') or file_path.endswith('.png'):
            bucket = job.get("bucket") if job else None
            s3_key = job.get("s3_key") if job else None
            sop_content = extract_text_from_s3(bucket, s3_key) if bucket and s3_key else "S3 info missing"
        elif file_path.endswith('.docx'):
            sop_content = extract_text_from_docx(file_path)
        else:
            sop_content = "Unsupported file type"

        print(f"[process_file] Extracted text for job {job_id}:\n{sop_content}")
        JOBS[job_id]["extracted_text"] = sop_content

        # Agent 1: BPMN Template Generator
        prompt1 = f"""
You are a BPMN Process Designer Agent. You are given an SOP text extracted from a document. Your task is to extract a high-level process structure and convert it into a BPMN process template.

Analyze the content and identify:
- Actors (roles or departments)
- Start event
- User tasks, Service tasks, Gateways, and End events
- Sequence flow (in order)
- Special conditions (e.g., wait periods, triggers)
- Swimlanes for responsibilities

Output the process in a structured JSON format like:
{{
  "start_event": "Start",
  "tasks": [
    {{"id": "Task_1", "name": "Receive Application", "actor": "Customer Support"}},
    {{"id": "Gateway_1", "type": "exclusive", "name": "Is Application Complete?"}},
    {{"id": "Task_2", "name": "Request Additional Documents", "actor": "Customer Support"}}
  ],
  "end_event": "Application Accepted",
  "swimlanes": ["Customer Support", "Compliance Team"]
}}

SOP Text:
{sop_content}
"""
        bpmn_template = call_llm(prompt1)
        JOBS[job_id]["bpmn_template"] = bpmn_template
        print("[process_file] Agent 1 (BPMN Template Generator) complete.")

        # Agent 2: BPMN Template Refiner
        prompt2 = f"""
You are a BPMN Process Refiner Agent. You will receive a proposed BPMN process (as JSON) and the original SOP text.

Check if all critical steps from the SOP are represented.
Fix incorrect flow sequences or missing elements (like approvals or exceptions).
Ensure the swimlanes match the roles described in the SOP.
Annotate special conditions such as escalation, retry loops, or timeouts.
Return a corrected and enriched JSON template and clearly state what was changed or added with reasons.

SOP Text:
{sop_content}

Proposed BPMN JSON:
{bpmn_template}
"""
        refined_template = call_llm(prompt2)
        JOBS[job_id]["refined_bpmn_template"] = refined_template
        print("[process_file] Agent 2 (BPMN Template Refiner) complete.")

        # Agent 3: BPMN XML Generator
        prompt3 = f"""
You are a BPMN XML Generator Agent. Given a structured BPMN process in JSON format, convert it into a valid BPMN 2.0 compliant XML.

IMPORTANT: Return ONLY the BPMN XML content starting with <?xml and ending with </bpmn:definitions>. Do not include any explanatory text, comments, or markdown formatting.

Ensure:
- Every task/gateway/event has a unique ID
- Correct sequence flows with sourceRef and targetRef
- Proper lane and participant structure
- BPMN namespaces and structure are intact
- Add explicit <bpmn:dataObject> elements to represent business data (card info, identity info, refund amount, logs, receipt, etc.) or BPMN annotations to capture business rules, just ask. Also, I can provide a Camunda or other tooling compatible .bpmn file with correct diagram info on request.

Important rules to ensure valid BPMN XML:
1. All <bpmn:sequenceFlow> IDs **must be unique**. Do not reuse IDs for different flows.
2. All sequence flow IDs referenced in <incoming> and <outgoing> **must be defined explicitly**.
3. Avoid using <bpmn:ConditionExpression> (incorrect). Use:
   <bpmn:conditionExpression xsi:type="tFormalExpression">expression_here</bpmn:conditionExpression>

BPMN JSON:
{refined_template}
"""
        bpmn_xml_raw = call_llm(prompt3)
        bpmn_xml = extract_xml_content(bpmn_xml_raw)
        JOBS[job_id]["bpmn_xml"] = bpmn_xml
        print(f"[process_file] Agent 3 (BPMN XML Generator) complete. XML length: {len(bpmn_xml) if bpmn_xml else 0} chars")
        if bpmn_xml and bpmn_xml_raw and len(bpmn_xml) != len(bpmn_xml_raw):
            print(f"[process_file] XML content extracted and cleaned. Original: {len(bpmn_xml_raw)} chars, Cleaned: {len(bpmn_xml)} chars")

        # Agent 4: BPMN XML Refiner
        prompt4 = f"""
You are a **BPMN XML Refiner Agent**. You are given a **BPMN 2.0 XML string**, and your task is to correct and improve it before it's used for deployment or visualization.

IMPORTANT: Return ONLY the BPMN XML content starting with <?xml and ending with </bpmn:definitions>. Do not include any explanatory text, comments, or markdown formatting.

### Your responsibilities include:

-  **Validate** that the XML conforms to the **BPMN 2.0 schema**
-  **Ensure connectivity** between all `sequenceFlow`, `startEvent`, `task`, `endEvent`, and `gateway` elements
-  **Remove** any:
  - Redundant or duplicate elements
  - Orphaned flows or elements not used in the diagram
  - Empty or unused labels or definitions
-  **Fix issues** such as:
  - Broken or disconnected `bpmndi:BPMNEdge` / `BPMNShape` references
  - Missing layout tags for visual rendering
  - Inconsistent IDs or invalid namespace usage
-  **Add helpful metadata**, such as:
  - `<documentation>` tags for process clarity
  - Human-readable labels on events and tasks
-  **Optimize the layout**:
  - Ensure coordinates (`x`, `y`) of diagram shapes are spaced cleanly
  - Avoid overlaps and improve alignment for clear BPMN viewer rendering
- **Ensure compatibility** with tools like:
  - Camunda Modeler
  - bpmn.io
  - Zeebe

 **Output**:
- A cleaned-up, fully valid **BPMN 2.0 XML string** ready for deployment or visualization

BPMN XML:
{bpmn_xml}
"""
        final_bpmn_xml_raw = call_llm(prompt4)
        final_bpmn_xml = extract_xml_content(final_bpmn_xml_raw)
        JOBS[job_id]["final_bpmn_xml"] = final_bpmn_xml
        print(f"[process_file] Agent 4 (BPMN XML Refiner) complete. XML length: {len(final_bpmn_xml) if final_bpmn_xml else 0} chars")
        if final_bpmn_xml and final_bpmn_xml_raw and len(final_bpmn_xml) != len(final_bpmn_xml_raw):
            print(f"[process_file] Final XML content extracted and cleaned. Original: {len(final_bpmn_xml_raw)} chars, Cleaned: {len(final_bpmn_xml)} chars")

        # Agent 5: Summary Agent
        summary_prompt = f"Summarize the following SOP:\n{sop_content}\n\nSummary:"
        summary = call_llm(summary_prompt)
        JOBS[job_id]["summary"] = summary
        print("[process_file] Agent 5 (Summary) complete.")

        # Save intermediate outputs as files
        extracted_text_path = os.path.join(RESULT_DIR, f"{job_id}_extracted_text.txt")
        with open(extracted_text_path, "w") as f:
            f.write(sop_content or "")
        upload_output_to_s3(extracted_text_path, s3_key, "extracted_text.txt")
        JOBS[job_id]["extracted_text_path"] = extracted_text_path

        bpmn_template_path = os.path.join(RESULT_DIR, f"{job_id}_bpmn_template.json")
        with open(bpmn_template_path, "w") as f:
            f.write(bpmn_template or "")
        upload_output_to_s3(bpmn_template_path, s3_key, "bpmn_template.json")
        JOBS[job_id]["bpmn_template_path"] = bpmn_template_path

        refined_bpmn_template_path = os.path.join(RESULT_DIR, f"{job_id}_refined_bpmn_template.json")
        with open(refined_bpmn_template_path, "w") as f:
            f.write(refined_template or "")
        upload_output_to_s3(refined_bpmn_template_path, s3_key, "refined_bpmn_template.json")
        JOBS[job_id]["refined_bpmn_template_path"] = refined_bpmn_template_path

        bpmn_xml_path = os.path.join(RESULT_DIR, f"{job_id}_bpmn_xml.xml")
        with open(bpmn_xml_path, "w") as f:
            f.write(bpmn_xml or "")
        upload_output_to_s3(bpmn_xml_path, s3_key, "bpmn_xml.xml")
        JOBS[job_id]["bpmn_xml_path"] = bpmn_xml_path

        final_bpmn_xml_path = os.path.join(RESULT_DIR, f"{job_id}_final_bpmn_xml.bpmn")
        with open(final_bpmn_xml_path, "w") as f:
            f.write(final_bpmn_xml or "")
        upload_output_to_s3(final_bpmn_xml_path, s3_key, "final_bpmn_xml.bpmn")
        JOBS[job_id]["final_bpmn_xml_path"] = final_bpmn_xml_path

        summary_path = os.path.join(RESULT_DIR, f"{job_id}_summary.txt")
        with open(summary_path, "w") as f:
            f.write(summary or "")
        upload_output_to_s3(summary_path, s3_key, "summary.txt")
        JOBS[job_id]["summary_path"] = summary_path

        # Save result (final XML and summary in one file for now)
        result_path = os.path.join(RESULT_DIR, f"{job_id}.bpmn.xml")
        with open(result_path, "w") as f:
            f.write(final_bpmn_xml or "")
        upload_output_to_s3(result_path, s3_key, "result.bpmn.xml")
        JOBS[job_id]["status"] = "completed"
        JOBS[job_id]["result_path"] = result_path
        print("[process_file] Saving result and marking as completed")
        print(f"[process_file] Job {job_id} completed successfully.")
    except Exception as e:
        print(f"[process_file] Error processing job {job_id}: {e}")
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)

@app.post("/upload")
def upload(file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    # Upload to S3
    bucket = S3_BUCKET
    s3_key = f"{job_id}_{file.filename}"
    upload_to_s3(file_path, bucket, s3_key)
    JOBS[job_id] = {"status": "processing", "file_path": file_path, "s3_key": s3_key, "bucket": bucket}
    threading.Thread(target=process_file, args=(job_id, file_path)).start()
    return {"job_id": job_id}

@app.post("/process_existing")
def process_existing(s3_key: str = Body(..., embed=True)):
    try:
        # Check if results for this S3 key already exist in S3
        expected_outputs = [
            ("extracted_text_path", "extracted_text.txt"),
            ("bpmn_template_path", "bpmn_template.json"),
            ("refined_bpmn_template_path", "refined_bpmn_template.json"),
            ("bpmn_xml_path", "bpmn_xml.xml"),
            ("final_bpmn_xml_path", "final_bpmn_xml.bpmn"),
            ("summary_path", "summary.txt"),
            ("result_path", "result.bpmn.xml")
        ]
        job_id = None
        all_found = True
        local_paths = {}
        for key, output_name in expected_outputs:
            local_path = os.path.join(RESULT_DIR, f"s3_{s3_key.replace('/', '_')}_{output_name}")
            found = download_output_from_s3(s3_key, output_name, local_path)
            if found:
                local_paths[key] = local_path
            else:
                all_found = False
        if all_found:
            # Use a deterministic job_id for this s3_key for reuse
            job_id = f"s3_{s3_key.replace('/', '_')}"
            job = {"status": "completed", "s3_key": s3_key, "bucket": S3_BUCKET}
            for key, _ in expected_outputs:
                job[key] = local_paths[key]
            JOBS[job_id] = job
            return {"job_id": job_id, "reused": True}
        # If not all outputs found, process as usual
        job_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, s3_key)
        # Download file from S3 to uploads dir
        s3.download_file(S3_BUCKET, s3_key, file_path)
        JOBS[job_id] = {"status": "processing", "file_path": file_path, "s3_key": s3_key, "bucket": S3_BUCKET}
        threading.Thread(target=process_file, args=(job_id, file_path)).start()
        # Save mapping for future reuse
        S3_RESULTS_MAP[s3_key] = job_id
        save_s3_results_map()
        return {"job_id": job_id, "reused": False}
    except Exception as e:
        print(f"[process_existing] Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

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
    # Serve as .bpmn file
    bpmn_path = job["result_path"]
    bpmn_filename = f"bpmn_{job_id}.bpmn"
    
    # Check if file needs cleaning and clean it on-the-fly
    try:
        with open(bpmn_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # If content contains explanatory text, clean it
        if content.find('Certainly!') != -1 or content.find('**refined, deployment-ready BPMN 2.0 XML**') != -1:
            clean_content = extract_xml_content(content)
            # Write the cleaned content back to file
            with open(bpmn_path, 'w', encoding='utf-8') as f:
                f.write(clean_content)
            print(f"[download] Cleaned BPMN file for job {job_id}")
    except Exception as e:
        print(f"[download] Error cleaning BPMN file for job {job_id}: {e}")
    
    return FileResponse(bpmn_path, filename=bpmn_filename)

@app.get("/download/{job_id}/{output_type}")
def download_intermediate(job_id: str, output_type: str):
    job = JOBS.get(job_id)
    if not job or job["status"] not in ["completed", "processing"]:
        return JSONResponse(status_code=404, content={"error": "Not ready"})
    path_key = f"{output_type}_path"
    file_path = job.get(path_key)
    if not file_path or not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"error": f"{output_type} not available"})
    
    # Check if this is a BPMN file that needs cleaning
    if output_type in ["bpmn_xml", "final_bpmn_xml"]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # If content contains explanatory text, clean it
            if content.find('Certainly!') != -1 or content.find('**refined, deployment-ready BPMN 2.0 XML**') != -1:
                clean_content = extract_xml_content(content)
                # Write the cleaned content back to file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(clean_content)
                print(f"[download_intermediate] Cleaned {output_type} file for job {job_id}")
        except Exception as e:
            print(f"[download_intermediate] Error cleaning {output_type} file for job {job_id}: {e}")
    
    # Set a reasonable filename
    ext = os.path.splitext(file_path)[1]
    filename = f"{output_type}_{job_id}{ext}"
    return FileResponse(file_path, filename=filename)

@app.post("/chat")
def chat(job_id: str = Body(...), prompt: str = Body(...)):
    job = JOBS.get(job_id)
    if not job or "file_path" not in job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    # Use the extracted text as context
    if job["file_path"].endswith('.pdf'):
        context = extract_text_from_pdf(job["file_path"])
    elif job["file_path"].endswith('.jpg') or job["file_path"].endswith('.png'):
        context = extract_text_from_s3(job["bucket"], job["s3_key"])
    elif job["file_path"].endswith('.docx'):
        context = extract_text_from_docx(job["file_path"])
    else:
        context = "Unsupported file type"
    if prompt.strip().lower() == "show me the extracted text only.":
        return {"response": context}
    if prompt.strip().lower() == "summarize the sop":
        summary = job.get("summary", "No summary available.")
        return {"response": summary}
    # Structure the prompt for OpenAI
    full_prompt = f"Given the following extracted SOP text:\n{context}\n\nUser prompt: {prompt}\n\nPlease answer based on the SOP."
    response = call_llm(full_prompt)
    return {"response": response}

@app.get("/files")
def list_files():
    try:
        if not S3_BUCKET:
            return JSONResponse(status_code=500, content={"error": "S3_BUCKET not configured"})
        response = s3.list_objects_v2(Bucket=S3_BUCKET)
        files = [obj["Key"] for obj in response.get("Contents", [])]
        return {"files": files}
    except Exception as e:
        print(f"[list_files] Error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/job_outputs/{job_id}")
def job_outputs(job_id: str, request: Request):
    job = JOBS.get(job_id)
    if not job:
        if "text/html" in request.headers.get("accept", ""):
            return HTMLResponse(f"<h2>Job not found</h2>")
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    outputs = {}
    for key in [
        "extracted_text_path",
        "bpmn_template_path",
        "refined_bpmn_template_path",
        "bpmn_xml_path",
        "final_bpmn_xml_path",
        "summary_path",
        "result_path"
    ]:
        if key in job and os.path.exists(job[key]):
            outputs[key] = job[key]
    status = job.get("status")
    source_file = job.get("file_path") or job.get("s3_key") or "Unknown Source File"
    # Serve HTML if browser
    if "text/html" in request.headers.get("accept", ""):
        def output_label(k):
            return {
                "extracted_text_path": "Extracted Text",
                "bpmn_template_path": "BPMN Template (JSON)",
                "refined_bpmn_template_path": "Refined BPMN Template (JSON)",
                "bpmn_xml_path": "BPMN XML (raw)",
                "final_bpmn_xml_path": "Final BPMN XML (.bpmn)",
                "summary_path": "Summary",
                "result_path": "Download Final BPMN"
            }.get(k, k)
        def is_bpmn(fname):
            return fname.endswith('.bpmn')
        def is_text(fname):
            return fname.endswith('.txt') or fname.endswith('.json') or fname.endswith('.xml')
        html = f"""
        <html><head><title>Job Outputs for {job_id}</title>
        <link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'>
        <style>
        body {{ font-family: sans-serif; }}
        .modal-bg {{ position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.25);z-index:1000;display:flex;align-items:center;justify-content:center; }}
        .modal-content {{ background:#fff;border-radius:10px;padding:24px;min-width:320px;max-width:900px;max-height:90vh;overflow-y:auto;box-shadow:0 2px 16px #0002; }}
        .bpmn-viewer {{ width:800px;height:500px;background:#f6f8fa;border-radius:8px; }}
        .close-btn {{ background:#10a37f;color:#fff;border:none;border-radius:6px;padding:8px 18px;font-weight:500;cursor:pointer;margin-top:18px;float:right; }}
        .view-link {{ color:#10a37f;text-decoration:underline;font-weight:500;cursor:pointer; }}
        </style>
        <script src="https://unpkg.com/bpmn-js@11.5.0/dist/bpmn-viewer.development.js"></script>
        </head><body>
        <h2>Job Status: <span style='color:{'green' if status=='completed' else 'orange' if status=='processing' else 'red'}'>{status}</span></h2>
        <button onclick='window.location.reload()'>Refresh</button>
        <h3>Source File:</h3>
        <ul><li><b>{source_file}</b>
          <ul>
        """
        for k, v in outputs.items():
            fname = os.path.basename(v)
            label = output_label(k)
            if is_bpmn(fname):
                html += f"<li>{label} ({fname}) <span class='view-link' onclick=\"viewBpmn('/download/{job_id}/{k.replace('_path','')}','{fname}')\">[View]</span></li>"
            elif is_text(fname):
                html += f"<li>{label} ({fname}) <span class='view-link' onclick=\"viewText('/download/{job_id}/{k.replace('_path','')}','{fname}')\">[View]</span></li>"
            else:
                html += f"<li>{label} ({fname}) <a href='/download/{job_id}/{k.replace('_path','')}' target='_blank'>[Download]</a></li>"
        html += "</ul></li></ul>"
        html += """
        <div id='modal-bg' class='modal-bg' style='display:none' onclick='closeModal()'>
          <div id='modal-content' class='modal-content' onclick='event.stopPropagation()'>
            <div id='modal-title' style='font-weight:600;margin-bottom:12px'></div>
            <div id='modal-body'></div>
            <button class='close-btn' onclick='closeModal()'>Close</button>
          </div>
        </div>
        <script>
        function closeModal() {
          document.getElementById('modal-bg').style.display = 'none';
          document.getElementById('modal-title').innerHTML = '';
          document.getElementById('modal-body').innerHTML = '';
        }
        function viewText(url, fname) {
          fetch(url).then(r=>r.text()).then(txt=>{
            document.getElementById('modal-title').innerText = fname;
            let body = document.getElementById('modal-body');
            if(fname.endsWith('.json')) {
              try { txt = JSON.stringify(JSON.parse(txt), null, 2); } catch(e){}
            }
            body.innerHTML = `<pre style='white-space:pre-wrap;text-align:left;background:#f6f8fa;padding:16px;border-radius:8px;font-size:14px;'>${txt.replace(/</g,'&lt;')}</pre>`;
            document.getElementById('modal-bg').style.display = 'flex';
          });
        }
        function viewBpmn(url, fname) {
          fetch(url).then(r=>r.text()).then(xml=>{
            document.getElementById('modal-title').innerText = fname;
            document.getElementById('modal-body').innerHTML = `<div id='bpmn-viewer' class='bpmn-viewer'></div>`;
            document.getElementById('modal-bg').style.display = 'flex';
            setTimeout(()=>{
              var viewer = new window.BpmnJS({ container: '#bpmn-viewer' });
              viewer.importXML(xml).then(()=>{
                viewer.get('canvas').zoom('fit-viewport');
              });
            }, 100);
          });
        }
        </script>
        </body></html>
        """
        return HTMLResponse(html)
    # Default: JSON for API
    return {"outputs": outputs, "status": status}

@app.get("/results_structure")
def results_structure():
    structure = list_results_structure()
    # List all input files in S3 (excluding results/)
    response = s3.list_objects_v2(Bucket=S3_BUCKET)
    files = response.get("Contents", [])
    input_files = []
    for obj in files:
        key = obj["Key"]
        if key.startswith("results/") or key.endswith("/"):
            continue
        input_files.append(key)
    return {"results": structure, "input_files": input_files}

@app.get("/results/{input_key:path}/{output_name}")
def serve_result_file(input_key: str, output_name: str):
    # input_key is the S3 key (may contain slashes)
    # output_name is the file name
    local_path = os.path.join(RESULT_DIR, input_key, output_name)
    if not os.path.exists(local_path):
        # Try to fetch from S3
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        downloaded = download_output_from_s3(input_key, output_name, local_path)
        if downloaded and os.path.exists(local_path):
            return FileResponse(local_path, filename=output_name)
        # Try the flat file fallback (for legacy)
        flat_path = os.path.join(RESULT_DIR, f"{input_key.replace('/', '_')}_{output_name}")
        if os.path.exists(flat_path):
            return FileResponse(flat_path, filename=output_name)
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(local_path, filename=output_name)



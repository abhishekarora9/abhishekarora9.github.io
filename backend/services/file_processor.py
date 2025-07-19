import os
import threading
from utils.text_extraction import extract_text_from_file, extract_text_from_s3
from utils.s3_utils import upload_output_to_s3, S3_BUCKET
from agents.bpmn_template_generator import generate_bpmn_template
from agents.bpmn_template_refiner import refine_bpmn_template
from agents.bpmn_xml_generator import generate_bpmn_xml
from agents.bpmn_xml_refiner import refine_bpmn_xml
from agents.summary_agent import generate_summary

# Global jobs storage
JOBS = {}

def process_file(job_id, s3_key):
    """Main file processing function that orchestrates all agents using S3"""
    try:
        print(f"[process_file] Starting job {job_id} for S3 key {s3_key}")
        job = JOBS.get(job_id)
        if job is not None:
            bucket = job.get("bucket")
        else:
            bucket = S3_BUCKET

        # 1. Extract text from S3
        sop_content = extract_text_from_s3(bucket, s3_key)
        print(f"[process_file] Extracted text for job {job_id}:\n{sop_content}")
        JOBS[job_id]["extracted_text"] = sop_content

        # 2. Agent 1: BPMN Template Generator
        bpmn_template = generate_bpmn_template(sop_content)
        JOBS[job_id]["bpmn_template"] = bpmn_template
        print("[process_file] Agent 1 (BPMN Template Generator) complete.")

        # 3. Agent 2: BPMN Template Refiner
        refined_template = refine_bpmn_template(sop_content, bpmn_template)
        JOBS[job_id]["refined_bpmn_template"] = refined_template
        print("[process_file] Agent 2 (BPMN Template Refiner) complete.")

        # 4. Agent 3: BPMN XML Generator
        bpmn_xml = generate_bpmn_xml(refined_template)
        JOBS[job_id]["bpmn_xml"] = bpmn_xml
        print(f"[process_file] Agent 3 (BPMN XML Generator) complete. XML length: {len(bpmn_xml) if bpmn_xml else 0} chars")

        # 5. Agent 4: BPMN XML Refiner
        final_bpmn_xml = refine_bpmn_xml(bpmn_xml)
        

        
        JOBS[job_id]["final_bpmn_xml"] = final_bpmn_xml
        print(f"[process_file] Agent 4 (BPMN XML Refiner) complete. XML length: {len(final_bpmn_xml) if final_bpmn_xml else 0} chars")

        # 6. Agent 5: Summary Agent
        summary = generate_summary(sop_content)
        JOBS[job_id]["summary"] = summary
        print("[process_file] Agent 5 (Summary) complete.")

        # 7. Save all outputs to files
        save_outputs(job_id, s3_key, sop_content, bpmn_template, refined_template, bpmn_xml, final_bpmn_xml, summary)

        # 8. Mark job as completed
        JOBS[job_id]["status"] = "completed"
        print(f"[process_file] Job {job_id} completed successfully.")

    except Exception as e:
        print(f"[process_file] Error processing job {job_id}: {e}")
        JOBS[job_id]["status"] = "failed"
        JOBS[job_id]["error"] = str(e)

def save_outputs(job_id, s3_key, sop_content, bpmn_template, refined_template, bpmn_xml, final_bpmn_xml, summary):
    """Save all intermediate outputs to S3 only"""
    outputs = [
        ("extracted_text", sop_content or "", "txt"),
        ("bpmn_template", bpmn_template or "", "json"),
        ("refined_bpmn_template", refined_template or "", "json"),
        ("bpmn_xml", bpmn_xml or "", "xml"),
        ("final_bpmn_xml", final_bpmn_xml or "", "bpmn"),
        ("summary", summary or "", "txt")
    ]

    for output_name, content, ext in outputs:
        # Create temporary file for S3 upload
        temp_file_path = os.path.join("/tmp", f"{job_id}_{output_name}.{ext}")
        with open(temp_file_path, "w") as f:
            f.write(content)
        
        # Upload to S3
        if s3_key:
            upload_output_to_s3(temp_file_path, s3_key, f"{output_name}.{ext}")
        
        # Store S3 reference in job (not local path)
        JOBS[job_id][f"{output_name}_s3_key"] = f"results/{s3_key}/{output_name}.{ext}"
        
        # Clean up temp file
        os.remove(temp_file_path)

    # Save final result to S3
    temp_result_path = os.path.join("/tmp", f"{job_id}.bpmn.xml")
    with open(temp_result_path, "w") as f:
        f.write(final_bpmn_xml or "")
    
    if s3_key:
        upload_output_to_s3(temp_result_path, s3_key, "result.bpmn.xml")
    
    JOBS[job_id]["result_s3_key"] = f"results/{s3_key}/result.bpmn.xml"
    
    # Clean up temp file
    os.remove(temp_result_path)

def start_processing(job_id, s3_key, bucket=None, original_s3_key=None):
    """Start file processing in a background thread using S3"""
    JOBS[job_id] = {
        "status": "processing", 
        "s3_key": s3_key, 
        "bucket": bucket or S3_BUCKET
    }
    threading.Thread(target=process_file, args=(job_id, s3_key)).start()

def get_job_status(job_id):
    """Get the status of a job"""
    return JOBS.get(job_id)

def get_job(job_id):
    """Get a job by ID"""
    return JOBS.get(job_id) 
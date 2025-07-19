from utils.text_extraction import extract_text_from_s3
from utils.llm_utils import call_llm

def chat_with_file(job_id, prompt, job_data):
    """Handle chat interactions with processed files using S3"""
    if not job_data or "s3_key" not in job_data:
        return {"error": "Job not found"}
    
    # Extract text from S3 for context
    bucket = job_data.get("bucket")
    s3_key = job_data.get("s3_key")
    
    context = extract_text_from_s3(bucket, s3_key)
    
    # Handle special commands
    if prompt.strip().lower() == "show me the extracted text only.":
        return {"response": context}
    
    if prompt.strip().lower() == "summarize the sop":
        summary = job_data.get("summary", "No summary available.")
        return {"response": summary}
    
    # Structure the prompt for OpenAI
    full_prompt = f"Given the following extracted SOP text:\n{context}\n\nUser prompt: {prompt}\n\nPlease answer based on the SOP."
    response = call_llm(full_prompt)
    return {"response": response} 
import os
import time
import boto3
import pdfplumber

# Configure AWS clients
textract = boto3.client('textract', region_name=os.getenv('AWS_DEFAULT_REGION'))

def extract_text_from_s3(bucket, key):
    """Extract text from image files using AWS Textract"""
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
    """Extract text from PDF files using pdfplumber"""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    print("Extracted PDF text:", repr(text.strip()))
    return text.strip() or "(No text found in PDF)"

def extract_text_from_docx(file_path):
    """Extract text from DOCX files (placeholder implementation)"""
    # TODO: Implement DOCX text extraction logic
    return "Extracted text from DOCX"

def extract_text_from_file(file_path, bucket=None, s3_key=None):
    """Extract text from file based on its extension"""
    if file_path.endswith('.pdf'):
        return extract_text_from_pdf(file_path)
    elif file_path.endswith('.jpg') or file_path.endswith('.png'):
        if bucket and s3_key:
            return extract_text_from_s3(bucket, s3_key)
        else:
            return "S3 info missing for image file"
    elif file_path.endswith('.docx'):
        return extract_text_from_docx(file_path)
    else:
        return "Unsupported file type" 
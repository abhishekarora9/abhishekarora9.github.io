import os
import json
import boto3
from datetime import datetime

# Configure S3 client
s3 = boto3.client('s3')
S3_BUCKET = os.getenv("AWS_S3_BUCKET")

def upload_to_s3(file_path, bucket, key):
    """Upload a file to S3"""
    s3.upload_file(file_path, bucket, key)

def upload_output_to_s3(local_path, s3_input_key, output_name):
    """Upload output file to S3 with organized structure"""
    s3_key = f"results/{s3_input_key}/{output_name}"
    s3.upload_file(local_path, S3_BUCKET, s3_key)
    return s3_key

def download_output_from_s3(s3_input_key, output_name, local_path):
    """Download output file from S3"""
    s3_key = f"results/{s3_input_key}/{output_name}"
    try:
        s3.download_file(S3_BUCKET, s3_key, local_path)
        return True
    except Exception:
        return False

def get_s3_file_metadata(s3_key):
    """Get metadata for a specific S3 file"""
    try:
        response = s3.head_object(Bucket=S3_BUCKET, Key=s3_key)
        return {
            "last_modified": response.get("LastModified"),
            "size": response.get("ContentLength"),
            "etag": response.get("ETag")
        }
    except Exception as e:
        print(f"[get_s3_file_metadata] Error getting metadata for {s3_key}: {e}")
        return None

def list_results_structure():
    """List all results in S3 under results/ with timestamps"""
    response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix="results/")
    files = response.get("Contents", [])
    structure = {}
    timestamps = {}
    
    for obj in files:
        key = obj["Key"]
        if key.endswith("/"):
            continue
        parts = key.split("/", 2)
        if len(parts) < 3:
            continue
        _, input_s3_key, output_name = parts
        
        # Store file list
        if input_s3_key not in structure:
            structure[input_s3_key] = []
        structure[input_s3_key].append(output_name)
        
        # Store timestamp information
        if input_s3_key not in timestamps:
            timestamps[input_s3_key] = {
                "last_modified": None,
                "files_count": 0,
                "latest_file": None
            }
        
        # Update timestamp info
        file_timestamp = obj.get("LastModified")
        if file_timestamp:
            if timestamps[input_s3_key]["last_modified"] is None or file_timestamp > timestamps[input_s3_key]["last_modified"]:
                timestamps[input_s3_key]["last_modified"] = file_timestamp
                timestamps[input_s3_key]["latest_file"] = output_name
            timestamps[input_s3_key]["files_count"] += 1
    
    return structure, timestamps

def list_s3_files():
    """List all files in S3 bucket, excluding auth files"""
    try:
        if not S3_BUCKET:
            return {"error": "S3_BUCKET not configured"}
        response = s3.list_objects_v2(Bucket=S3_BUCKET)
        files = [obj["Key"] for obj in response.get("Contents", [])]
        
        # Filter out auth files
        filtered_files = [file for file in files if not file.startswith("auth/")]
        
        return {"files": filtered_files}
    except Exception as e:
        print(f"[list_s3_files] Error: {e}")
        return {"error": str(e)} 
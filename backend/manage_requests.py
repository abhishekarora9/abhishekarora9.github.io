#!/usr/bin/env python3
"""
Utility script to manage access requests.
Usage: python manage_requests.py <command> [options]
"""

import json
import boto3
import sys
from datetime import datetime
from config import S3_BUCKET

def get_access_requests():
    """Fetch access requests from S3"""
    try:
        s3_client = boto3.client('s3')
        response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/access_requests.json')
        requests_data = json.loads(response['Body'].read().decode('utf-8'))
        return requests_data.get('requests', [])
    except Exception as e:
        print(f"Error fetching access requests: {e}")
        return []

def save_access_requests(requests_list):
    """Save access requests to S3"""
    try:
        s3_client = boto3.client('s3')
        requests_data = {"requests": requests_list}
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/access_requests.json',
            Body=json.dumps(requests_data, indent=2),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error saving access requests: {e}")
        return False

def get_allowed_users():
    """Fetch allowed users from S3"""
    try:
        s3_client = boto3.client('s3')
        response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
        users_data = json.loads(response['Body'].read().decode('utf-8'))
        return users_data.get('users', [])
    except Exception as e:
        print(f"Error fetching allowed users: {e}")
        return []

def save_allowed_users(users_list):
    """Save allowed users to S3"""
    try:
        s3_client = boto3.client('s3')
        users_data = {"users": users_list}
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(users_data, indent=2),
            ContentType='application/json'
        )
        return True
    except Exception as e:
        print(f"Error saving allowed users: {e}")
        return False

def list_requests():
    """List all access requests"""
    requests = get_access_requests()
    
    if not requests:
        print("No access requests found.")
        return
    
    print(f"Total requests: {len(requests)}")
    print("\nAccess Requests:")
    print("-" * 80)
    
    for i, request in enumerate(requests, 1):
        status = request.get('status', 'unknown')
        status_color = {
            'pending': '\033[93m',  # Yellow
            'approved': '\033[92m',  # Green
            'rejected': '\033[91m'   # Red
        }.get(status, '\033[0m')
        
        print(f"{i}. ADS ID: {request.get('ads_id')}")
        print(f"   Status: {status_color}{status}\033[0m")
        print(f"   Requested: {request.get('requested_at')}")
        
        if status == 'approved' and request.get('approved_at'):
            print(f"   Approved: {request.get('approved_at')}")
            print(f"   By: {request.get('approved_by')}")
        elif status == 'rejected' and request.get('rejected_at'):
            print(f"   Rejected: {request.get('rejected_at')}")
            print(f"   By: {request.get('rejected_by')}")
        
        print()

def approve_request(ads_id):
    """Approve an access request"""
    requests = get_access_requests()
    target_request = None
    
    for request in requests:
        if request.get('ads_id') == ads_id and request.get('status') == 'pending':
            target_request = request
            break
    
    if not target_request:
        print(f"Error: No pending request found for ADS ID '{ads_id}'")
        return False
    
    # Add user to allowed users
    allowed_users = get_allowed_users()
    new_user = {
        "ads_id": target_request['ads_id'],
        "password": target_request['password'],
        "role": "user",
        "created_at": datetime.now().isoformat()
    }
    
    allowed_users.append(new_user)
    
    if not save_allowed_users(allowed_users):
        print("Error: Failed to save allowed users")
        return False
    
    # Update request status
    for request in requests:
        if request.get('ads_id') == ads_id:
            request['status'] = 'approved'
            request['approved_at'] = datetime.now().isoformat()
            request['approved_by'] = 'admin'
            break
    
    if not save_access_requests(requests):
        print("Error: Failed to update request status")
        return False
    
    print(f"Successfully approved access request for {ads_id}")
    return True

def reject_request(ads_id):
    """Reject an access request"""
    requests = get_access_requests()
    
    for request in requests:
        if request.get('ads_id') == ads_id and request.get('status') == 'pending':
            request['status'] = 'rejected'
            request['rejected_at'] = datetime.now().isoformat()
            request['rejected_by'] = 'admin'
            break
    else:
        print(f"Error: No pending request found for ADS ID '{ads_id}'")
        return False
    
    if not save_access_requests(requests):
        print("Error: Failed to update request status")
        return False
    
    print(f"Successfully rejected access request for {ads_id}")
    return True

def delete_request(ads_id):
    """Delete an access request"""
    requests = get_access_requests()
    
    original_count = len(requests)
    requests = [req for req in requests if req.get('ads_id') != ads_id]
    
    if len(requests) == original_count:
        print(f"Error: No request found for ADS ID '{ads_id}'")
        return False
    
    if not save_access_requests(requests):
        print("Error: Failed to delete request")
        return False
    
    print(f"Successfully deleted access request for {ads_id}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python manage_requests.py <command> [options]")
        print("\nCommands:")
        print("  list                    - List all access requests")
        print("  approve <ads_id>        - Approve an access request")
        print("  reject <ads_id>         - Reject an access request")
        print("  delete <ads_id>         - Delete an access request")
        print("\nExamples:")
        print("  python manage_requests.py list")
        print("  python manage_requests.py approve john.doe")
        print("  python manage_requests.py reject jane.smith")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_requests()
    elif command == "approve":
        if len(sys.argv) < 3:
            print("Error: Missing ADS ID")
            print("Usage: python manage_requests.py approve <ads_id>")
            sys.exit(1)
        approve_request(sys.argv[2])
    elif command == "reject":
        if len(sys.argv) < 3:
            print("Error: Missing ADS ID")
            print("Usage: python manage_requests.py reject <ads_id>")
            sys.exit(1)
        reject_request(sys.argv[2])
    elif command == "delete":
        if len(sys.argv) < 3:
            print("Error: Missing ADS ID")
            print("Usage: python manage_requests.py delete <ads_id>")
            sys.exit(1)
        delete_request(sys.argv[2])
    else:
        print(f"Unknown command: {command}")
        print("Use 'list', 'approve', 'reject', or 'delete'")
        sys.exit(1) 
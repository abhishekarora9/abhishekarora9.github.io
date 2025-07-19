#!/usr/bin/env python3
"""
Script to add a test user to the S3 authentication system
"""

import boto3
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_test_user():
    """Add a test user to the S3 authentication system"""
    
    # Get S3 bucket from environment
    S3_BUCKET = os.getenv("AWS_S3_BUCKET")
    if not S3_BUCKET:
        print("Error: AWS_S3_BUCKET environment variable not set")
        return
    
    # Test user credentials
    test_user = {
        "ads_id": "testuser",
        "password": "testpass123",
        "role": "admin",
        "created_at": datetime.now().isoformat()
    }
    
    try:
        # Initialize S3 client
        s3_client = boto3.client('s3')
        
        # Check if auth file exists
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
            users_data = json.loads(response['Body'].read().decode('utf-8'))
            users = users_data.get('users', [])
            print(f"Found {len(users)} existing users")
        except:
            # Create new auth file
            users = []
            print("Creating new auth file")
        
        # Check if test user already exists
        for user in users:
            if user.get('ads_id') == test_user['ads_id']:
                print(f"User {test_user['ads_id']} already exists")
                return
        
        # Add test user
        users.append(test_user)
        
        # Save to S3
        users_data = {"users": users}
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(users_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Successfully added test user: {test_user['ads_id']}")
        print(f"Password: {test_user['password']}")
        print(f"Role: {test_user['role']}")
        
    except Exception as e:
        print(f"Error adding test user: {e}")

if __name__ == "__main__":
    add_test_user() 
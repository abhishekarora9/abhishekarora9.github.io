#!/usr/bin/env python3
"""
Utility script to clean up the S3 authentication file.
"""

import json
import boto3
from config import S3_BUCKET

def clean_auth_file():
    """Clean up the auth file by removing invalid entries"""
    try:
        s3_client = boto3.client('s3')
        
        # Get current users
        response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
        users_data = json.loads(response['Body'].read().decode('utf-8'))
        
        # Filter out invalid entries (None ads_id)
        valid_users = []
        for user in users_data["users"]:
            if user.get("ads_id") is not None and user.get("ads_id") != "None":
                valid_users.append(user)
        
        # Create cleaned data
        cleaned_data = {"users": valid_users}
        
        # Upload cleaned file to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(cleaned_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Cleaned auth file. Removed {len(users_data['users']) - len(valid_users)} invalid entries.")
        print(f"Remaining users: {len(valid_users)}")
        
        # List remaining users
        for i, user in enumerate(valid_users, 1):
            print(f"{i}. ADS ID: {user.get('ads_id')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Created: {user.get('created_at')}")
            print()
            
    except Exception as e:
        print(f"Error cleaning auth file: {e}")

if __name__ == "__main__":
    clean_auth_file() 
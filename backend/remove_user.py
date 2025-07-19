#!/usr/bin/env python3
"""
Utility script to remove users from the S3 authentication file.
Usage: python remove_user.py <ads_id>
"""

import json
import boto3
import sys
from config import S3_BUCKET

def remove_user_from_s3(ads_id: str):
    """Remove a user from the S3 auth file"""
    try:
        s3_client = boto3.client('s3')
        
        # Get existing users
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
            users_data = json.loads(response['Body'].read().decode('utf-8'))
        except:
            print("No users file found!")
            return False
        
        # Find and remove user
        original_count = len(users_data["users"])
        users_data["users"] = [user for user in users_data["users"] if user.get("ads_id") != ads_id]
        new_count = len(users_data["users"])
        
        if new_count == original_count:
            print(f"User with ADS ID '{ads_id}' not found!")
            return False
        
        # Upload updated file to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(users_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Successfully removed user with ADS ID: {ads_id}")
        return True
        
    except Exception as e:
        print(f"Error removing user: {e}")
        return False

def list_users():
    """List all users in the S3 auth file"""
    try:
        s3_client = boto3.client('s3')
        response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
        users_data = json.loads(response['Body'].read().decode('utf-8'))
        
        print(f"Total users: {len(users_data['users'])}")
        print("\nUsers:")
        for i, user in enumerate(users_data["users"], 1):
            print(f"{i}. ADS ID: {user.get('ads_id')}")
            print(f"   Role: {user.get('role')}")
            print(f"   Created: {user.get('created_at')}")
            print()
            
    except Exception as e:
        print(f"Error listing users: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_user.py <ads_id>")
        print("       python remove_user.py --list")
        print("\nExamples:")
        print("  python remove_user.py testuser")
        print("  python remove_user.py admin")
        print("  python remove_user.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    else:
        ads_id = sys.argv[1]
        remove_user_from_s3(ads_id) 
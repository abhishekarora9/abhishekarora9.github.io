#!/usr/bin/env python3
"""
Utility script to add users to the S3 authentication file.
Usage: python add_user.py <ads_id> <password> [role]
"""

import json
import boto3
import sys
from datetime import datetime
from config import S3_BUCKET

def add_user_to_s3(ads_id: str, password: str, role: str = "user"):
    """Add a new user to the S3 auth file"""
    try:
        s3_client = boto3.client('s3')
        
        # Try to get existing users
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
            users_data = json.loads(response['Body'].read().decode('utf-8'))
        except:
            # File doesn't exist, create new structure
            users_data = {"users": []}
        
        # Check if user already exists
        for user in users_data["users"]:
            if user.get("ads_id") == ads_id:
                print(f"User with ADS ID '{ads_id}' already exists!")
                return False
        
        # Add new user
        new_user = {
            "ads_id": ads_id,
            "password": password,
            "role": role,
            "created_at": datetime.now().isoformat()
        }
        
        users_data["users"].append(new_user)
        
        # Upload updated file to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(users_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Successfully added user with ADS ID: {ads_id}")
        print(f"Role: {role}")
        print(f"Created at: {new_user['created_at']}")
        return True
        
    except Exception as e:
        print(f"Error adding user: {e}")
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
        print("Usage: python add_user.py <ads_id> <password> [role]")
        print("       python add_user.py --list")
        print("\nExamples:")
        print("  python add_user.py john.doe mypassword123")
        print("  python add_user.py admin admin123 admin")
        print("  python add_user.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    elif len(sys.argv) < 3:
        print("Error: Missing password argument")
        print("Usage: python add_user.py <ads_id> <password> [role]")
        sys.exit(1)
    else:
        ads_id = sys.argv[1]
        password = sys.argv[2]
        role = sys.argv[3] if len(sys.argv) > 3 else "user"
        
        add_user_to_s3(ads_id, password, role) 
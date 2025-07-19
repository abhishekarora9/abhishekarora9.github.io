#!/usr/bin/env python3
"""
Utility script to update user roles in the S3 authentication file.
Usage: python update_user_role.py <ads_id> <new_role>
"""

import json
import boto3
import sys
from config import S3_BUCKET

def update_user_role(ads_id: str, new_role: str):
    """Update a user's role in the S3 auth file"""
    try:
        s3_client = boto3.client('s3')
        
        # Get existing users
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key='auth/allowed_users.json')
            users_data = json.loads(response['Body'].read().decode('utf-8'))
        except:
            print("No users file found!")
            return False
        
        # Find and update user
        user_found = False
        for user in users_data["users"]:
            if user.get("ads_id") == ads_id:
                old_role = user.get("role", "user")
                user["role"] = new_role
                user_found = True
                print(f"Updated user '{ads_id}' role from '{old_role}' to '{new_role}'")
                break
        
        if not user_found:
            print(f"User with ADS ID '{ads_id}' not found!")
            return False
        
        # Upload updated file to S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key='auth/allowed_users.json',
            Body=json.dumps(users_data, indent=2),
            ContentType='application/json'
        )
        
        print(f"Successfully updated user role in S3")
        return True
        
    except Exception as e:
        print(f"Error updating user role: {e}")
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
        print("Usage: python update_user_role.py <ads_id> <new_role>")
        print("       python update_user_role.py --list")
        print("\nExamples:")
        print("  python update_user_role.py aaror226 admin")
        print("  python update_user_role.py test1 user")
        print("  python update_user_role.py --list")
        sys.exit(1)
    
    if sys.argv[1] == "--list":
        list_users()
    elif len(sys.argv) < 3:
        print("Error: Missing new role argument")
        print("Usage: python update_user_role.py <ads_id> <new_role>")
        sys.exit(1)
    else:
        ads_id = sys.argv[1]
        new_role = sys.argv[2]
        update_user_role(ads_id, new_role) 
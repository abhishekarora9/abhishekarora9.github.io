#!/bin/bash

echo "🔧 AWS Setup for Elastic Beanstalk Deployment"
echo "============================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install awscli
    else
        echo "❌ Homebrew not found. Please install AWS CLI manually:"
        echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
fi

echo "✅ AWS CLI installed"

# Configure AWS credentials
echo ""
echo "🔑 Configuring AWS Credentials..."
echo "You'll need your AWS Access Key ID and Secret Access Key"
echo ""

read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "Enter your AWS Region (e.g., us-east-1): " AWS_REGION

# Configure AWS CLI
aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID"
aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY"
aws configure set default.region "$AWS_REGION"

echo ""
echo "✅ AWS credentials configured"

# Test AWS access
echo ""
echo "🧪 Testing AWS access..."
aws sts get-caller-identity

echo ""
echo "🔍 Checking Elastic Beanstalk permissions..."
aws elasticbeanstalk describe-applications 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Elastic Beanstalk access confirmed"
else
    echo "❌ Elastic Beanstalk access denied"
    echo ""
    echo "🔧 To fix this, you need to:"
    echo "1. Go to AWS Console → IAM → Users"
    echo "2. Find your user and click 'Add permissions'"
    echo "3. Attach policy: 'AWSElasticBeanstalkFullAccess'"
    echo "4. Or create a new user with Elastic Beanstalk permissions"
    echo ""
    echo "Alternative: Use a different deployment method"
    exit 1
fi

echo ""
echo "🚀 Ready to deploy! Run: ./deploy.sh" 
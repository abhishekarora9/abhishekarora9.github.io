#!/bin/bash

echo "🚀 Starting AWS Elastic Beanstalk Deployment for SOP-to-BPMN Backend"
echo "================================================================"

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI not found. Installing..."
    pip install awsebcli
fi

# Check if .elasticbeanstalk directory exists
if [ ! -d ".elasticbeanstalk" ]; then
    echo "📝 Initializing EB application..."
    echo "Please select the following options when prompted:"
    echo "1. Region: us-east-1 (US East N. Virginia)"
    echo "2. Application name: sop-to-bpmn-backend"
    echo "3. Platform: Python"
    echo "4. Platform version: Python 3.9 or 3.10"
    echo "5. SSH: Y (for debugging access)"
    echo "6. Keypair: Create new or use existing"
    echo ""
    read -p "Press Enter to continue with eb init..."
    eb init
fi

# Check if environment exists
if ! eb status &> /dev/null; then
    echo "🌍 Creating EB environment..."
    eb create sop-to-bpmn-production
else
    echo "✅ Environment already exists"
fi

echo ""
echo "🔧 Setting up environment variables..."
echo "Please provide the following values:"
echo ""

read -p "Enter your OpenAI API Key: " OPENAI_API_KEY
read -p "Enter your AWS S3 Bucket name: " AWS_S3_BUCKET
read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "Enter your JWT Secret Key: " JWT_SECRET_KEY

echo ""
echo "⚙️ Setting environment variables..."

eb setenv OPENAI_API_KEY="$OPENAI_API_KEY"
eb setenv AWS_S3_BUCKET="$AWS_S3_BUCKET"
eb setenv AWS_DEFAULT_REGION="us-east-1"
eb setenv AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
eb setenv AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
eb setenv JWT_SECRET_KEY="$JWT_SECRET_KEY"

echo ""
echo "🚀 Deploying application..."
eb deploy

echo ""
echo "✅ Deployment complete!"
echo "🌐 Your API URL:"
eb status

echo ""
echo "🔍 To check logs: eb logs"
echo "🔍 To open in browser: eb open"
echo "🔍 To SSH into instance: eb ssh" 
# 🚀 Quick AWS Deployment Guide

## **Option 1: Automated Deployment (Recommended)**

Run the automated deployment script:
```bash
./deploy.sh
```

This script will:
- ✅ Initialize EB application
- ✅ Create environment
- ✅ Set environment variables
- ✅ Deploy your application

---

## **Option 2: Manual Step-by-Step**

### **Step 1: Initialize EB Application**
```bash
eb init
```

**Select these options:**
- **Region**: `1) us-east-1` (US East N. Virginia)
- **Application name**: `sop-to-bpmn-backend`
- **Platform**: `Python`
- **Platform version**: `Python 3.9` or `3.10`
- **SSH**: `Y` (for debugging)
- **Keypair**: Create new or use existing

### **Step 2: Create Environment**
```bash
eb create sop-to-bpmn-production
```

### **Step 3: Set Environment Variables**
```bash
eb setenv OPENAI_API_KEY="your-openai-api-key"
eb setenv AWS_S3_BUCKET="your-s3-bucket-name"
eb setenv AWS_DEFAULT_REGION="us-east-1"
eb setenv JWT_SECRET_KEY="your-jwt-secret-key"
eb setenv AWS_ACCESS_KEY_ID="your-aws-access-key"
eb setenv AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### **Step 4: Deploy**
```bash
eb deploy
```

### **Step 5: Get Your URL**
```bash
eb status
```

---

## **🔧 Required Environment Variables**

You'll need these values:

1. **OpenAI API Key**: `sk-...` (from OpenAI dashboard)
2. **AWS S3 Bucket**: Your S3 bucket name
3. **AWS Access Key ID**: Your AWS access key
4. **AWS Secret Access Key**: Your AWS secret key
5. **JWT Secret Key**: Any random string for JWT signing

---

## **🌐 After Deployment**

Your API will be available at:
`http://your-app-name.us-east-1.elasticbeanstalk.com`

### **Useful Commands:**
- `eb status` - Check deployment status
- `eb logs` - View application logs
- `eb open` - Open in browser
- `eb ssh` - SSH into instance

---

## **🔒 Security Notes**

- ✅ Environment variables are encrypted in AWS
- ✅ Never commit API keys to Git
- ✅ Use IAM roles instead of access keys when possible
- ✅ Enable HTTPS for production

---

## **💰 Cost Estimate**

- **t3.micro**: ~$8-10/month
- **t3.small**: ~$16-20/month

---

## **🚨 Troubleshooting**

### **Common Issues:**

1. **Port Issues**: Ensure app listens on `0.0.0.0:8000`
2. **Dependencies**: All packages are in `requirements.txt`
3. **Environment Variables**: Check for typos
4. **CORS**: Update CORS_ORIGINS if needed

### **Check Logs:**
```bash
eb logs
eb logs --all
``` 
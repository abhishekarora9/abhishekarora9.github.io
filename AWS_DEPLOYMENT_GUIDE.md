# AWS Deployment Guide for SOP-to-BPMN Backend

## 🚀 **Option 1: AWS Elastic Beanstalk (Recommended)**

### **Prerequisites:**
1. AWS Account
2. AWS CLI installed and configured
3. EB CLI installed: `pip install awsebcli`

### **Step 1: Prepare Your Application**

Your backend is already prepared with:
- ✅ `requirements.txt` - Python dependencies
- ✅ `Procfile` - Application startup command
- ✅ `.ebextensions/` - Configuration files

### **Step 2: Initialize EB Application**

```bash
cd backend
eb init
```

**Follow the prompts:**
- Select your region (e.g., us-east-1)
- Create new application: `sop-to-bpmn-backend`
- Select Python platform
- Choose "Create new keypair" or use existing
- Select "y" for SSH access

### **Step 3: Create Environment**

```bash
eb create sop-to-bpmn-production
```

This will:
- Create an EC2 instance
- Set up load balancer
- Configure security groups
- Deploy your application

### **Step 4: Set Environment Variables**

```bash
eb setenv OPENAI_API_KEY="your-openai-api-key"
eb setenv AWS_S3_BUCKET="your-s3-bucket-name"
eb setenv AWS_DEFAULT_REGION="us-east-1"
eb setenv JWT_SECRET_KEY="your-jwt-secret-key"
eb setenv AWS_ACCESS_KEY_ID="your-aws-access-key"
eb setenv AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
```

### **Step 5: Deploy**

```bash
eb deploy
```

### **Step 6: Get Your URL**

```bash
eb status
```

Your API will be available at: `http://your-app-name.region.elasticbeanstalk.com`

---

## 🐳 **Option 2: AWS ECS with Docker**

### **Step 1: Create Dockerfile**

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Step 2: Build and Push to ECR**

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account-id.dkr.ecr.us-east-1.amazonaws.com

docker build -t sop-to-bpmn-backend .
docker tag sop-to-bpmn-backend:latest your-account-id.dkr.ecr.us-east-1.amazonaws.com/sop-to-bpmn-backend:latest
docker push your-account-id.dkr.ecr.us-east-1.amazonaws.com/sop-to-bpmn-backend:latest
```

### **Step 3: Deploy to ECS**

Use AWS Console or create task definition and service.

---

## ☁️ **Option 3: AWS Lambda with API Gateway**

### **Step 1: Install Mangum**

```bash
pip install mangum
```

### **Step 2: Update main.py**

```python
from mangum import Mangum

# Add at the end of main.py
handler = Mangum(app)
```

### **Step 3: Create deployment package**

```bash
pip install -r requirements.txt -t package/
cp *.py package/
cd package
zip -r ../lambda-deployment.zip .
```

### **Step 4: Deploy to Lambda**

Upload the zip file to AWS Lambda and configure API Gateway.

---

## 🔧 **Environment Variables Setup**

### **Required Variables:**
```bash
OPENAI_API_KEY=sk-your-openai-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_DEFAULT_REGION=us-east-1
JWT_SECRET_KEY=your-secret-key
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### **Optional Variables:**
```bash
CORS_ORIGINS=https://abhishekarora9.github.io
```

---

## 🔒 **Security Best Practices**

### **1. IAM Roles (Recommended)**
Instead of using AWS access keys, create an IAM role:
- Go to IAM Console
- Create role for EC2/ECS/Lambda
- Attach policies: `AmazonS3FullAccess`, `CloudWatchLogsFullAccess`

### **2. Environment Variables**
- Never commit secrets to Git
- Use AWS Systems Manager Parameter Store
- Use AWS Secrets Manager for sensitive data

### **3. VPC Configuration**
- Deploy in private subnets
- Use security groups to restrict access
- Enable VPC endpoints for AWS services

---

## 📊 **Monitoring and Logging**

### **CloudWatch Logs**
Your application logs will automatically go to CloudWatch.

### **Health Checks**
Add health check endpoint:

```python
@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

---

## 🔄 **Continuous Deployment**

### **GitHub Actions Workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Deploy to Elastic Beanstalk
      run: |
        cd backend
        eb deploy
```

---

## 💰 **Cost Optimization**

### **Elastic Beanstalk:**
- Use t3.micro for development ($8-10/month)
- Use t3.small for production ($16-20/month)

### **ECS:**
- Use Fargate for serverless containers
- Use Spot instances for cost savings

### **Lambda:**
- Pay per request (very cost-effective for low traffic)

---

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **Port Issues:**
   - Ensure your app listens on `0.0.0.0:8000`
   - Check security group allows port 80/443

2. **Environment Variables:**
   - Verify all required variables are set
   - Check for typos in variable names

3. **Dependencies:**
   - Ensure all packages are in `requirements.txt`
   - Check for platform-specific packages

4. **CORS Issues:**
   - Update CORS_ORIGINS to include your frontend URL
   - Test with browser developer tools

### **Logs:**
```bash
eb logs
eb logs --all
```

---

## 📞 **Support**

- AWS Documentation: https://docs.aws.amazon.com/
- Elastic Beanstalk: https://docs.aws.amazon.com/elasticbeanstalk/
- ECS: https://docs.aws.amazon.com/ecs/
- Lambda: https://docs.aws.amazon.com/lambda/ 
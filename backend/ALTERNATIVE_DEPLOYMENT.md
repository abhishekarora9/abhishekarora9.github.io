# 🚀 Alternative Deployment Methods

Since you're having AWS permissions issues, here are alternative deployment options:

## **Option 1: Railway (Recommended - Easiest)**

### **Step 1: Sign up for Railway**
- Go to https://railway.app/
- Sign up with GitHub
- Free tier available

### **Step 2: Deploy from GitHub**
1. Connect your GitHub repository
2. Select the `backend` folder
3. Railway will auto-detect Python
4. Set environment variables in Railway dashboard

### **Step 3: Set Environment Variables**
In Railway dashboard, add:
```
OPENAI_API_KEY=your-openai-key
AWS_S3_BUCKET=your-s3-bucket
AWS_DEFAULT_REGION=us-east-1
JWT_SECRET_KEY=your-secret
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### **Step 4: Deploy**
Railway will automatically deploy and give you a URL like:
`https://your-app-name.railway.app`

---

## **Option 2: Render (Free Tier)**

### **Step 1: Sign up for Render**
- Go to https://render.com/
- Sign up with GitHub
- Free tier available

### **Step 2: Create Web Service**
1. Connect your GitHub repository
2. Select "Web Service"
3. Choose Python environment
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### **Step 3: Set Environment Variables**
Add all required environment variables in Render dashboard.

---

## **Option 3: Heroku (Paid but Easy)**

### **Step 1: Install Heroku CLI**
```bash
brew install heroku/brew/heroku
```

### **Step 2: Login and Deploy**
```bash
cd backend
heroku login
heroku create your-app-name
heroku config:set OPENAI_API_KEY="your-key"
heroku config:set AWS_S3_BUCKET="your-bucket"
# ... set other variables
git push heroku main
```

---

## **Option 4: Fix AWS Permissions**

### **Quick Fix:**
1. Go to AWS Console → IAM → Users
2. Find your user `bpmn-backend`
3. Click "Add permissions"
4. Attach policy: `AWSElasticBeanstalkFullAccess`

### **Create New User:**
1. IAM → Users → Create user
2. Name: `eb-deploy-user`
3. Attach policy: `AdministratorAccess-AWSElasticBeanstalk`
4. Generate access keys
5. Update your credentials

---

## **Option 5: Local Development + ngrok**

### **Step 1: Install ngrok**
```bash
brew install ngrok
```

### **Step 2: Run Backend Locally**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### **Step 3: Expose with ngrok**
```bash
ngrok http 8000
```

This gives you a public URL like: `https://abc123.ngrok.io`

---

## **🔧 Environment Variables Needed**

All methods require these environment variables:

```bash
OPENAI_API_KEY=sk-your-openai-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_DEFAULT_REGION=us-east-1
JWT_SECRET_KEY=any-random-string
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

---

## **💰 Cost Comparison**

- **Railway**: Free tier (500 hours/month)
- **Render**: Free tier (750 hours/month)
- **Heroku**: $7/month (basic dyno)
- **AWS EB**: $8-20/month
- **ngrok**: Free (with limitations)

---

## **🎯 Recommendation**

**For quick deployment**: Use **Railway** or **Render**
**For production**: Fix AWS permissions and use **Elastic Beanstalk**
**For development**: Use **ngrok** with local backend 
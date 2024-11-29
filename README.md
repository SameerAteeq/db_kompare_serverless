Certainly! Here's the updated **README** that includes instructions on **how to configure AWS CLI**:

---

# AWS Serverless Framework Project (Node.js)

This is a serverless application using the **AWS Serverless Framework** with **Node.js**. Follow the steps below to run the project on your AWS account.

## How to Run the Project

### 1. Clone the Repository
Clone the project to your local machine:
```bash
git clone repo_link
cd aws-serverless-nodejs
```

### 2. Install Dependencies
Install the required Node.js packages:
```bash
npm install
```

### 3. Configure AWS CLI

To interact with AWS, you'll need to configure the **AWS CLI** with your AWS credentials. If you haven't done this already, follow the steps below:

1. **Install AWS CLI**: If you don’t have the AWS CLI installed, follow the instructions [here](https://aws.amazon.com/cli/) to install it.

2. **Configure AWS CLI**: Run the following command to configure your AWS credentials:
   ```bash
   aws configure
   ```

3. **Provide your AWS credentials** when prompted:
   - **AWS Access Key ID**: You can find this in the **IAM console** in your AWS account. If you don't have one, you’ll need to create an **IAM user** with programmatic access.
   - **AWS Secret Access Key**: This is also available in the IAM console when you create the user.
   - **Default region name**: The AWS region you want to deploy to (e.g., `us-east-1`).
   - **Default output format**: You can leave this blank or choose `json`.

   Example:
   ```bash
   AWS Access Key ID [None]: <Your-Access-Key-ID>
   AWS Secret Access Key [None]: <Your-Secret-Access-Key>
   Default region name [None]: us-east-1
   Default output format [None]: json
   ```

### 4. Configure Your Project
- Open the `serverless.yml` file.
- Update any configuration variables, such as:
  - **AWS Region**: Ensure the region matches your `aws configure` setup (e.g., `us-east-1`).
  - **DynamoDB Table Names** (if applicable).
  - **Environment Variables**: Set any environment variables your functions require.

### 5. Deploy the Project to AWS
Deploy your serverless application to AWS using the Serverless Framework:
```bash
serverless deploy
```

This will:
- Deploy your Lambda functions.
- Set up API Gateway endpoints.
- Create or update other AWS resources defined in `serverless.yml`.

### 6. Get the API URL
After deployment, you will see a URL for the **API Gateway** in the terminal output. This URL is your endpoint to test the deployed functions.

---

That's it! Your serverless application is now live on AWS.

---

# Claude AI GitHub Actions Setup Guide

This repository is configured with GitHub Actions workflows that use Claude AI via Amazon Bedrock for automated code reviews and code generation.

## Required GitHub Secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

### AWS Bedrock Configuration
- `AWS_ACCESS_KEY_ID` - Your AWS access key ID with Bedrock permissions
- `AWS_SECRET_ACCESS_KEY` - Your AWS secret access key
- `AWS_REGION` - AWS region where Bedrock is available (e.g., `us-east-1`, `us-west-2`)
- `AWS_BEDROCK_MODEL_ID` - Claude model ID (default: `anthropic.claude-3-sonnet-20240229-v1:0`)

### Available Claude Models on Bedrock
- `anthropic.claude-3-haiku-20240307-v1:0` - Fastest, most economical
- `anthropic.claude-3-sonnet-20240229-v1:0` - Balanced performance (recommended)
- `anthropic.claude-3-opus-20240229-v1:0` - Most capable, highest cost

## AWS IAM Permissions

Your AWS user/role needs the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": [
                "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
            ]
        }
    ]
}
```

## Workflow Features

### 1. Automated PR Reviews (`claude-pr-review.yml`)

**Triggers:**
- New pull requests
- PR updates (new commits)
- PR review comments

**What it does:**
- Analyzes code changes in the PR
- Provides constructive feedback using Claude AI
- Posts review comments automatically
- Focuses on code quality, security, and performance

### 2. Code Generation (`claude-code-generation.yml`)

**Triggers:**
- Issues with `claude-generate` label
- Comments with `/claude generate [description]`
- Manual workflow dispatch

**What it does:**
- Analyzes your codebase structure
- Generates code based on task description
- Creates a new branch with generated code
- Opens a pull request for review

## Usage Examples

### Code Generation via Issues
1. Create a new issue
2. Add the `claude-generate` label
3. Describe what you want to build in the issue body
4. Claude will automatically generate code and create a PR

### Code Generation via Comments
Comment on any issue: `/claude generate Add a new invoice template component with PDF export`

### Manual Code Generation
1. Go to Actions tab
2. Select "Claude AI Code Generation"
3. Click "Run workflow"
4. Enter your task description

## Workflow Customization

### Modify Model Settings
Edit the workflow files to change:
- Model selection (`AWS_BEDROCK_MODEL_ID`)
- Token limits (`max_tokens`)
- Analysis depth
- Review criteria

### Add Custom Triggers
You can modify the workflow triggers in the YAML files:
- Add more event types
- Filter by file patterns
- Add branch restrictions

## Troubleshooting

### Common Issues

**1. AWS Credentials Error**
- Verify AWS secrets are correctly set
- Check IAM permissions for Bedrock access
- Ensure the region supports Bedrock

**2. Model Access Denied**
- Request access to Claude models in AWS Bedrock console
- Verify model ID is correct for your region

**3. GitHub API Errors**
- Check that GITHUB_TOKEN has sufficient permissions
- Verify repository settings allow Actions

### Debug Workflow Runs
1. Go to Actions tab in your repository
2. Click on failed workflow run
3. Expand failed steps to see error logs
4. Check AWS CloudTrail for Bedrock API calls

## Security Considerations

- AWS credentials are stored as GitHub secrets
- Workflows only have access to repository contents
- Generated code is reviewed before merging
- All API calls are logged in CloudTrail

## Cost Management

- Monitor AWS Bedrock usage in AWS Console
- Set up billing alerts for Bedrock usage
- Consider using Claude Haiku for cost optimization
- Review and optimize prompt lengths

## Support

For issues with:
- **AWS Bedrock**: Check AWS documentation and support
- **GitHub Actions**: Review GitHub Actions documentation
- **Workflow bugs**: Create an issue in this repository

---

*Generated for Govt-billing-solution-MVP-Vasu repository*
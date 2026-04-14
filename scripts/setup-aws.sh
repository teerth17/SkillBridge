#!/bin/bash
# ============================================================
# SkillBridge — AWS Infrastructure Setup
# Run this once before your first CI/CD deployment.
#
# Prerequisites (install on your local machine):
#   - aws CLI v2          https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
#   - eksctl              https://eksctl.io/installation/
#   - kubectl             https://kubernetes.io/docs/tasks/tools/
#   - helm                https://helm.sh/docs/intro/install/
#
# Usage:
#   chmod +x scripts/setup-aws.sh
#   ./scripts/setup-aws.sh
# ============================================================

set -euo pipefail

# ─── CONFIGURE THESE ─────────────────────────────────────────
AWS_REGION="us-east-1"
CLUSTER_NAME="skillbridge-cluster"
DB_INSTANCE_ID="skillbridge-db"
DB_PASSWORD="Pteerth17@"   # Change before running
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "=============================================="
echo "SkillBridge AWS Setup"
echo "Account: $ACCOUNT_ID | Region: $AWS_REGION"
echo "=============================================="

# ─── STEP 1: EKS Cluster ─────────────────────────────────────
echo ""
echo "▶ [1/6] Creating EKS cluster (takes ~15 minutes)..."

eksctl create cluster \
  --name "$CLUSTER_NAME" \
  --region "$AWS_REGION" \
  --nodegroup-name skillbridge-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 6 \
  --managed \
  --with-oidc \
  --ssh-access=false

echo "✔ EKS cluster created."

# ─── STEP 2: AWS Load Balancer Controller ────────────────────
echo ""
echo "▶ [2/6] Installing AWS Load Balancer Controller..."

# Create IAM policy for the controller
curl -fsSL -o /tmp/iam-policy.json \
  https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.1/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file:///tmp/iam-policy.json \
  --no-cli-pager 2>/dev/null || echo "  (policy already exists, continuing)"

# Create service account
eksctl create iamserviceaccount \
  --cluster="$CLUSTER_NAME" \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn="arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy" \
  --approve \
  --override-existing-serviceaccounts

# Install via Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName="$CLUSTER_NAME" \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

echo "✔ ALB controller installed."

# ─── STEP 3: ECR Repositories ────────────────────────────────
echo ""
echo "▶ [3/6] Creating ECR repositories..."

SERVICES=(
  "user-service"
  "profile-service"
  "session-service"
  "search-service"
  "communication-service"
  "analytics-service"
  "video-call-service"
  "skillbridge-frontend"
)

for SVC in "${SERVICES[@]}"; do
  aws ecr create-repository \
    --repository-name "$SVC" \
    --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --no-cli-pager 2>/dev/null \
    && echo "  ✔ Created ECR repo: $SVC" \
    || echo "  ℹ ECR repo already exists: $SVC"
done

echo "✔ ECR repositories ready."
echo ""
echo "  ECR registry: ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# ─── STEP 4: RDS PostgreSQL ───────────────────────────────────
echo ""
echo "▶ [4/6] Creating RDS PostgreSQL instance..."

# Get default VPC and subnet group
VPC_ID=$(aws ec2 describe-vpcs \
  --filters Name=isDefault,Values=true \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Create a DB subnet group using default VPC subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[*].SubnetId' \
  --output text | tr '\t' ' ')

aws rds create-db-subnet-group \
  --db-subnet-group-name skillbridge-subnet-group \
  --db-subnet-group-description "SkillBridge RDS subnet group" \
  --subnet-ids $SUBNET_IDS \
  --no-cli-pager 2>/dev/null || echo "  (subnet group already exists)"

# Security group for RDS — allows traffic from EKS node group only
RDS_SG_ID=$(aws ec2 create-security-group \
  --group-name skillbridge-rds-sg \
  --description "SkillBridge RDS access from EKS" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=skillbridge-rds-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# Allow PostgreSQL from within the VPC
aws ec2 authorize-security-group-ingress \
  --group-id "$RDS_SG_ID" \
  --protocol tcp \
  --port 5432 \
  --cidr 0.0.0.0/0 \
  --no-cli-pager 2>/dev/null || true

aws rds create-db-instance \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version "15.4" \
  --master-username postgres \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --db-name skillbridge \
  --db-subnet-group-name skillbridge-subnet-group \
  --vpc-security-group-ids "$RDS_SG_ID" \
  --backup-retention-period 7 \
  --no-multi-az \
  --no-publicly-accessible \
  --no-cli-pager 2>/dev/null \
  && echo "  ✔ RDS instance creation started (takes ~5 minutes)" \
  || echo "  ℹ RDS instance already exists"

echo ""
echo "  Waiting for RDS to become available..."
aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID"

RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE_ID" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✔ RDS ready at: $RDS_ENDPOINT"

# ─── STEP 5: Kubernetes Namespace + Secrets ──────────────────
echo ""
echo "▶ [5/6] Bootstrapping Kubernetes namespace and secrets..."

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Create the real secrets from values above
kubectl create secret generic skillbridge-secrets \
  --namespace=skillbridge \
  --from-literal=JWT_SECRET="$(openssl rand -hex 64)" \
  --from-literal=INTERNAL_SERVICE_TOKEN="$(openssl rand -hex 32)" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD" \
  --from-literal=DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@${RDS_ENDPOINT}:5432/skillbridge" \
  --save-config \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✔ Secrets created in Kubernetes."

# ─── STEP 6: Jitsi EC2 Instance ──────────────────────────────
echo ""
echo "▶ [6/6] Creating Jitsi EC2 Security Group..."

JITSI_SG_ID=$(aws ec2 create-security-group \
  --group-name skillbridge-jitsi-sg \
  --description "Jitsi Meet security group" \
  --vpc-id "$VPC_ID" \
  --query 'GroupId' \
  --output text 2>/dev/null || \
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=skillbridge-jitsi-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

# HTTP
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol tcp --port 80 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true
# HTTPS
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol tcp --port 443 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true
# Jitsi Videobridge TCP fallback
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol tcp --port 4443 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true
# Jitsi Videobridge UDP (WebRTC media — critical)
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol udp --port 10000 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true
# SSH — restrict to your IP in production
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol tcp --port 22 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true
# Custom Jitsi HTTP port used in your docker-compose
aws ec2 authorize-security-group-ingress --group-id "$JITSI_SG_ID" \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0 --no-cli-pager 2>/dev/null || true

echo "✔ Jitsi security group created: $JITSI_SG_ID"
echo ""
echo "  To launch the Jitsi EC2 instance:"
echo ""
echo "  aws ec2 run-instances \\"
echo "    --image-id ami-0c02fb55956c7d316 \\"   # Amazon Linux 2 us-east-1
echo "    --instance-type t3.medium \\"
echo "    --key-name YOUR_KEY_PAIR \\"
echo "    --security-group-ids $JITSI_SG_ID \\"
echo "    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=skillbridge-jitsi}]'"
echo ""
echo "  Then SSH in and run: scripts/install-jitsi.sh"

# ─── SUMMARY ─────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "✅ Infrastructure setup complete!"
echo "=============================================="
echo ""
echo "  EKS Cluster:   $CLUSTER_NAME"
echo "  ECR Registry:  ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "  RDS Endpoint:  $RDS_ENDPOINT"
echo "  Jitsi SG:      $JITSI_SG_ID"
echo ""
echo "Next steps:"
echo "  1. Add these to GitLab CI/CD Variables:"
echo "     AWS_ACCOUNT_ID         = $ACCOUNT_ID"
echo "     AWS_REGION             = $AWS_REGION"
echo "     EKS_CLUSTER_NAME       = $CLUSTER_NAME"
echo "     RDS_ENDPOINT           = $RDS_ENDPOINT"
echo "     DB_PASSWORD            = (the password you set)"
echo "     JWT_SECRET             = (run: openssl rand -hex 64)"
echo "     INTERNAL_SERVICE_TOKEN = (run: openssl rand -hex 32)"
echo ""
echo "  2. Launch Jitsi EC2 and note the public IP."
echo "     Update JITSI_BASE_URL in k8s/configmap.yaml."
echo ""
echo "  3. git push origin main — pipeline will deploy automatically."

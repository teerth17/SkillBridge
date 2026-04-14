#!/bin/bash
# ============================================================
# SkillBridge — Thesis Presentation Demo Cheat Sheet
#
# Keep this open in a terminal during your presentation.
# All commands assume: kubectl context = skillbridge-cluster
#                      namespace       = skillbridge
# ============================================================

NS="skillbridge"

# ─── SETUP (run before the presentation) ─────────────────────

# Confirm cluster is up and all pods are Running
kubectl get pods -n $NS
kubectl get ingress -n $NS   # note the ALB DNS name / domain

# ─────────────────────────────────────────────────────────────
# DEMO 1 — Microservices Architecture Overview
# "All 8 services are running independently on EKS"
# ─────────────────────────────────────────────────────────────

# Show all running pods with their nodes
kubectl get pods -n $NS -o wide

# Show all ClusterIP services (internal DNS)
kubectl get services -n $NS

# Show the Ingress and ALB endpoint
kubectl get ingress -n $NS

# Describe the ALB ingress to show path routing rules
kubectl describe ingress skillbridge-ingress -n $NS

# Show resource usage across pods
kubectl top pods -n $NS

# ─────────────────────────────────────────────────────────────
# DEMO 2 — Horizontal Scaling
# "Kubernetes scales services independently — key microservices benefit"
# ─────────────────────────────────────────────────────────────

# Show current replicas
kubectl get deployments -n $NS

# Scale user-service to 3 replicas (live, takes ~10 seconds)
kubectl scale deployment user-service --replicas=3 -n $NS

# Watch new pods come up in real time (Ctrl+C to stop)
kubectl get pods -n $NS -w

# Confirm 3 user-service pods are Running
kubectl get pods -n $NS -l app=user-service

# Show that other services are unaffected
kubectl get deployments -n $NS

# Scale back down
kubectl scale deployment user-service --replicas=2 -n $NS

# ─────────────────────────────────────────────────────────────
# DEMO 3 — Self-Healing
# "Kubernetes automatically restarts failed pods"
# ─────────────────────────────────────────────────────────────

# Note the name of a running user-service pod
kubectl get pods -n $NS -l app=user-service

# In a second terminal, start watching pods before you kill one:
#   kubectl get pods -n $NS -w

# Kill a pod (replace pod name with actual name from above)
kubectl delete pod -n $NS -l app=user-service --wait=false

# The watch window will show:
#   Terminating → then a new pod Pending → ContainerCreating → Running
# This happens automatically — no human intervention.

# Show restart count in pod description
kubectl describe pod -n $NS -l app=user-service | grep -A5 "Restart Count"

# ─────────────────────────────────────────────────────────────
# DEMO 4 — Rolling Update via CI/CD
# "Push code, pipeline builds + deploys with zero downtime"
# ─────────────────────────────────────────────────────────────

# BEFORE: note the current image tag
kubectl get deployment user-service -n $NS -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""

# Now: make a small code change and git push to main
# The GitLab pipeline will run: test → build → push → deploy

# WATCH the rollout happen live (run this while pipeline is running):
kubectl rollout status deployment/user-service -n $NS

# Or watch all deployments update:
watch kubectl get deployments -n $NS

# Show rollout history
kubectl rollout history deployment/user-service -n $NS

# If something goes wrong — instant rollback:
kubectl rollout undo deployment/user-service -n $NS

# AFTER: confirm the new image tag
kubectl get deployment user-service -n $NS -o jsonpath='{.spec.template.spec.containers[0].image}'
echo ""

# ─────────────────────────────────────────────────────────────
# BONUS — Useful during Q&A
# ─────────────────────────────────────────────────────────────

# View logs from a specific service (last 50 lines)
kubectl logs -n $NS -l app=user-service --tail=50

# Follow logs live
kubectl logs -n $NS -l app=session-service -f

# Show ConfigMap contents (non-secret env vars)
kubectl get configmap skillbridge-config -n $NS -o yaml

# Show that Secrets are encrypted at rest (values are not visible)
kubectl get secret skillbridge-secrets -n $NS -o yaml

# Show resource limits on a deployment
kubectl describe deployment user-service -n $NS | grep -A10 "Limits\|Requests"

# Show all nodes in the cluster
kubectl get nodes -o wide

# Show cluster info
kubectl cluster-info

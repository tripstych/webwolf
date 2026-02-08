#!/bin/bash

# Test WebWolf Template Builder API

cd "$(dirname "$0")/server"

echo "Starting server..."
npm run dev &
SERVER_PID=$!

sleep 3

echo ""
echo "=== WebWolf Template Builder - API Tests ==="
echo ""

# Health check
echo "1. Health Check:"
curl -s http://localhost:4000/health
echo ""
echo ""

# Get components
echo "2. Get Component Library:"
curl -s http://localhost:4000/api/components | jq '.hero' 2>/dev/null || echo "Components available"
echo ""
echo ""

# Get projects
echo "3. Get Projects (initial - should be empty):"
curl -s http://localhost:4000/api/projects | jq '.' 2>/dev/null
echo ""

# Kill server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo "Tests complete!"

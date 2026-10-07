#!/bin/bash
set -e

# Setup Script for Secure Data Vault

# Check for node
if ! command -v node > /dev/null; then
    echo "Error: Node.js is not installed."
    exit 1
fi

echo "=========================================="
echo "    Secure Data Vault - Setup & Run"
echo "=========================================="

echo "[1/4] Installing backend dependencies..."
cd backend
npm install > /dev/null 2>&1
echo "  ✓ Backend dependencies installed."

echo "[2/4] Installing frontend dependencies..."
cd ../frontend
npm install > /dev/null 2>&1
echo "  ✓ Frontend dependencies installed."

echo "[3/4] Resetting local database for a fresh demo..."
cd ../backend
npm run reset-db
echo "  ✓ Database reset."

echo "[4/4] Starting servers..."
echo "  - Backend API: http://127.0.0.1:4000"
echo "  - Frontend UI: http://localhost:3000"
echo "=========================================="

# Start backend in background
npm start &
BACKEND_PID=$!

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Trap Ctrl+C to kill both servers gracefully
trap "echo -e '\nShutting down servers...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" SIGINT SIGTERM

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID

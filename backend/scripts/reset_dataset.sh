#!/bin/bash

# Find the file path
if [ -f "backend/data/historical_aqi.csv" ]; then
    TARGET_FILE="backend/data/historical_aqi.csv"
elif [ -f "data/historical_aqi.csv" ]; then
    TARGET_FILE="data/historical_aqi.csv"
else
    echo "Error: historical_aqi.csv not found in backend/data/ or data/"
    exit 1
fi

echo "Found historical_aqi.csv at $TARGET_FILE"
echo "Truncating dataset to exactly 2233 lines..."

# Use head to keep only the first 2233 lines (1 header + 2232 data rows)
head -n 2233 "$TARGET_FILE" > temp.csv
mv temp.csv "$TARGET_FILE"

echo "Dataset successfully reset to $(wc -l < "$TARGET_FILE") lines."

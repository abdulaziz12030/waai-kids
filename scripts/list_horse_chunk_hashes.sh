#!/usr/bin/env bash
set -euo pipefail
for part in public/gifts/arabian-horse/video-parts/part-*.txt; do
  echo "$(basename "$part") $(wc -c < "$part") $(sha256sum "$part" | cut -d' ' -f1)"
done

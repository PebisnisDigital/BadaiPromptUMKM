#!/usr/bin/env python3
"""Download and verify the landing page's original images over verified HTTPS.

The cache is for testing only; production image URLs remain unchanged.
Usage: python3 scripts/verify-landing-assets.py /tmp/badai-assets
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import re
import sys
import urllib.request

root = Path(__file__).resolve().parents[1]
cache = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/badai-assets')
cache.mkdir(parents=True, exist_ok=True)
source = (root / 'index.html').read_text()
urls = list(dict.fromkeys(re.findall(
    r'https://(?:i\.ibb\.co\.com/[^"\s<>]+|sgp\.cloud\.appwrite\.io/v1/storage/[^"\s<>]+)', source
)))
assert len([url for url in urls if 'i.ibb.co.com' in url]) == 22, 'Expected all 22 original screenshots'


def download(url):
    with urllib.request.urlopen(url, timeout=45) as response:
        assert response.status == 200, url
        assert response.headers.get_content_type() == 'image/webp', url
        content = response.read()
    assert content[:4] == b'RIFF' and content[8:12] == b'WEBP', url
    path = cache / (hashlib.sha256(url.encode()).hexdigest() + '.webp')
    path.write_bytes(content)
    return dict(url=url, path=str(path.resolve()), bytes=len(content), sha256=hashlib.sha256(content).hexdigest())


with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(download, urls))
manifest = cache / 'manifest.json'
manifest.write_text(json.dumps(results, indent=2) + '\n')
print(f'PASS: {len(results)} original images, {sum(item["bytes"] for item in results):,} bytes; {manifest}')

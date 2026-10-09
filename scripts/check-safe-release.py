"""Read-only release gate. No deployment, environment or database mutation.

Default checks reviewed file hashes and Git ancestry. --remote also checks fresh
main, Vercel production/environment flags, Appwrite builds/flags/settings using
an ephemeral key with functions.read, tables.read and rows.read. Never use a
customer JWT or expand the Telegram Manager server key for this script.
"""
import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import urllib.request

root = pathlib.Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/safe-release-manifest.json').read_text())
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--remote', action='store_true')
args = parser.parse_args()

def check(condition, name):
    if not condition:
        raise SystemExit('STOP: ' + name)
    print('PASS: ' + name)

for group in ['backend_file_sha256', 'frontend_file_sha256']:
    check(all(hashlib.sha256((root / file).read_bytes()).hexdigest() == expected
              for file, expected in manifest[group].items()), group)
for baseline in ['production_frontend_baseline', 'main_expected_before_approval']:
    check(subprocess.run(['git', 'merge-base', '--is-ancestor', manifest[baseline], 'HEAD'], cwd=root).returncode == 0,
          baseline + ' retained in candidate ancestry')
if not args.remote:
    print('Local gate only; remote state must be checked again immediately before approved release.')
    raise SystemExit(0)

def fetch(url, headers):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
        return json.load(response)

vercel_token = os.environ.get('VERCEL_TOKEN')
appwrite_key = os.environ.get('APPWRITE_RELEASE_READ_KEY')
check(bool(vercel_token and appwrite_key), 'read-only remote credentials present')
remote_main = subprocess.check_output(['git', 'ls-remote', 'origin', 'refs/heads/main'], cwd=root, text=True).split()[0]
check(remote_main == manifest['main_expected_before_approval'], 'main has not changed since review')
v = manifest['vercel']
vh = {'Authorization': 'Bearer ' + vercel_token}
project_url = 'https://api.vercel.com/v9/projects/' + v['project_id'] + '?teamId=' + v['team_id']
project = fetch(project_url, vh)
check(project['targets']['production']['id'] == v['production_rollback_deployment'], 'production frontend still at rollback baseline')
check(project['link']['productionBranch'] == 'main', 'Vercel production branch remains main')
envs = fetch('https://api.vercel.com/v9/projects/' + v['project_id'] + '/env?teamId=' + v['team_id'], vh)['envs']
for key in manifest['required_flags']:
    relevant = [e for e in envs if e['key'] == key and set(e.get('target', [])) & {'preview', 'production'}]
    check(bool(relevant) and all(e.get('value') == 'false' for e in relevant)
          and {'preview', 'production'} <= {t for e in relevant for t in e.get('target', [])}, key + ' false in Vercel')
a = manifest['appwrite']
ah = {'X-Appwrite-Project': a['project_id'], 'X-Appwrite-Key': appwrite_key}
for name, ids in a['functions'].items():
    function = fetch(a['endpoint'] + '/functions/' + name, ah)
    check(function['deploymentId'] == ids['rollback_deployment'], name + ' active baseline unchanged')
    for purpose in ['rollback_deployment', 'release_deployment']:
        build = fetch(a['endpoint'] + '/functions/' + name + '/deployments/' + ids[purpose], ah)
        check(build['status'] == 'ready', name + ' ' + purpose + ' ready')
variables = fetch(a['endpoint'] + '/functions/activate-member/variables', ah)['variables']
for key in manifest['required_flags']:
    check(any(v['key'] == key and v.get('value') == 'false' for v in variables), key + ' false in activate-member')
state = fetch(a['endpoint'] + '/tablesdb/' + a['database_id'] + '/tables/telegram_state/rows/telegram-settings', ah)
settings = json.loads(state['payload'])
check(all(settings.get(k) is value for k, value in manifest['required_settings'].items()), 'automation disabled, paused and dry-run')
print('Remote gate passes. This script grants no approval and performs no release.')

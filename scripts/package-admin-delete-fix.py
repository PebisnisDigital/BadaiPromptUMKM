"""Build the minimal backend patch against the verified active source.

Usage: python3 scripts/package-admin-delete-fix.py work/activate-member.tar.gz
Keep the baseline activation behavior while adding only /admin/sales/delete.
"""
import io
import pathlib
import subprocess
import sys
import tarfile

root = pathlib.Path(__file__).resolve().parents[1]
baseline = '019d310d417e55e06f77c6005234764a7819f93f'
prefix = 'functions/activate-member/'
def original(name):
    return subprocess.check_output(['git', 'show', baseline + ':' + prefix + name], cwd=root)

current = (root / prefix / 'src/main.js').read_text()
start = current.index("      if(route==='/sales/delete'){")
end = current.index("      if(route==='/members/manual-create'){", start)
main = original('src/main.js').decode()
marker = "      if(route==='/members/manual-create'){"
assert main.count(marker) == 1 and "if(route==='/sales/delete')" not in main
main = "import { deleteSalesData } from './delete-sales.js';\n" + main.replace(marker, current[start:end] + marker)
files = {'package.json': original('package.json'), 'src/main.js': main.encode(),
         'src/delete-sales.js': (root / prefix / 'src/delete-sales.js').read_bytes()}
output = pathlib.Path(sys.argv[1])
output.parent.mkdir(parents=True, exist_ok=True)
with tarfile.open(output, 'w:gz') as archive:
    for name, data in files.items():
        info = tarfile.TarInfo(name)
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
print(output)

"""Package reviewed source as inactive deployment archives; no cloud mutation."""
import pathlib
import sys
import tarfile
root = pathlib.Path(__file__).resolve().parents[1]
output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root / 'work/telegram/archives')
output.mkdir(parents=True, exist_ok=True)
for name in ['activate-member', 'payment-api']:
    source = root / 'functions' / name
    with tarfile.open(output / (name + '.tar.gz'), 'w:gz') as archive:
        for file in ['package.json', 'package-lock.json']:
            archive.add(source / file, arcname=file)
        for file in sorted((source / 'src').rglob('*')):
            if file.is_file():
                archive.add(file, arcname=file.relative_to(source))
    print(name + ': packaged package/lock and complete src; entrypoint src/main.js, build npm ci')

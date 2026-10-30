import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'src/translations'
english = json.loads((root / 'en.json').read_text(encoding='utf-8'))
catalogs = {code: {} for code in ('fr', 'pl', 'de', 'es')}
for line in (root / 'translations.tsv').read_text(encoding='utf-8').splitlines():
    if not line or line.startswith('#'): continue
    key, *values = line.split('\t')
    english.setdefault(key, key)
    assert len(values) == 4, (key, len(values))
    for code, value in zip(catalogs, values):
        assert key not in catalogs[code], key
        catalogs[code][key] = value
for code, catalog in catalogs.items():
    for key, text in english.items():
        if key in catalog:
            catalog.setdefault(text, catalog[key])
    (root / f'{code}.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(root / 'en.json').write_text(json.dumps(english, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Source briefs are the built-in weekly fallback definitions; only matching briefs
# can use these translations at runtime.
workspace = root.parents[1]
fallbacks = (workspace / 'supabase/functions/generate-weekly-challenge/index.ts').read_text(encoding='utf-8')
source_briefs = dict(re.findall(r'\{ title: "([^"]+)", description: "([^"]+)"', fallbacks))
challenges = {title: {'source_description': description, 'translations': {}} for title, description in source_briefs.items()}
for line in (root / 'challenges.tsv').read_text(encoding='utf-8').splitlines():
    if not line or line.startswith('#'): continue
    title, field, *values = line.split('\t')
    assert title in challenges and len(values) == 4, title
    for code, value in zip(catalogs, values):
        challenges[title]['translations'].setdefault(code, {})[field] = value
for title, entry in challenges.items():
    for code in catalogs:
        assert set(entry['translations'][code]) == {'title', 'description', 'prize'}, (title, code)
(workspace / 'supabase/functions/_shared/challengeCatalog.ts').write_text(
    '// Reviewed translations for the built-in editorial challenges.\nexport const challengeCatalog = '
    + json.dumps(challenges, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')

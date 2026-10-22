# Builds dict/ from Open English WordNet 2024 (CC BY 4.0) and wordfreq (CC BY-SA 4.0).
# Usage: download english-wordnet-2024.xml.gz from https://github.com/globalwordnet/english-wordnet/releases
#        as oewn.xml.gz next to this script, pip install wordfreq, then: python3 scripts/build_dictionary.py
import gzip, json, re, sys, os
import xml.etree.ElementTree as ET
from wordfreq import zipf_frequency
synsets, entries = {}, {}
for ev, el in ET.iterparse(gzip.open('oewn.xml.gz'), events=('end',)):
    if el.tag == 'LexicalEntry':
        lem = el.find('Lemma'); w = lem.get('writtenForm')
        if w and not w[0].isupper() and re.fullmatch(r"[a-z][a-z\- ]{2,40}", w) and w.count(' ') <= 2:
            entries.setdefault(w, []).extend(s.get('synset') for s in el.findall('Sense'))
        el.clear()
    elif el.tag == 'Synset':
        d = el.find('Definition')
        synsets[el.get('id')] = {'pos': el.get('partOfSpeech'), 'def': d.text if d is not None else '', 'ex': [e.text for e in el.findall('Example') if e.text][:1],
                                 'hyp': [r.get('target') for r in el.findall('SynsetRelation') if r.get('relType') in ('hypernym', 'instance_hypernym')][:1], 'lem': []}
        el.clear()
for lemma, ids in entries.items():
    for sid in ids:
        if sid in synsets: synsets[sid]['lem'].append(lemma)
zc = {}
def z(w):
    if w not in zc: zc[w] = zipf_frequency(w, 'en')
    return zc[w]
MAXZ = 4.4
chunks = {}
for lemma, ids in entries.items():
    zz = z(lemma)
    multi = ' ' in lemma
    if zz < 1.0 or zz >= (5.0 if multi else MAXZ): continue
    if len(lemma) < 5 and ' ' not in lemma: continue
    senses = []
    # keep the most common senses, but at least one per part of speech (max 5)
    ordered = list(dict.fromkeys(ids)); picked, seen = [], set()
    for sid in ordered:
        p = synsets.get(sid, {}).get('pos')
        if len(picked) < 3 or (p not in seen and len(picked) < 5): picked.append(sid); seen.add(p)
    for sid in picked:
        s = synsets.get(sid)
        if not s or not s['def']: continue
        cands = [w for w in s['lem'] if w != lemma]  # same-meaning words only (no broader terms)
        simpler = sorted({w for w in cands if z(w) >= max(3.6, zz + 0.4) and ' ' not in w}, key=lambda w: -z(w))[:3]
        hyper = next((w for h in s['hyp'] for w in synsets.get(h, {}).get('lem', [])), '')
        senses.append([s['pos'], s['def'], s['ex'][0] if s['ex'] else '', simpler, hyper, [w for w in s['lem'] if w != lemma][:4]])
    if senses:
        key = (lemma + '_')[:2]
        chunks.setdefault(key, {})[lemma] = [round(zz - 0.9 if multi else zz, 1), senses]
import shutil; shutil.rmtree('dict', ignore_errors=True); os.makedirs('dict', exist_ok=True)
# pack two-letter prefixes into files of at most ~260 KB, in alphabetical order
files, cur, cursize, prefix_to_file = [], {}, 0, {}
def flush():
    global cur, cursize
    if cur:
        name = f'd{len(files):02d}'
        files.append(name)
        for p in cur['__prefixes']: prefix_to_file[p] = name
        body = {k: v for k, v in cur.items() if k != '__prefixes'}
        open(f'dict/{name}.json', 'w').write(json.dumps(body, separators=(',', ':'), ensure_ascii=False))
    cur, cursize = {}, 0
n = 0; tot = 0
for p in sorted(chunks):
    sz = len(json.dumps(chunks[p], separators=(',', ':'), ensure_ascii=False))
    if cursize and cursize + sz > 260000: flush()
    cur.setdefault('__prefixes', []).append(p); cur.update(chunks[p]); cursize += sz; n += len(chunks[p]); tot += sz
flush()
meta = {'files': prefix_to_file, 'source': 'Open English WordNet 2024 edition (CC BY 4.0, https://github.com/globalwordnet/english-wordnet); word frequencies: wordfreq (CC BY-SA 4.0, https://github.com/rspeer/wordfreq)', 'maxZipf': MAXZ, 'lemmas': n}
json.dump(meta, open('dict/index.json', 'w'))
print('lemmas', n, 'total bytes', tot, 'files', len(files))

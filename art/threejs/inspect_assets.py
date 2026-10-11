"""Reproducible container and production semantic checks, not a visual-quality test."""
import hashlib
import json
import struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs'/'production'/'evidence'/'issue-4'/'asset-manifest.json'
assets=[]
for path in sorted((ROOT/'public'/'assets'/'threejs').glob('*.glb')):
    raw=path.read_bytes()
    magic,version,total=struct.unpack_from('<4sII',raw)
    assert magic==b'glTF' and version==2 and total==len(raw), path
    size,kind=struct.unpack_from('<II',raw,12)
    assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+size])
    assert all('uri' not in item for key in ('buffers','images') for item in doc.get(key,[])), path
    names={node.get('name') for node in doc.get('nodes',[])}
    assert 'asset_root' in names, path
    anchors=sorted(name for name in names if name and name.endswith('_anchor'))
    clips=[]
    for animation in doc.get('animations',[]):
        duration=max(doc['accessors'][s['input']]['max'][0] for s in animation['samplers'])
        assert duration>0
        clips.append({'name':animation['name'],'seconds':duration,'channels':len(animation['channels'])})
    if path.stem=='skeleton_infantry':
        assert {clip['name'] for clip in clips}=={'walk','attack','hit','death'}
        assert doc.get('skins')
    if path.stem.startswith(('arrow_tower','lumberyard','main_city','skeleton')):
        assert {'attack_anchor','hit_anchor','label_anchor'} <= names, path
    triangles=sum(doc['accessors'][p.get('indices',p['attributes']['POSITION'])]['count']//3 for mesh in doc['meshes'] for p in mesh['primitives'])
    source=ROOT/'art'/'threejs'/'sources'/f'{path.stem}.blend'
    assert source.is_file(), source
    source_raw=source.read_bytes()
    assert any(node.get('extras',{}).get('asset_id')==path.stem for node in doc['nodes']), path
    assets.append({'asset':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),
        'source':f'art/threejs/sources/{path.stem}.blend','sourceSha256':hashlib.sha256(source_raw).hexdigest(),'sourceBytes':len(source_raw),'triangles':triangles,
        'materials':len(doc.get('materials',[])),'meshPrimitives':sum(len(m['primitives']) for m in doc['meshes']),
        'anchors':anchors,'clips':clips,'skins':len(doc.get('skins',[])),
        'joints':sum(len(s['joints']) for s in doc.get('skins',[])),
        'embeddedTextures':len(doc.get('images',[])),
        'occlusionMaterials':sum('occlusionTexture' in m for m in doc.get('materials',[]))})
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(json.dumps({'schema':1,'assets':assets},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'assets':len(assets),'bytes':sum(a['bytes'] for a in assets),'manifest':str(OUT)}))

"""Read saved production .blend sources; never regenerate or save over them."""
import bpy
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
OUT=HERE.parent.parent/'public'/'assets'/'threejs'
OUT.mkdir(parents=True,exist_ok=True)
names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [p.stem for p in sorted((HERE/'sources').glob('*.blend'))]
for name in names:
    bpy.ops.wm.open_mainfile(filepath=str(HERE/'sources'/f'{name}.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    collection=bpy.data.collections['runtime_export']
    for obj in bpy.context.scene.objects:
        if obj.name in collection.objects or obj.type in ('EMPTY','ARMATURE'):
            obj.hide_set(False); obj.select_set(True)
    for obj in bpy.context.scene.objects:
        if obj.type=='ARMATURE' and obj.animation_data:
            for track in obj.animation_data.nla_tracks: track.mute=False
        if obj.type=='MESH' and any(mod.type=='ARMATURE' for mod in obj.modifiers) and obj.name in collection.objects:
            # glTF skinning ignores parent transforms. Export the bound surface at
            # scene root; the runtime clones/moves the complete GLTF scene wrapper.
            world=obj.matrix_world.copy(); obj.parent=None; obj.matrix_world=world
    result=bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',use_selection=True,
        export_apply=True,export_yup=True,export_extras=True,export_cameras=False,export_lights=False,
        export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_def_bones=True,
        export_anim_slide_to_zero=True,export_force_sampling=True,export_frame_range=False)
    print('ZCAMP_EXPORT',name,result,flush=True)

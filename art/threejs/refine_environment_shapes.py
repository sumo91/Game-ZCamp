"""Apply the fixed-camera review to saved main-city/tree sources, once."""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import create_sample_sources as a

for name in ['main_city','pine_tree']:
    path=HERE/'sources'/f'{name}.blend'; bpy.ops.wm.open_mainfile(filepath=str(path))
    root=bpy.data.objects['asset_root']; modules=bpy.data.collections['editable_modules']
    if root.get('camera_shape_revision')==1: continue
    modules.hide_viewport=False; bpy.context.view_layer.update()
    if name=='main_city':
        # Retain the saved foundation/door/stonework. Narrow the hall roof and raise
        # a central keep; move the corner silhouette forward into the game view.
        for obj in list(modules.objects):
            if obj.name.startswith(('corner_blue_cap','corner_tower','corner_course_band','gold_corner_cornice')):
                bpy.data.objects.remove(obj,do_unlink=True)
            elif obj.name.startswith('great_blue_roof'):
                world=obj.matrix_world.copy(); inv=world.inverted()
                for vertex in obj.data.vertices:
                    point=world@vertex.co; point.x*=.62; point.y=.04+(point.y-.04)*.62; point.z+=.23
                    vertex.co=inv@point
        a.ROOT=root; a.PARTS=[]; a.MATS={mat.name:mat for mat in bpy.data.materials}
        a.box('upper_keep_core',(0,0,1.285),(.77,.68,.33),'limestone',.023)
        for x in (-.61,.61):
            a.cylinder('fort_corner_core',(x,-.14,.82),.18,1.20,'limestone',8)
            for z in (.29,.62,.95,1.29): a.cylinder('turret_dressed_ring',(x,-.14,z),.204,.052,'edge_stone',8)
            a.cylinder('turret_gold_cornice',(x,-.14,1.43),.213,.06,'bronze',8)
            verts=[(x+.25*math.cos(i*math.tau/8),-.14+.25*math.sin(i*math.tau/8),1.47) for i in range(8)]+[(x,-.14,1.93)]
            faces=[(i,(i+1)%8,8) for i in range(8)]+[tuple(reversed(range(8)))]
            a.mesh('blue_pointed_turret',verts,faces,'cobalt',.016)
            a.ellipsoid('gold_spire_tip',(x,-.14,1.925),(.03,.03,.035),'bronze',segments=8,rings=6)
            a.box('turret_arrow_slit',(x,-.326,.88),(.052,.02,.22),'recess',.009)
        for x in (-.48,.48):
            a.box('keep_front_merlon',(x,-.45,1.24),(.16,.18,.23),'edge_stone',.023)
            a.box('keep_rear_merlon',(x,.45,1.24),(.16,.18,.23),'edge_stone',.023)
        for obj in a.PARTS:
            for collection in list(obj.users_collection): collection.objects.unlink(obj)
            modules.objects.link(obj)
    else:
        for obj in modules.objects:
            if not obj.name.startswith('branch_canopy'): continue
            world=obj.matrix_world.copy(); inv=world.inverted()
            for vertex in obj.data.vertices:
                point=world@vertex.co; point.x*=.7; point.y*=.7
                if point.z>1.29: point.z=1.29+(point.z-1.29)*1.45
                vertex.co=inv@point
    root['camera_shape_revision']=1; root['atlas_revision']=0
    modules.hide_viewport=True; bpy.ops.wm.save_as_mainfile(filepath=str(path))
    print('ZCAMP_CAMERA_REFINED',name,flush=True)

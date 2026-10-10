"""Refine saved sources and bake a single PBR atlas; no procedural reconstruction.

Read the production .blend, edit its actual mesh/rig/anchors, and save the refinement.
The original construction modules/materials remain editable and packed in that source.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from runtime_surface import merge_runtime_surface

def height(z):
    if z <= .44: return z*1.35
    if z <= .79: return .594+(z-.44)*1.30
    return 1.049+(z-.79)*.92

def original_height(z):
    if z<=.594: return z/1.35
    if z<=1.049: return .44+(z-.594)/1.30
    return .79+(z-1.049)/.92

def refine_skeleton(root,body):
    if root.get('proportion_revision')==3: return
    rig=bpy.data.objects['skeleton_rig']
    anchors={obj:obj.matrix_world.copy() for obj in bpy.context.scene.objects if obj.type=='EMPTY' and obj.name.endswith('_anchor')}
    recovering=root.get('proportion_revision')==2
    for obj in bpy.data.collections['editable_modules'].objects:
        if obj.type!='MESH': continue
        world=obj.matrix_world.copy(); inv=world.inverted()
        for vertex in obj.data.vertices:
            local=vertex.co.copy()
            if recovering: local.z=original_height(local.z)
            point=world@local; point.z=height(point.z); vertex.co=inv@point
    if not recovering:
        bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active=rig
        bpy.ops.object.mode_set(mode='EDIT')
        for bone in rig.data.edit_bones:
            bone.head.z=height(bone.head.z); bone.tail.z=height(bone.tail.z)
        bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()
        for obj,world in anchors.items():
            world.translation.z=height(world.translation.z); obj.matrix_world=world
    root['proportion_revision']=3
    root['atlas_revision']=0

def rebuild_surface(root,name):
    old=bpy.data.objects[root['export_mesh']]
    bpy.data.objects.remove(old,do_unlink=True)
    runtime=bpy.data.collections['runtime_export']
    parts=(obj for obj in bpy.data.collections['editable_modules'].objects if obj.type=='MESH')
    body=merge_runtime_surface(parts,runtime,root,name)
    old_ao=bpy.data.images.get(name+'_ao')
    if old_ao: bpy.data.images.remove(old_ao,do_unlink=True)
    ao=bpy.data.images.new(name+'_ao',width=512,height=512,alpha=False); ao.colorspace_settings.name='Non-Color'
    for mat in body.data.materials:
        target=mat.node_tree.nodes.new('ShaderNodeTexImage'); target.image=ao; mat.node_tree.nodes.active=target
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=16
    bpy.ops.object.bake(type='AO',margin=3); ao.pack()
    for mat in body.data.materials:
        for node in mat.node_tree.nodes:
            if node.type=='GROUP' and node.node_tree and node.node_tree.name=='glTF Material Output':
                tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=ao
                mat.node_tree.links.new(tex.outputs['Color'],node.inputs['Occlusion'])
    if name=='skeleton_infantry':
        rig=bpy.data.objects['skeleton_rig']; body.parent=rig
        mod=body.modifiers.new('shared_rig_skin','ARMATURE'); mod.object=rig
    root['export_mesh']=body.name
    return body

def bake_atlas(root,body,name):
    if root.get('atlas_revision')==1: return
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=16
    materials=list(body.data.materials)
    color=bpy.data.images.new(name+'_base_color_atlas',width=1024 if name.startswith('arrow') else 512,height=1024 if name.startswith('arrow') else 512,alpha=False)
    color.colorspace_settings.name='sRGB'
    for mat in materials:
        target=mat.node_tree.nodes.new('ShaderNodeTexImage'); target.image=color; mat.node_tree.nodes.active=target
    bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=5)
    color.pack()
    packed=bpy.data.images.new(name+'_roughness_metallic_atlas',width=512,height=512,alpha=False)
    packed.colorspace_settings.name='Non-Color'
    previous=[]
    for mat in materials:
        nodes=mat.node_tree.nodes; links=mat.node_tree.links
        bsdf=next(node for node in nodes if node.type=='BSDF_PRINCIPLED'); output=next(node for node in nodes if node.type=='OUTPUT_MATERIAL')
        previous.append((mat,output,output.inputs['Surface'].links[0].from_socket))
        emission=nodes.new('ShaderNodeEmission'); emission.inputs['Color'].default_value=(1,bsdf.inputs['Roughness'].default_value,bsdf.inputs['Metallic'].default_value,1)
        links.new(emission.outputs[0],output.inputs['Surface'])
        target=nodes.new('ShaderNodeTexImage'); target.image=packed; nodes.active=target
    bpy.ops.object.bake(type='EMIT',margin=3); packed.pack()
    for mat,output,socket in previous: mat.node_tree.links.new(socket,output.inputs['Surface'])
    atlas=bpy.data.materials.new(name+'_pbr_atlas'); atlas.use_nodes=True; atlas.use_backface_culling=True
    nodes=atlas.node_tree.nodes; links=atlas.node_tree.links; bsdf=next(node for node in nodes if node.type=='BSDF_PRINCIPLED')
    base=nodes.new('ShaderNodeTexImage'); base.image=color; links.new(base.outputs['Color'],bsdf.inputs['Base Color'])
    orm=nodes.new('ShaderNodeTexImage'); orm.image=packed
    separate=nodes.new('ShaderNodeSeparateColor'); links.new(orm.outputs['Color'],separate.inputs['Color'])
    links.new(separate.outputs['Green'],bsdf.inputs['Roughness']); links.new(separate.outputs['Blue'],bsdf.inputs['Metallic'])
    ao=bpy.data.images.get(name+'_ao')
    if ao:
        tex=nodes.new('ShaderNodeTexImage'); tex.image=ao
        group=bpy.data.node_groups.get('glTF Material Output')
        output=nodes.new('ShaderNodeGroup'); output.node_tree=group; links.new(tex.outputs['Color'],output.inputs['Occlusion'])
    body.data.materials.clear(); body.data.materials.append(atlas)
    for polygon in body.data.polygons: polygon.material_index=0
    root['atlas_revision']=1
    root['atlas_note']='One runtime PBR material with baked baseColor, roughness/metallic and structural AO; original source materials retained.'
    scene.render.engine='BLENDER_EEVEE'

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [p.stem for p in sorted((HERE/'sources').glob('*.blend'))]
for name in args:
    path=HERE/'sources'/f'{name}.blend'; bpy.ops.wm.open_mainfile(filepath=str(path))
    root=bpy.data.objects['asset_root']; body=bpy.data.objects[root['export_mesh']]
    # Hidden editable collections are excluded from dependency-graph evaluation.
    # Evaluate their actual parent/rotation/translation before deriving runtime UVs.
    modules=bpy.data.collections['editable_modules']; modules.hide_viewport=False
    bpy.context.view_layer.update()
    if name=='skeleton_infantry':
        refine_skeleton(root,body)
        if root.get('skin_revision')!=1:
            # Boolean socket cuts created new vertices after the original rigid bind.
            # Bind the complete saved skull surface, including those cut rims.
            skull=bpy.data.objects['skull_cranium']
            skull.vertex_groups['head'].add(list(range(len(skull.data.vertices))),1,'REPLACE')
            root['skin_revision']=1; root['atlas_revision']=0
    if root.get('cloth_revision')!=1:
        for obj in modules.objects:
            if obj.type=='MESH' and len(obj.data.polygons)==1 and any(token in obj.name for token in ('flag','swallowtail','standard','tabard')):
                mod=obj.modifiers.new('cloth_has_two_physical_faces','SOLIDIFY'); mod.thickness=.012; mod.offset=0
        root['cloth_revision']=1; root['atlas_revision']=0
    # All occupied plots use the same front-edge label projection, including row 3.
    if name.startswith(('arrow','lumberyard','main_city')):
        bpy.data.objects['label_anchor'].location=(0,-.5,.025)
    if name.startswith('arrow'):
        # The stationed archer faces the threat (+Y in source, -Z in GLB).
        if root.get('archer_revision')!=3:
            pivot=Vector((0,-.08,0)); rotate=Matrix.Rotation(math.pi,4,'Z')
            recovering=root.get('archer_revision')==2
            for obj in modules.objects:
                if obj.name.startswith(('archer_','helmet_gold','large_bow','bowstring','nocked_arrow')):
                    world=obj.matrix_world.copy(); inv=world.inverted()
                    for vertex in obj.data.vertices:
                        local=vertex.co.copy()
                        if recovering: local=rotate.inverted()@(local-Vector((0,-.16,.08)))
                        point=world@local; point=pivot+rotate@(point-pivot); point.z+=.08; vertex.co=inv@point
            root['archer_revision']=3
            root['atlas_revision']=0
        bpy.data.objects['attack_anchor'].location=(.1,.53,1.71)
    if root.get('atlas_revision')!=1: body=rebuild_surface(root,name)
    bake_atlas(root,body,name)
    modules.hide_viewport=True
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    print('ZCAMP_REFINED_SOURCE',name,flush=True)

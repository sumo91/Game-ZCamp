"""Create missing original blue/gold human heroes; refuse to replace saved sources.

Metres, foot origin, source -Y face / GLB +Z. Reuses the sample's editable
surface and 14-joint rig, with original silhouettes, equipment and hero Actions.
"""
import math
import sys
from pathlib import Path
import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import create_sample_sources as a


def crossbow(x, y, z, bone, size=1):
    a.box('crossbow_stock', (x, y, z), (.075*size, .43*size, .075*size), 'timber', .012, bone)
    a.tube('curved_bow', [(x-.24*size, y-.16*size, z), (x-.12*size, y-.23*size, z+.035), (x, y-.24*size, z+.035), (x+.12*size, y-.23*size, z+.035), (x+.24*size, y-.16*size, z)], .025*size, 'bronze', bone)
    a.tube('bow_string', [(x-.24*size, y-.16*size, z), (x, y+.08*size, z), (x+.24*size, y-.16*size, z)], .006*size, 'iron', bone)
    a.beam('loaded_bolt', (x, y+.03*size, z+.05), (x, y-.31*size, z+.05), .025*size, 'edge_stone', bone)


def hero(asset):
    a.start(asset); a.make_rig()
    a.ROOT['authorship'] = 'Original ZCamp human hero silhouettes and animations, 2026-10-11'
    # Human silhouette: short heavy boots, broad pauldrons, large helmet and face.
    for side, x in [('L', -.17), ('R', .17)]:
        a.box('leather_boot', (x, -.065, .09), (.20, .29, .18), 'iron', .035, 'foot_'+side)
        a.box('gold_boot_edge', (x, -.065, .155), (.21, .28, .035), 'bronze', .009, 'foot_'+side)
        a.beam('greave', (x, 0, .16), (x, 0, .46), .16, 'cobalt', 'shin_'+side)
        a.ellipsoid('knee_armour', (x, -.035, .43), (.10, .085, .085), 'bronze', 'shin_'+side, 12, 8)
        a.beam('upper_leg', (x, 0, .43), (x, 0, .65), .17, 'iron', 'thigh_'+side)
    a.box('tunic', (0, 0, .72), (.43, .28, .34), 'cobalt', .045, 'hips')
    a.box('breastplate', (0, -.065, .90), (.47, .25, .35), 'edge_stone', .055, 'chest')
    a.box('blue_chest_inset', (0, -.202, .90), (.28, .025, .26), 'cobalt', .009, 'chest')
    a.emblem(0, -.223, .90, .62, 'bronze', 'chest')
    a.box('belt', (0, -.01, .66), (.46, .32, .07), 'timber', .012, 'hips')
    a.box('belt_buckle', (0, -.187, .66), (.095, .038, .095), 'bronze', .012, 'hips')
    a.ellipsoid('face', (0, -.055, 1.20), (.175, .145, .18), 'bone', 'head', 16, 10)
    a.ellipsoid('helmet', (0, -.01, 1.32), (.205, .18, .145), 'cobalt', 'head', 16, 10)
    a.box('helmet_brow', (0, -.18, 1.30), (.37, .055, .045), 'bronze', .012, 'head')
    for x in (-.062, .062): a.box('eye', (x, -.198, 1.23), (.027, .022, .027), 'recess', .005, 'head')
    a.box('helmet_crest', (0, .035, 1.465), (.07, .19, .16), 'bronze', .019, 'head')
    for side, x in [('L', -.30), ('R', .30)]:
        a.ellipsoid('heavy_pauldron', (x, 0, 1.00), (.18, .17, .12), 'bronze', 'arm_'+side, 12, 8)
        a.ellipsoid('blue_pauldron', (x, -.01, 1.04), (.15, .15, .085), 'cobalt', 'arm_'+side, 12, 8)
        a.beam('upper_arm', (x, -.01, .96), (x*1.18, -.04, .77), .14, 'edge_stone', 'arm_'+side)
        a.beam('forearm', (x*1.18, -.04, .77), (x*1.23, -.14, .63), .14, 'cobalt', 'hand_'+side)
        a.box('gauntlet', (x*1.23, -.15, .64), (.16, .16, .17), 'bronze', .025, 'hand_'+side)
    if asset == 'hero_camp_warden':
        # Broad kite shield, layered gold border, original sun relief; hand crossbow.
        shape = [(-.24, .28), (.24, .28), (.27, -.03), (0, -.39), (-.27, -.03)]
        vertices = [(-.43+x, y, .70+z) for y in (-.24, -.18) for x, z in shape]
        a.mesh('tower_shield_gold_border', vertices, [(0,4,3,2,1),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)], 'bronze', .019, 'hand_L')
        a.mesh('shield_blue_face', [(-.43+x*.83,-.273,.70+z*.83) for x,z in shape], [(0,4,3,2,1)], 'cobalt', 0, 'hand_L')
        a.emblem(-.43,-.29,.71,.92,'edge_stone','hand_L')
        crossbow(.40,-.23,.77,'hand_R',.8)
    elif asset == 'hero_vanguard_gunner':
        # Two swept bows and quiver/back rack distinguish the rapid-fire guard.
        for side, x in [('L',-.40),('R',.40)]: crossbow(x,-.24,.76,'hand_'+side,.9)
        a.box('back_quiver', (0,.24,.91), (.26,.20,.48), 'timber', .03, 'chest')
        for x in (-.075,0,.075): a.beam('reserve_bolt',(x,.24,.78),(x,.24,1.25),.025,'bronze','chest')
    else:
        # A stout foreman's backpack of real logs, broad axe and work apron.
        a.box('work_apron',(0,-.195,.58),(.38,.045,.32),'timber',.018,'hips')
        for x in (-.11,.11):
            log=a.cylinder('carried_log',(x,.27,.98),.09,.48,'timber',10,'chest')
            a.cylinder('log_end_grain',(x,.27,1.227),.085,.015,'wood_end',10,'chest')
        a.box('pack_strap',(0,.26,.91),(.45,.035,.08),'bronze',.01,'chest')
        a.beam('axe_handle',(.40,-.16,.41),(.40,-.16,1.04),.055,'timber','hand_R')
        a.mesh('axe_head',[(.34,-.19,.98),(.64,-.19,1.12),(.69,-.19,.85),(.35,-.19,.90),(.34,-.13,.98),(.64,-.13,1.12),(.69,-.13,.85),(.35,-.13,.90)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'edge_stone',.008,'hand_R')
        crossbow(-.40,-.23,.76,'hand_L',.75)
    a.anchor('attack_anchor', ((-.40 if asset=='hero_lumber_baron' else .40),-.51,.81), 'hand_L' if asset=='hero_lumber_baron' else 'hand_R')
    a.anchor('hit_anchor',(0,-.04,.93),'chest'); a.anchor('label_anchor',(0,0,1.61))
    actions()
    a.save_source(asset)


def actions():
    rig=a.RIG; rig.animation_data_create()
    for bone in rig.pose.bones: bone.rotation_mode='XYZ'
    for clip,last in [('idle',61),('attack',13)]:
        action=bpy.data.actions.new(clip); action.use_fake_user=True; rig.animation_data.action=action
        for frame in range(1,last+1,3):
            t=(frame-1)/(last-1)
            for bone in rig.pose.bones: bone.rotation_euler=(0,0,0); bone.location=(0,0,0)
            if clip=='idle':
                rig.pose.bones['chest'].rotation_euler.x=math.sin(t*math.tau)*.025
                rig.pose.bones['head'].rotation_euler.z=math.sin(t*math.tau)*.035
            else:
                recoil=math.sin(t*math.pi)
                rig.pose.bones['arm_R'].rotation_euler.x=-recoil*.33
                rig.pose.bones['arm_L'].rotation_euler.x=-recoil*.22
                rig.pose.bones['chest'].rotation_euler.x=-recoil*.08
            for bone in rig.pose.bones:
                bone.keyframe_insert(data_path='rotation_euler',frame=frame); bone.keyframe_insert(data_path='location',frame=frame)
        track=rig.animation_data.nla_tracks.new(); track.name=clip
        strip=track.strips.new(clip,1,action)
        if action.slots: strip.action_slot=action.slots[0]
        track.mute=True
    rig.animation_data.action=None
    for bone in rig.pose.bones: bone.rotation_euler=(0,0,0); bone.location=(0,0,0)
    bpy.context.scene.frame_set(1)


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


if __name__=='__main__':
    names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['hero_camp_warden','hero_vanguard_gunner','hero_lumber_baron']
    for name in names:
        if (HERE/'sources'/f'{name}.blend').exists(): raise FileExistsError(f'Refusing to overwrite saved source: {name}')
        if name not in ('hero_camp_warden','hero_vanguard_gunner','hero_lumber_baron'): raise ValueError(name)
        hero(name)
        bake_atlas(a.ROOT,bpy.data.objects[a.ROOT['export_mesh']],name)
        bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'sources'/f'{name}.blend'))

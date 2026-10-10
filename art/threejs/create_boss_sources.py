"""Author missing original Boss sources; never overwrite saved production sources.

Shares the sample's editable components, 14-joint convention and runtime surface.
Only newly named Boss sources are baked/saved. export_assets.py reads those files.
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import create_sample_sources as a

SCALE = 2.4


def skull():
    a.ellipsoid('lord_skull', (0, -.025, .985), (.15, .135, .155), 'bone', 'head', 12, 8)
    for x in (-.065, .065):
        a.ellipsoid('deep_eye_socket', (x, -.145, 1.00), (.05, .021, .045), 'recess', 'head', 10, 6)
        a.ellipsoid('soul_eye', (x, -.166, .997), (.016, .011, .022), 'spectral', 'head', 8, 6)
    a.box('lord_jaw', (0, -.055, .878), (.20, .16, .07), 'bone', .018, 'head')
    for x in (-.065, -.022, .022, .065):
        a.box('broad_tooth', (x, -.14, .883), (.026, .032, .047), 'bone', .008, 'head')


def body():
    a.ellipsoid('armoured_ribcage', (0, 0, .70), (.22, .15, .19), 'iron', 'chest', 12, 8)
    a.box('purple_breastplate', (0, -.135, .72), (.37, .05, .25), 'undead_cloth', .028, 'chest')
    a.emblem(0, -.174, .72, .75, 'bronze', 'chest')
    a.box('heavy_belt', (0, 0, .49), (.35, .24, .075), 'iron', .016, 'hips')
    a.box('belt_sigil', (0, -.143, .50), (.08, .035, .10), 'bronze', .01, 'hips')
    for side, x in [('L', -.14), ('R', .14)]:
        a.beam('armoured_thigh', (x, 0, .44), (x, 0, .26), .115, 'undead_cloth', 'thigh_'+side)
        a.box('knee_plate', (x, -.05, .25), (.13, .11, .11), 'iron', .02, 'shin_'+side)
        a.beam('heavy_greave', (x, 0, .23), (x, 0, .075), .09, 'iron', 'shin_'+side)
        a.ellipsoid('iron_boot', (x, -.065, .05), (.09, .145, .05), 'iron', 'foot_'+side, 12, 8)
        a.beam('upper_arm', (x*1.5, 0, .75), (x*2, -.02, .59), .095, 'bone_shadow', 'arm_'+side)
        a.beam('forearm', (x*2, -.02, .59), (x*2.25, -.055, .46), .095, 'iron', 'hand_'+side)
        a.box('heavy_gauntlet', (x*2.23, -.05, .49), (.12, .11, .13), 'iron', .02, 'hand_'+side)
    skull()


def charger():
    a.start('charger_lord'); a.make_rig(); body()
    # Wide, low, heavy shoulder line; swept tusks are unique to the charger.
    for side, x in [('L', -.24), ('R', .24)]:
        a.ellipsoid('siege_pauldron', (x, .01, .81), (.20, .18, .105), 'iron', 'arm_'+side, 12, 8)
        a.box('pauldron_gold_lip', (x, -.13, .81), (.28, .035, .09), 'bronze', .012, 'arm_'+side)
        for i in range(2):
            a.beam('shoulder_spike', (x, .015+i*.08, .875), (x*1.30, .02+i*.08, 1.02), .055, 'bone', 'arm_'+side)
    a.ellipsoid('closed_helm', (0, .005, 1.06), (.165, .145, .12), 'iron', 'head', 12, 8)
    a.box('helm_brow', (0, -.145, 1.06), (.30, .05, .045), 'bronze', .008, 'head')
    for x in (-.14, .14):
        a.tube('swept_siege_horn', [(x, -.025, 1.12), (x*1.9, .035, 1.18), (x*2.35, -.06, 1.29)], .038, 'bone', 'head')
    # Physical thick split skirt and short back cloak, versus the king's long robe.
    for x in (-.10, .10):
        a.box('plate_skirt', (x, -.075, .40), (.16, .14, .17), 'undead_cloth', .02, 'hips')
    a.box('short_war_cloak', (0, .17, .60), (.40, .035, .36), 'undead_cloth', .015, 'chest')
    # Tall slab shield and a broad double axe, readable without fine textures.
    a.box('tower_shield', (-.38, -.12, .54), (.23, .09, .50), 'iron', .035, 'hand_L')
    a.box('shield_purple_inlay', (-.38, -.178, .54), (.15, .025, .36), 'undead_cloth', .016, 'hand_L')
    a.emblem(-.38, -.196, .54, .74, 'bronze', 'hand_L')
    a.beam('axe_haft', (.34, -.08, .34), (.34, -.08, .96), .054, 'timber', 'hand_R')
    for sign in (-1, 1):
        a.mesh('siege_axe_blade', [( .34, -.09, .75), (.34+sign*.20, -.09, .70), (.34+sign*.23, -.09, .93), (.34, -.09, .91), (.34+sign*.14, -.13, .82)], [(0,1,4),(1,2,4),(2,3,4),(3,0,4),(0,3,2,1)], 'edge_stone', .009, 'hand_R')
    finish('charger_lord', [('warning', 61), ('charge', 25)])


def king():
    a.start('undead_king'); a.make_rig(); body()
    # Narrow vertical crowned head, long fanned cloak and broad robe hem.
    crown=a.cylinder('crown_band', (0, -.008, 1.12), .16, .07, 'bronze', 10, 'head')
    for i in range(5):
        t=i*math.tau/5
        x=.15*math.cos(t); y=-.008+.15*math.sin(t)
        a.beam('crown_point', (x,y,1.13), (x*.92,y*.92,1.29+(i%2)*.035), .040, 'bronze', 'head')
    a.ellipsoid('crown_soul_jewel', (0,-.181,1.16), (.035,.025,.045), 'spectral', 'head', 8, 6)
    a.mesh('long_royal_robe', [(-.17,-.13,.49),(.17,-.13,.49),(.29,-.15,.12),(.10,-.18,.09),(0,-.18,.16),(-.10,-.18,.09),(-.29,-.15,.12)], [(0,1,2,3,4,5,6)], 'undead_cloth', 0, 'hips')
    a.mesh('royal_cape', [(-.29,.15,.82),(.29,.15,.82),(.34,.25,.17),(0,.29,.08),(-.34,.25,.17)], [(0,1,2,3,4)], 'undead_cloth', 0, 'chest')
    for x in (-.19,.19):
        a.beam('gold_robe_edge', (x*.7,-.164,.47),(x*1.37,-.17,.13),.020,'bronze','hips')
        a.ellipsoid('royal_pauldron', (x*1.18,0,.82),(.12,.14,.065),'bronze','arm_L' if x<0 else 'arm_R',12,8)
    # Held ceremonial sceptre, visual only: no new spell/remote attack rules.
    a.beam('royal_sceptre', (.34,-.08,.19),(.34,-.08,1.17),.043,'bronze','hand_R')
    for x in (.25,.43):
        a.tube('sceptre_fork',[(.34,-.08,.94),(x,-.08,1.12),(.34,-.08,1.25)],.025,'bronze','hand_R')
    a.ellipsoid('sceptre_soul',(.34,-.08,1.12),(.065,.065,.10),'spectral','hand_R',8,6)
    a.box('left_royal_bracer',(-.31,-.05,.48),(.12,.11,.15),'bronze',.018,'hand_L')
    finish('undead_king', [('inspire', 121)])


def actions(extra):
    rig=a.RIG; rig.animation_data_create()
    for bone in rig.pose.bones: bone.rotation_mode='XYZ'
    for clip,last in [('walk',25),('attack',25),('hit',10),('death',28)]+extra:
        action=bpy.data.actions.new(clip); action.use_fake_user=True; rig.animation_data.action=action
        frames=sorted(set(range(1,last+1,3))|{last})
        for frame in frames:
            t=(frame-1)/(last-1); wave=math.sin(t*math.tau)
            for bone in rig.pose.bones: bone.rotation_euler=(0,0,0); bone.location=(0,0,0)
            if clip in ('walk','charge'):
                for side,sign in [('L',1),('R',-1)]:
                    rig.pose.bones['thigh_'+side].rotation_euler.x=wave*sign*(.55 if clip=='charge' else .35)
                    rig.pose.bones['shin_'+side].rotation_euler.x=max(0,-wave*sign)*.5
                    rig.pose.bones['arm_'+side].rotation_euler.x=-wave*sign*.18
                rig.pose.bones['chest'].rotation_euler.x=.32 if clip=='charge' else .02
            elif clip=='warning':
                rig.pose.bones['chest'].rotation_euler.x=.13+.22*t
                rig.pose.bones['arm_L'].rotation_euler.x=-.65*t
                rig.pose.bones['arm_R'].rotation_euler.x=-.80*t
            elif clip=='inspire':
                lift=min(1,t*5)*min(1,(1-t)*5)
                rig.pose.bones['arm_R'].rotation_euler.x=-1.25*lift
                rig.pose.bones['hand_R'].rotation_euler.x=.35*lift
                rig.pose.bones['arm_L'].rotation_euler.x=-.7*lift
                rig.pose.bones['arm_L'].rotation_euler.z=-.4*lift
                rig.pose.bones['head'].rotation_euler.x=-.12*lift
            elif clip=='attack':
                swing=math.sin(math.pi*t)
                rig.pose.bones['arm_R'].rotation_euler.x=-1.5*swing
                rig.pose.bones['hand_R'].rotation_euler.x=.7*swing
                rig.pose.bones['chest'].rotation_euler.x=.2*swing
            elif clip=='hit':
                rig.pose.bones['chest'].rotation_euler.x=-.25*math.sin(t*math.pi)
                rig.pose.bones['head'].rotation_euler.x=-.2*math.sin(t*math.pi)
            else:
                fall=min(1,t*1.6)
                rig.pose.bones['root'].rotation_euler.x=-1.42*fall
                rig.pose.bones['root'].location.y=-.10*fall*SCALE
                rig.pose.bones['root'].location.z=.1*fall*SCALE
                rig.pose.bones['arm_R'].rotation_euler.z=.45*fall
            for bone in rig.pose.bones:
                bone.keyframe_insert(data_path='rotation_euler',frame=frame)
                bone.keyframe_insert(data_path='location',frame=frame)
        track=rig.animation_data.nla_tracks.new(); track.name=clip
        strip=track.strips.new(clip,1,action)
        if action.slots: strip.action_slot=action.slots[0]
        track.mute=True
    rig.animation_data.action=None
    for bone in rig.pose.bones: bone.rotation_euler=(0,0,0); bone.location=(0,0,0)
    bpy.context.scene.frame_set(1)


def atlas(root,body,name):
    # Bake the retained source materials into the same controlled 512 PBR protocol.
    bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=16
    materials=list(body.data.materials)
    color=bpy.data.images.new(name+'_base_color_atlas',width=512,height=512,alpha=False)
    color.colorspace_settings.name='sRGB'
    for mat in materials:
        target=mat.node_tree.nodes.new('ShaderNodeTexImage'); target.image=color; mat.node_tree.nodes.active=target
    bpy.ops.object.bake(type='DIFFUSE',pass_filter={'COLOR'},margin=5); color.pack()
    packed=bpy.data.images.new(name+'_roughness_metallic_atlas',width=512,height=512,alpha=False)
    packed.colorspace_settings.name='Non-Color'; previous=[]
    for mat in materials:
        nodes=mat.node_tree.nodes; links=mat.node_tree.links
        bsdf=nodes.get('Principled BSDF'); output=next(node for node in nodes if node.type=='OUTPUT_MATERIAL')
        previous.append((mat,output,output.inputs['Surface'].links[0].from_socket))
        emission=nodes.new('ShaderNodeEmission'); emission.inputs['Color'].default_value=(1,bsdf.inputs['Roughness'].default_value,bsdf.inputs['Metallic'].default_value,1)
        links.new(emission.outputs[0],output.inputs['Surface'])
        target=nodes.new('ShaderNodeTexImage'); target.image=packed; nodes.active=target
    bpy.ops.object.bake(type='EMIT',margin=3); packed.pack()
    for mat,output,socket in previous: mat.node_tree.links.new(socket,output.inputs['Surface'])
    material=bpy.data.materials.new(name+'_pbr_atlas'); material.use_nodes=True; material.use_backface_culling=True
    nodes=material.node_tree.nodes; links=material.node_tree.links; bsdf=nodes.get('Principled BSDF')
    base=nodes.new('ShaderNodeTexImage'); base.image=color; links.new(base.outputs['Color'],bsdf.inputs['Base Color'])
    orm=nodes.new('ShaderNodeTexImage'); orm.image=packed
    separate=nodes.new('ShaderNodeSeparateColor'); links.new(orm.outputs['Color'],separate.inputs['Color'])
    links.new(separate.outputs['Green'],bsdf.inputs['Roughness']); links.new(separate.outputs['Blue'],bsdf.inputs['Metallic'])
    ao=nodes.new('ShaderNodeTexImage'); ao.image=bpy.data.images[name+'_ao']
    output=nodes.new('ShaderNodeGroup'); output.node_tree=bpy.data.node_groups['glTF Material Output']; links.new(ao.outputs['Color'],output.inputs['Occlusion'])
    body.data.materials.clear(); body.data.materials.append(material)
    for polygon in body.data.polygons: polygon.material_index=0
    root['atlas_revision']=1; scene.render.engine='BLENDER_EEVEE'


def finish(name,extra):
    for obj in a.PARTS:
        obj.location*=SCALE; obj.scale*=SCALE
        for modifier in obj.modifiers:
            if modifier.type=='BEVEL': modifier.width*=SCALE
        if obj.type=='MESH' and len(obj.data.polygons)==1:
            mod=obj.modifiers.new('physical_cloth_faces','SOLIDIFY'); mod.thickness=.012
    rig=a.RIG; bpy.context.view_layer.objects.active=rig; rig.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones: bone.head*=SCALE; bone.tail*=SCALE
    bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False); bpy.context.view_layer.update()
    a.anchor('hit_anchor',(0,-.05*SCALE,.72*SCALE),'chest')
    a.anchor('attack_anchor',(.34*SCALE,-.08*SCALE,1.12*SCALE),'hand_R')
    a.anchor('label_anchor',(0,0,1.4*SCALE))
    actions(extra)
    a.save_source(name)
    body=bpy.data.objects[a.ROOT['export_mesh']]
    # Root skin transform is identity; all production coordinates are already metres.
    atlas(a.ROOT,body,name)
    a.ROOT['production_family']='original charger lord' if name=='charger_lord' else 'original undead king'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(HERE/'sources'/f'{name}.blend'))


if __name__=='__main__':
    names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['charger_lord','undead_king']
    for name in names:
        if (HERE/'sources'/f'{name}.blend').exists(): raise FileExistsError(f'Refusing to overwrite saved source: {name}')
        if name=='charger_lord': charger()
        elif name=='undead_king': king()
        else: raise ValueError(name)

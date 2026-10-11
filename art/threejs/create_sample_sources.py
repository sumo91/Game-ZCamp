"""Original ZCamp sample construction, Blender 5.2.1. Run only to create new sources.

The saved .blend is the editable production source. export_assets.py reads it without
reconstructing or overwriting it. Shapes, palette, UVs, AO, rig and Actions are original.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from runtime_surface import merge_runtime_surface

PARTS = []
MATS = {}
ROOT = None
RIG = None

def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def material(name, color, rough=.8, metal=0, pattern='stone'):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    rgb = tuple(int(color[i:i+2],16)/255 for i in (0,2,4))
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = tuple(linear(c) for c in rgb)+(1,)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    # Quiet hand-authored surface variation; separate from structural AO.
    img = bpy.data.images.new(name+'_surface', width=128, height=128, alpha=False)
    img.colorspace_settings.name = 'sRGB'
    rng = random.Random(name)
    pixels = []
    for y in range(128):
        for x in range(128):
            grain = math.sin(x*.27+math.sin(y*.065)*2)*.055 if pattern=='wood' else math.sin(x*.13)*math.sin(y*.15)*.025
            shade = .93+grain+rng.uniform(-.018,.018)
            pixels.extend([max(0,min(1,c*shade)) for c in rgb]+[1])
    img.pixels.foreach_set(pixels)
    img.pack()
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = img
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    MATS[name] = mat
    return mat

def start(asset):
    global ROOT,RIG,PARTS,MATS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS=[]; MATS={}; RIG=None
    ROOT=bpy.data.objects.new('asset_root',None)
    bpy.context.scene.collection.objects.link(ROOT)
    ROOT['asset_id']=asset
    ROOT['authorship']='Original ZCamp geometry, surfaces and animation, 2026-10-09'
    ROOT['units']='metres; foot/base centre origin; GLB +Z front'
    scene=bpy.context.scene
    scene.unit_settings.system='METRIC'
    scene.unit_settings.scale_length=1
    scene.render.fps=30
    material('limestone','A4A5A5',.87)
    material('edge_stone','C5C0AE',.8)
    material('recess','323442',.95)
    material('cobalt','24529A',.5,0,'roof')
    material('roof_highlight','3D71BC',.54,0,'roof')
    material('bronze','CCA352',.45,.55)
    material('timber','705033',.88,0,'wood')
    material('wood_end','AE8650',.84,0,'wood')
    material('iron','404653',.55,.4)
    material('bone','DBCEAD',.77)
    material('bone_shadow','A79986',.83)
    material('undead_cloth','55416A',.9)
    material('spectral','81B55E',.7)

def finish_part(obj,name,mat,bone=None,bevel=0):
    obj.name=name
    obj.data.materials.append(MATS[mat])
    obj.parent=ROOT
    if bevel:
        mod=obj.modifiers.new('editable_edge_bevel','BEVEL'); mod.width=bevel; mod.segments=2
        mod.harden_normals=True
        normal=obj.modifiers.new('surface_normals','WEIGHTED_NORMAL'); normal.keep_sharp=True
    if bone:
        vg=obj.vertex_groups.new(name=bone); vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    PARTS.append(obj)
    return obj

def box(name,loc,size,mat,bevel=.02,bone=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    obj=bpy.context.object; obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish_part(obj,name,mat,bone,bevel)

def mesh(name,verts,faces,mat,bevel=.012,bone=None):
    data=bpy.data.meshes.new(name); data.from_pydata(verts,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.scene.collection.objects.link(obj)
    return finish_part(obj,name,mat,bone,bevel)

def ellipsoid(name,loc,size,mat,bone=None,segments=16,rings=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    obj=bpy.context.object; obj.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for poly in obj.data.polygons: poly.use_smooth=True
    return finish_part(obj,name,mat,bone)

def tube(name,points,radius,mat,bone=None):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.resolution_u=1
    curve.bevel_depth=radius; curve.bevel_resolution=1; curve.resolution_u=2
    spline=curve.splines.new('POLY'); spline.points.add(len(points)-1)
    for p,co in zip(spline.points,points): p.co=(*co,1)
    obj=bpy.data.objects.new(name,curve); bpy.context.scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active=obj; obj.select_set(True)
    bpy.ops.object.convert(target='MESH'); obj=bpy.context.object
    obj.select_set(False)
    return finish_part(obj,name,mat,bone)

def cylinder(name,loc,radius,depth,mat,vertices=12,bone=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    return finish_part(bpy.context.object,name,mat,bone,.012)

def beam(name,a,b,width,mat,bone=None):
    mid=(Vector(a)+Vector(b))/2; direction=Vector(b)-Vector(a)
    obj=box(name,mid,(width,width,direction.length),mat,width*.22,bone)
    obj.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    return obj

def anchor(name,loc,bone=None):
    obj=bpy.data.objects.new(name,None); bpy.context.scene.collection.objects.link(obj)
    if bone:
        obj.parent=RIG; obj.parent_type='BONE'; obj.parent_bone=bone
        bpy.context.view_layer.update()
        obj.matrix_world.translation=Vector(loc)
    else: obj.parent=ROOT; obj.location=loc
    return obj

def arch(name,x,y,z,w,h,mat):
    # Recess silhouette and individual wedge stones, rather than a black square.
    box(name+'_dark',(x,y,z+h*.35),(w,.04,h*.65),'recess',.03)
    for side in (-1,1): box(name+'_jamb',(x+side*(w/2+.055),y-.018,z+h*.32),(.115,.09,h*.64),mat,.017)
    for i in range(7):
        a=math.pi*i/7; b=math.pi*(i+1)/7
        r=w*.5; outer=r+.12; center=z+h*.64
        vs=[(x+rr*math.cos(t),y+yy,center+rr*math.sin(t)) for yy in (-.06,.03) for rr,t in ((r,a+.015),(r,b-.015),(outer,b-.015),(outer,a+.015))]
        mesh(name+'_voussoir',vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],mat,.012)

def roof(name,x,y,z,w,d,h):
    vs=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d/2,z+h),(x,y+d/2,z+h)]
    mesh(name,vs,[(0,4,5,3),(4,1,2,5),(0,1,4),(3,5,2),(0,3,2,1)],'cobalt',.028)
    beam(name+'_ridge',(x,y-d/2-.025,z+h),(x,y+d/2+.025,z+h),.075,'bronze')
    for side in (-1,1):
        beam(name+'_eave',(x+side*w/2,y-d/2,z),(x+side*w/2,y+d/2,z),.065,'roof_highlight')
        for i in range(1,4):
            yy=y-d/2+d*i/4
            beam(name+'_tile_seam',(x+side*w/2,yy,z+.013),(x,yy,z+h+.013),.019,'roof_highlight')

def emblem(x,y,z,scale=1,mat='bronze',bone=None):
    # Original split sun/chevron relief; no third-party insignia.
    tube('sun_chevron',[(x-.12*scale,y,z+.07*scale),(x,y,z-.08*scale),(x+.12*scale,y,z+.07*scale)],.022*scale,mat,bone)
    for dx in (-.085,0,.085): beam('sun_ray',(x+dx*scale,y,z+.12*scale),(x+dx*scale,y,z+.17*scale),.018*scale,mat,bone)

def tower(tier):
    start('arrow_tower_'+tier)
    stage={'low':0,'medium':1,'high':2}[tier]
    box('stepped_foundation',(0,0,.065),(1.48,1.28,.13),'limestone',.055)
    box('foundation_cap',(0,0,.17),(1.3,1.1,.11),'edge_stone',.04)
    box('shaft_recess',(0,0,.66),(.91,.75,.89),'recess',.04)
    for row in range(4):
        for side in (-1,1):
            for j in range(3):
                box('stone_course',((j-1)*.31, side*.386,.29+row*.2),(.29,.135,.18),'limestone',.021)
        for x in (-.47,.47):
            for j in range(3): box('side_stone_course',(x,(j-1)*.245,.29+row*.2),(.12,.225,.18),'limestone',.021)
    # Front doorway occupies the central face. A shadowed recess has a segmented arch.
    arch('entry_arch',0,-.475,.24,.28,.61,'edge_stone')
    for x in (-.54,.54):
        for y in (-.4,.4):
            box('corner_buttress',(x,y,.58),(.19,.2,.77),'edge_stone',.023)
            box('buttress_foot',(x,y,.27),(.25,.26,.16),'limestone',.025)
    for x in (-.485,.485): box('arrow_slit',(x,0,.75),(.016,.08,.27),'recess',.007)
    box('corbel_belt',(0,0,1.09),(1.12,.99,.17),'edge_stone',.027)
    box('wood_fighting_deck',(0,0,1.21),(1.43,1.23,.16),'timber',.04)
    box('blue_platform_fascia',(0,-.625,1.25),(1.43,.08,.18),'cobalt',.025)
    box('platform_gold_lip',(0,-.676,1.32),(1.49,.045,.06),'bronze',.016)
    for x in (-.64,.64):
        box('parapet',(x,0,1.38),(.14,1.17,.24),'cobalt',.024)
        for y in (-.49,0,.49): box('parapet_merlon',(x,y,1.53),(.17,.18,.11),'edge_stone',.018)
    roof('blue_rear_canopy',0,.37,1.43,.85,.49,.32)
    for x in (-.35,.35): beam('canopy_post',(x,.53,1.29),(x,.53,1.49),.085,'timber')
    # Readable stationed archer with broad pauldrons, helmet and a large bow.
    ellipsoid('archer_torso',(0,-.08,1.49),(.15,.11,.18),'cobalt')
    for x in (-.13,.13): ellipsoid('archer_pauldron',(x,-.08,1.58),(.09,.075,.065),'bronze')
    ellipsoid('archer_face',(0,-.11,1.73),(.082,.07,.095),'bone')
    ellipsoid('archer_helmet',(0,-.095,1.8),(.096,.086,.07),'iron')
    box('helmet_gold_rim',(0,-.14,1.77),(.17,.055,.035),'bronze',.01)
    tube('large_bow',[(-.19,-.4,1.39),(-.26,-.46,1.56),(-.26,-.46,1.73),(-.19,-.4,1.88)],.027,'wood_end')
    tube('bowstring',[(-.19,-.4,1.39),(-.115,-.38,1.63),(-.19,-.4,1.88)],.005,'edge_stone')
    beam('archer_arm',(-.12,-.06,1.57),(-.18,-.4,1.62),.065,'bone')
    beam('nocked_arrow',(-.1,-.34,1.63),(-.1,-.65,1.63),.02,'timber')
    box('front_banner',(0,-.515,.88),(.24,.028,.29),'cobalt',.009)
    emblem(0,-.54,.89,.62)
    if stage>=1:
        for x in (-.62,.62):
            beam('gold_corner_support',(x,-.49,.43),(x,-.49,1.21),.075,'bronze')
            box('front_battlement',(x,-.58,1.48),(.25,.2,.3),'edge_stone',.035)
        box('reinforced_plinth',(0,0,.06),(1.65,1.4,.12),'edge_stone',.05)
    if stage>=2:
        for x in (-.64,.64):
            beam('flag_mast',(x,.48,1.51),(x,.48,2.02),.043,'bronze')
            mesh('blue_swallowtail',[(x,.48,1.99),(x+.25,.48,1.92),(x+.2,.48,1.85),(x+.26,.48,1.77),(x,.48,1.8)],[(0,1,2,3,4)],'cobalt',0)
        box('gold_deck_belt',(0,0,1.12),(1.48,1.26,.065),'bronze',.02)
    anchor('attack_anchor',(-.1,-.69,1.63)); anchor('hit_anchor',(0,0,.82)); anchor('label_anchor',(0,-.7,.05))
    save_source('arrow_tower_'+tier)

def make_rig():
    global RIG
    data=bpy.data.armatures.new('skeleton_shared_rig')
    RIG=bpy.data.objects.new('skeleton_rig',data); bpy.context.scene.collection.objects.link(RIG); RIG.parent=ROOT
    bpy.context.view_layer.objects.active=RIG; RIG.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    bones=[('root',(0,0,0),(0,0,.12),None),('hips',(0,0,.43),(0,0,.59),'root'),('chest',(0,0,.59),(0,0,.79),'hips'),('head',(0,0,.79),(0,0,1.03),'chest')]
    for side,x in [('L',-.14),('R',.14)]:
        bones.extend([(f'thigh_{side}',(x,0,.44),(x,0,.25),'hips'),(f'shin_{side}',(x,0,.25),(x,0,.08),f'thigh_{side}'),(f'foot_{side}',(x,0,.08),(x,-.11,.06),f'shin_{side}'),(f'arm_{side}',(x*1.5,0,.75),(x*2.0,-.02,.59),'chest'),(f'hand_{side}',(x*2,-.02,.59),(x*2.25,-.055,.46),f'arm_{side}')])
    for name,head,tail,parent in bones:
        b=data.edit_bones.new(name); b.head=head; b.tail=tail
        if parent: b.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT'); RIG.select_set(False)

def skeleton():
    start('skeleton_infantry'); make_rig()
    # Oversized skull, actual hollow cut sockets, cheek planes and separated jaw.
    head=ellipsoid('skull_cranium',(0,-.012,.96),(.185,.144,.184),'bone','head',20,12)
    for x in (-.075,.075):
        cutter=ellipsoid('socket_cutter',(x,-.127,.982),(.069,.076,.067),'recess',segments=12,rings=8)
        mod=head.modifiers.new('sculpted_eye_socket','BOOLEAN'); mod.operation='DIFFERENCE'; mod.object=cutter
        bpy.context.view_layer.objects.active=head; bpy.ops.object.modifier_apply(modifier=mod.name)
        PARTS.remove(cutter); bpy.data.objects.remove(cutter,do_unlink=True)
        ellipsoid('socket_dark',(x,-.085,.982),(.058,.045,.055),'recess','head',12,8)
        ellipsoid('quiet_soul_eye',(x,-.127,.974),(.02,.012,.018),'spectral','head',8,6)
    mesh('nose_cavity',[(-.023,-.15,.93),(.023,-.15,.93),(0,-.155,.963),(0,-.12,.94)],[(0,1,2),(0,3,1),(0,2,3),(1,3,2)],'recess',0,'head')
    for x in (-.126,.126): ellipsoid('cheek_bone',(x,-.09,.9),(.058,.06,.045),'bone','head',12,8)
    tube('mandible',[(-.115,-.05,.88),(-.095,-.128,.847),(0,-.145,.829),(.095,-.128,.847),(.115,-.05,.88)],.029,'bone','head')
    for x in (-.06,-.02,.02,.06): box('visible_tooth',(x,-.139,.87),(.028,.032,.041),'bone',.009,'head')
    for z in (.49,.55,.61,.67,.73): box('vertebra',(0,.018,z),(.073,.069,.045),'bone_shadow',.01,'chest' if z>.59 else 'hips')
    for i in range(4):
        z=.60+i*.044; radius=.108+i*.009
        for side in (-1,1):
            pts=[(0,.016,z+.024),(side*radius*.65,.007,z+.035),(side*radius,-.035,z+.006),(side*radius*.78,-.09,z-.012),(side*.036,-.1,z)]
            tube('curved_rib',pts,.016,'bone','chest')
    beam('sternum',(0,-.102,.61),(0,-.095,.76),.028,'bone','chest')
    for side,x in [('L',-.14),('R',.14)]:
        tube('pelvis',[(0,0,.47),(x*.8,-.015,.49),(x,-.02,.437),(x*.65,-.03,.41)],.03,'bone', 'hips')
        beam('femur',(x,0,.43),(x,0,.26),.065,'bone',f'thigh_{side}')
        ellipsoid('knee',(x,-.015,.25),(.045,.038,.043),'bone_shadow',f'shin_{side}',12,8)
        beam('shin',(x,0,.23),(x,0,.075),.048,'bone',f'shin_{side}')
        ellipsoid('skeletal_boot',(x,-.05,.048),(.065,.114,.046),'iron',f'foot_{side}',12,8)
        beam('clavicle',(0,-.014,.762),(x*1.5,0,.75),.035,'bone','chest')
        ellipsoid('pauldron',(x*1.5,.012,.757),(.081,.074,.052),'undead_cloth',f'arm_{side}',12,8)
        beam('upper_arm',(x*1.5,0,.735),(x*2,-.02,.59),.049,'bone',f'arm_{side}')
        ellipsoid('elbow',(x*2,-.02,.59),(.033,.033,.033),'bone_shadow',f'hand_{side}',10,6)
        beam('forearm',(x*2,-.02,.58),(x*2.25,-.055,.47),.043,'bone',f'hand_{side}')
        box('gauntlet',(x*2.22,-.05,.49),(.07,.067,.08),'iron',.017,f'hand_{side}')
    box('belt',(0,0,.5),(.26,.17,.048),'iron',.012,'hips')
    # Torn purple tabard with a deliberately uneven hem and thick edge.
    mesh('ragged_tabard',[(-.13,-.09,.49),(.13,-.09,.49),(.14,-.1,.37),(.055,-.104,.4),(.017,-.105,.355),(-.045,-.104,.39),(-.12,-.1,.37)],[(0,1,2,3,4,5,6)],'undead_cloth',0,'hips')
    emblem(0,-.118,.447,.42,'bone_shadow','hips')
    # Kite shield: angular heavy rim, blue-purple face and bronze boss.
    vs=[(-.34+xx,-.13+yy,.48+zz) for yy in (-.025,.025) for xx,zz in [(-.115,.16),(.115,.16),(.14,-.025),(0,-.23),(-.14,-.025)]]
    faces=[(0,4,3,2,1),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
    mesh('shield_frame',vs,faces,'iron',.019,'hand_L')
    vs2=[(-.34+xx,-.165,.48+zz) for xx,zz in [(-.089,.13),(.089,.13),(.11,-.025),(0,-.188),(-.11,-.025)]]
    mesh('shield_face',vs2,[(0,4,3,2,1)],'undead_cloth',0,'hand_L')
    emblem(-.34,-.177,.475,.64,'bronze','hand_L')
    ellipsoid('shield_boss',(-.34,-.179,.49),(.03,.025,.032),'bronze','hand_L',10,6)
    # Broad weapon blade with distinct ridge faces; silhouette stays readable at game size.
    beam('sword_grip',(.33,-.068,.43),(.33,-.068,.57),.043,'timber','hand_R')
    box('sword_guard',(.33,-.068,.575),(.21,.066,.035),'bronze',.012,'hand_R')
    mesh('sword_blade',[(.28,-.073,.59),(.38,-.073,.59),(.36,-.073,.88),(.33,-.073,.99),(.30,-.073,.88),(.33,-.106,.65),(.33,-.106,.88)],[(0,5,6,4),(4,6,3),(5,1,2,6),(6,2,3),(0,4,3,2,1)],'edge_stone',.005,'hand_R')
    anchor('hit_anchor',(0,-.04,.69),'chest'); anchor('attack_anchor',(.33,-.07,.96),'hand_R'); anchor('label_anchor',(0,0,1.15))
    animations()
    save_source('skeleton_infantry')

def animations():
    RIG.animation_data_create()
    for bone in RIG.pose.bones: bone.rotation_mode='XYZ'
    for clip,last in [('walk',25),('attack',25),('hit',10),('death',29)]:
        action=bpy.data.actions.new(clip); action.use_fake_user=True; RIG.animation_data.action=action
        for frame in range(1,last+1,3):
            t=(frame-1)/(last-1); wave=math.sin(t*math.tau)
            for b in RIG.pose.bones: b.rotation_euler=(0,0,0); b.location=(0,0,0)
            if clip=='walk':
                for side,sign in [('L',1),('R',-1)]:
                    RIG.pose.bones['thigh_'+side].rotation_euler.x=wave*sign*.48
                    RIG.pose.bones['shin_'+side].rotation_euler.x=max(0,-wave*sign)*.62
                    RIG.pose.bones['arm_'+side].rotation_euler.x=-wave*sign*.23
                RIG.pose.bones['hips'].location.y=abs(wave)*.012
                RIG.pose.bones['chest'].rotation_euler.z=wave*.045
            elif clip=='attack':
                swing=math.sin(math.pi*t)
                RIG.pose.bones['arm_R'].rotation_euler.x=-swing*1.55
                RIG.pose.bones['hand_R'].rotation_euler.x=swing*.85
                RIG.pose.bones['chest'].rotation_euler.x=swing*.16
                RIG.pose.bones['arm_L'].rotation_euler.x=-swing*.25
            elif clip=='hit':
                recoil=math.sin(t*math.pi)
                RIG.pose.bones['chest'].rotation_euler.x=-recoil*.35
                RIG.pose.bones['head'].rotation_euler.x=-recoil*.25
            else:
                fall=min(1,t*1.6)
                RIG.pose.bones['root'].rotation_euler.x=-fall*1.42
                RIG.pose.bones['root'].location.y=-fall*.06
                RIG.pose.bones['root'].location.z=fall*.10
                RIG.pose.bones['arm_R'].rotation_euler.z=fall*.45
                RIG.pose.bones['head'].rotation_euler.z=fall*.28
            for b in RIG.pose.bones:
                b.keyframe_insert(data_path='rotation_euler',frame=frame); b.keyframe_insert(data_path='location',frame=frame)
        track=RIG.animation_data.nla_tracks.new(); track.name=clip
        strip=track.strips.new(clip,1,action)
        if action.slots: strip.action_slot=action.slots[0]
        track.mute=True
    RIG.animation_data.action=None
    for b in RIG.pose.bones: b.rotation_euler=(0,0,0); b.location=(0,0,0)
    bpy.context.scene.frame_set(1)

def save_source(asset):
    # Save original editable modules alongside a merged, UV-unwrapped runtime derivative.
    originals=bpy.data.collections.new('editable_modules'); bpy.context.scene.collection.children.link(originals)
    runtime=bpy.data.collections.new('runtime_export'); bpy.context.scene.collection.children.link(runtime)
    for obj in PARTS:
        for col in list(obj.users_collection): col.objects.unlink(obj)
        originals.objects.link(obj)
    body=merge_runtime_surface(PARTS,runtime,ROOT,asset)
    originals.hide_render=True; originals.hide_viewport=True
    ao=bpy.data.images.new(asset+'_ao',width=512,height=512,alpha=False)
    ao.colorspace_settings.name='Non-Color'
    for mat in body.data.materials:
        nodes=mat.node_tree.nodes; target=nodes.new('ShaderNodeTexImage'); target.image=ao; nodes.active=target
    scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=16
    bpy.ops.object.bake(type='AO',margin=3)
    ao.pack()
    group=bpy.data.node_groups.new('glTF Material Output','ShaderNodeTree')
    group.interface.new_socket(name='Occlusion',in_out='INPUT',socket_type='NodeSocketFloat')
    for mat in body.data.materials:
        nodes=mat.node_tree.nodes; ao_node=nodes.new('ShaderNodeTexImage'); ao_node.image=ao
        output=nodes.new('ShaderNodeGroup'); output.node_tree=group
        mat.node_tree.links.new(ao_node.outputs['Color'],output.inputs['Occlusion'])
    if RIG:
        body.parent=RIG
        skin=body.modifiers.new('shared_rig_skin','ARMATURE'); skin.object=RIG
    ROOT['export_mesh']=body.name
    scene.render.engine='BLENDER_EEVEE'
    source=HERE/'sources'/f'{asset}.blend'; source.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    print('ZCAMP_SOURCE_SAVED',source,flush=True)

if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['arrow_tower_low','skeleton_infantry']
    for name in args:
        if name.startswith('arrow_tower_'): tower(name.removeprefix('arrow_tower_'))
        elif name=='skeleton_infantry': skeleton()
        else: raise ValueError(name)

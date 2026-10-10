"""Create four original undead derivatives from the saved, refined skeleton rig.

Never overwrites a source. Reuses the authored 14-joint skeleton and four Actions;
new body/equipment meshes, rigid weights and 512px PBR atlases are editable.
Run Blender --background --python ... -- undead_runner undead_tank ...
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import create_sample_sources as shapes
from runtime_surface import merge_runtime_surface


def material(name, color, rough, metal=0):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    mat.use_backface_culling=True
    bsdf=next(node for node in mat.node_tree.nodes if node.type=='BSDF_PRINCIPLED')
    rgb=tuple(int(color[i:i+2],16)/255 for i in (0,2,4))
    bsdf.inputs['Base Color'].default_value=tuple(shapes.linear(c) for c in rgb)+(1,)
    bsdf.inputs['Roughness'].default_value=rough
    bsdf.inputs['Metallic'].default_value=metal
    shapes.MATS[name]=mat


def bake_surface(root, body, name):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    materials = list(body.data.materials)
    images = {}
    for channel in ('base', 'ao', 'orm'):
        image = bpy.data.images.new(name + '_' + channel, width=512, height=512, alpha=False)
        image.colorspace_settings.name = 'sRGB' if channel == 'base' else 'Non-Color'
        images[channel] = image
        for material in materials:
            node = material.node_tree.nodes.new('ShaderNodeTexImage')
            node.image = image
            material.node_tree.nodes.active = node
        if channel == 'base':
            bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=5)
        elif channel == 'ao':
            bpy.ops.object.bake(type='AO', margin=3)
        else:
            previous = []
            for material in materials:
                nodes = material.node_tree.nodes
                links = material.node_tree.links
                bsdf = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
                output = next(node for node in nodes if node.type == 'OUTPUT_MATERIAL')
                previous.append((material, output, output.inputs['Surface'].links[0].from_socket))
                emission = nodes.new('ShaderNodeEmission')
                emission.inputs['Color'].default_value = (1, bsdf.inputs['Roughness'].default_value, bsdf.inputs['Metallic'].default_value, 1)
                links.new(emission.outputs[0], output.inputs['Surface'])
            bpy.ops.object.bake(type='EMIT', margin=3)
            for material, output, socket in previous:
                material.node_tree.links.new(socket, output.inputs['Surface'])
        image.pack()
    material = bpy.data.materials.new(name + '_pbr_atlas')
    material.use_nodes = True
    material.use_backface_culling = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = next(node for node in nodes if node.type=='BSDF_PRINCIPLED')
    base = nodes.new('ShaderNodeTexImage')
    base.image = images['base']
    links.new(base.outputs['Color'], bsdf.inputs['Base Color'])
    orm = nodes.new('ShaderNodeTexImage')
    orm.image = images['orm']
    separate = nodes.new('ShaderNodeSeparateColor')
    links.new(orm.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], bsdf.inputs['Roughness'])
    links.new(separate.outputs['Blue'], bsdf.inputs['Metallic'])
    occlusion = nodes.new('ShaderNodeTexImage')
    occlusion.image = images['ao']
    output = nodes.new('ShaderNodeGroup')
    output.node_tree = bpy.data.node_groups['glTF Material Output']
    links.new(occlusion.outputs['Color'], output.inputs['Occlusion'])
    body.data.materials.clear()
    body.data.materials.append(material)
    for polygon in body.data.polygons:
        polygon.material_index = 0
    root['atlas_revision'] = 1
    root['atlas_note'] = '512px original baseColor + AO/roughness/metallic; one runtime PBR material'
    scene.render.engine = 'BLENDER_EEVEE'


def create(name):
    target = HERE / 'sources' / (name + '.blend')
    if target.exists():
        raise FileExistsError('Refusing to replace editable source: ' + str(target))
    bpy.ops.wm.open_mainfile(filepath=str(HERE / 'sources' / 'skeleton_infantry.blend'))
    root = bpy.data.objects['asset_root']
    rig = bpy.data.objects['skeleton_rig']
    modules = bpy.data.collections['editable_modules']
    modules.hide_viewport = False
    runtime = bpy.data.collections['runtime_export']
    for obj in list(runtime.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    shapes.ROOT = root
    shapes.RIG = rig
    shapes.MATS = {mat.name: mat for mat in bpy.data.materials}
    shapes.PARTS = []
    # Body and equipment are new silhouettes; retain the refined skull/limbs.
    retained = ('skull_', 'socket_dark', 'quiet_soul_eye', 'nose_cavity', 'cheek_bone',
                'mandible', 'visible_tooth', 'femur', 'knee', 'shin', 'skeletal_boot',
                'pelvis', 'clavicle', 'upper_arm', 'elbow', 'forearm')
    for obj in list(modules.objects):
        if obj.name.startswith(retained):
            shapes.PARTS.append(obj)
        else:
            bpy.data.objects.remove(obj, do_unlink=True)
    root['asset_id'] = name
    root['authorship'] = 'Original ZCamp undead derivatives, 2026-10-11; refined skeleton rig/Actions reused'
    root['source_rig'] = 'skeleton_infantry.blend / 14 joints / walk attack hit death'
    material('undead_skin', 'A3A397', .85)
    material('giant_skin', 'ACA39C', .88)
    material('plague_skin', '899481', .89)
    material('elite_plate', '626077', .54, .35)
    material('iron_edge', '9998A2', .48, .4)
    if name == 'undead_runner':
        # Hunched, lean torso and two long naked claws; no shield or sword.
        shapes.ellipsoid('ghoul_hunch', (0,.04,.98), (.195,.16,.20), 'plague_skin', 'chest',12,8)
        shapes.ellipsoid('narrow_waist', (0,.01,.70), (.14,.095,.13), 'undead_cloth', 'hips',12,8)
        for side, x in [('L',-.30),('R',.30)]:
            shapes.ellipsoid('long_forearm', (x,-.025,.69), (.058,.071,.17), 'plague_skin', 'hand_'+side,12,8)
            for finger in range(3):
                xx=x+(finger-1)*.05
                shapes.beam('hooked_claw', (xx,-.09,.58), (xx,-.19,.39), .033, 'bone', 'hand_'+side)
            shapes.box('ragged_shoulder_wrap', (x*.76,.035,.99), (.15,.14,.085), 'undead_cloth', .025, 'arm_'+side)
        for z in (.91,1.02,1.11):
            shapes.beam('back_spur', (0,.15,z), (0,.29,z+.07), .035, 'bone_shadow', 'chest')
        root['silhouette'] = 'lean hunched ghoul, long claws, uncovered skull, no shield'
        scale = Vector((.92,1, .94))
    elif name == 'undead_tank':
        # Broad wrapped torso, iron straps and large round shoulder armour.
        shapes.ellipsoid('heavy_dead_torso', (0,.035,.84), (.34,.235,.33), 'undead_skin', 'chest',16,10)
        shapes.ellipsoid('heavy_hips', (0,0,.60), (.25,.16,.17), 'undead_cloth', 'hips',12,8)
        for side, x in [('L',-.29),('R',.29)]:
            shapes.ellipsoid('massive_upper_arm',(x,.015,.91),(.13,.12,.18),'undead_skin','arm_'+side,12,8)
            shapes.ellipsoid('round_shoulder_plate',(x,.025,1.02),(.17,.15,.12),'iron','arm_'+side,12,8)
            shapes.box('iron_fist',(x*1.1,-.04,.63),(.16,.16,.19),'iron',.035,'hand_'+side)
            shapes.box('wide_leg_greave',(x*.56,.01,.32),(.14,.16,.27),'iron',.025,'shin_'+side)
        for z in (.74,.94):
            shapes.box('torso_iron_band',(0,-.21,z),(.58,.07,.055),'iron',.012,'chest')
        shapes.box('stomach_buckle',(0,-.245,.79),(.12,.035,.12),'bronze',.018,'chest')
        root['silhouette'] = 'broad barrel torso, rounded pauldrons, iron fists and wraps'
        scale = Vector((1.15,1.03,1.07))
    elif name == 'undead_armored':
        # Elite closed helm, angular shoulders, kite shield and long pole-cleaver.
        shapes.box('cuirass',(0,-.005,.90),(.36,.24,.36),'elite_plate',.045,'chest')
        shapes.box('breastplate_ridge',(0,-.145,.94),(.065,.035,.26),'iron_edge',.012,'chest')
        shapes.ellipsoid('closed_helmet',(0,.0,1.21),(.205,.17,.20),'elite_plate','head',12,8)
        shapes.box('helmet_visor',(0,-.172,1.205),(.30,.045,.052),'recess',.01,'head')
        for x in (-.075,.075):
            shapes.box('green_visor_eye',(x,-.198,1.207),(.067,.013,.018),'spectral',.004,'head')
        shapes.beam('helmet_crest',(0,.03,1.34),(0,.015,1.60),.08,'undead_cloth','head')
        for side,x in [('L',-.245),('R',.245)]:
            shapes.box('angular_elite_pauldron',(x,.01,1.04),(.25,.27,.14),'elite_plate',.033,'arm_'+side)
            shapes.beam('pauldron_tip',(x*1.25,.03,1.10),(x*1.7,.035,1.22),.064,'iron_edge','arm_'+side)
            shapes.box('plated_forearm',(x*1.2,-.025,.72),(.12,.16,.22),'elite_plate',.025,'hand_'+side)
            shapes.box('elite_greave',(x*.62,-.015,.32),(.14,.14,.30),'elite_plate',.022,'shin_'+side)
            shapes.box('split_plate_skirt',(x*.5,-.065,.61),(.16,.16,.22),'elite_plate',.024,'hips')
        verts=[(-.37+x,-.16+y,.72+z) for y in (-.035,.035) for x,z in [(-.14,.25),(.14,.25),(.19,-.06),(0,-.33),(-.19,-.06)]]
        faces=[(0,4,3,2,1),(5,6,7,8,9)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
        shapes.mesh('tall_elite_kite_shield',verts,faces,'elite_plate',.02,'hand_L')
        shapes.emblem(-.37,-.203,.74,.9,'iron_edge','hand_L')
        shapes.beam('pole_cleaver_handle',(.34,-.035,.44),(.34,-.035,1.26),.056,'timber','hand_R')
        shapes.box('broad_cleaver_head',(.41,-.04,1.17),(.26,.085,.29),'iron_edge',.025,'hand_R')
        root['silhouette'] = 'closed crested helm, pointed pauldrons, large kite shield and cleaver'
        scale = Vector((1.06,1,1.03))
    elif name == 'undead_brute':
        # Massive asymmetric stitched giant with spiked shoulder and stone maul.
        shapes.ellipsoid('giant_belly',(0,-.045,.77),(.39,.29,.36),'giant_skin','chest',16,10)
        shapes.ellipsoid('giant_back',(0,.04,1.00),(.33,.25,.23),'giant_skin','chest',16,10)
        shapes.ellipsoid('giant_waist',(0,.015,.56),(.25,.20,.17),'undead_cloth','hips',12,8)
        for side,x in [('L',-.31),('R',.31)]:
            shapes.ellipsoid('giant_arm',(x,.01,.89),(.15,.14,.24),'giant_skin','arm_'+side,12,8)
            shapes.box('giant_gauntlet',(x*1.1,-.04,.64),(.19,.21,.24),'elite_plate',.04,'hand_'+side)
            shapes.ellipsoid('giant_thigh',(x*.52,.015,.43),(.13,.125,.19),'giant_skin','thigh_'+side,12,8)
            shapes.box('iron_shin_wrap',(x*.52,-.01,.25),(.16,.18,.13),'iron',.022,'shin_'+side)
        shapes.box('asymmetric_spiked_pauldron',(.32,.03,1.075),(.34,.30,.16),'elite_plate',.035,'arm_R')
        for x in (.23,.34,.45):
            shapes.beam('giant_shoulder_spike',(x,.03,1.13),(x+.04,.02,1.32),.065,'iron_edge','arm_R')
        shapes.tube('stomach_stitch',[(x,-.31,.83+.07*math.sin(x*8)) for x in (-.23,-.12,0,.12,.23)],.016,'recess','chest')
        for x in (-.18,-.06,.06,.18):
            shapes.beam('stitch_bar',(x-.025,-.326,.81),(x+.025,-.326,.89),.013,'bone_shadow','chest')
        shapes.beam('siege_maul_handle',(.37,-.03,.51),(.37,-.03,1.11),.075,'timber','hand_R')
        shapes.box('siege_maul_head',(.37,-.03,1.16),(.42,.30,.28),'iron',.05,'hand_R')
        shapes.box('maul_striking_cap',(.59,-.03,1.16),(.06,.32,.30),'iron_edge',.018,'hand_R')
        root['silhouette'] = 'oversized stitched belly, asymmetric spikes, two-handed scale iron maul'
        scale = Vector((1.36,1.16,1.38))
    else:
        raise ValueError(name)
    # Scale actual editable points and bind-pose bones, never the asset_root.
    anchors = {obj:obj.matrix_world.copy() for obj in bpy.context.scene.objects if obj.type=='EMPTY' and obj.name.endswith('_anchor')}
    for obj in shapes.PARTS:
        world = obj.matrix_world.copy()
        inv = world.inverted()
        for vertex in obj.data.vertices:
            point = world @ vertex.co
            vertex.co = inv @ Vector((point.x*scale.x,point.y*scale.y,point.z*scale.z))
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in rig.data.edit_bones:
        for attr in ('head','tail'):
            point = getattr(bone,attr)
            setattr(bone,attr,Vector((point.x*scale.x,point.y*scale.y,point.z*scale.z)))
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()
    for obj, matrix in anchors.items():
        point=matrix.translation
        matrix.translation=Vector((point.x*scale.x,point.y*scale.y,point.z*scale.z))
        obj.matrix_world=matrix
    bpy.data.objects['hit_anchor'].matrix_world.translation = Vector((0,-.04*scale.y,.91*scale.z))
    attack_positions={'undead_runner':(.30,-.19,.45),'undead_tank':(.34,-.04,.65),'undead_armored':(.41,-.04,1.17),'undead_brute':(.59,-.03,1.16)}
    point=attack_positions[name]
    bpy.data.objects['attack_anchor'].matrix_world.translation=Vector((point[0]*scale.x,point[1]*scale.y,point[2]*scale.z))
    bpy.data.objects['label_anchor'].matrix_world.translation = Vector((0,0,(1.7 if name=='undead_armored' else 1.4)*scale.z))
    # All newly created geometry is stored with the retained editable modules.
    for obj in shapes.PARTS:
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        modules.objects.link(obj)
        if len(obj.data.polygons)==1:
            mod=obj.modifiers.new('physical_two_sided_surface','SOLIDIFY')
            mod.thickness=.012
            mod.offset=0
    body=merge_runtime_surface(shapes.PARTS,runtime,root,name)
    bake_surface(root,body,name)
    body.parent=rig
    skin=body.modifiers.new('shared_rig_skin','ARMATURE')
    skin.object=rig
    root['export_mesh']=body.name
    modules.hide_viewport=True
    modules.hide_render=True
    # A saved source starts at neutral pose, not the last edited animation frame.
    rig.animation_data.action=None
    for track in rig.animation_data.nla_tracks:
        track.mute=True
    for bone in rig.pose.bones:
        bone.rotation_euler=(0,0,0)
        bone.location=(0,0,0)
    bpy.context.scene.frame_set(1)
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    print('ZCAMP_UNDEAD_SOURCE',name,flush=True)


if __name__=='__main__':
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['undead_runner','undead_tank','undead_armored','undead_brute']
    for name in args:
        create(name)

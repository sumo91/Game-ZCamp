"""Refine eight saved production sources for the fixed gameplay camera.

This revision edits their retained modules, derives runtime UV/PBR, and saves.
It never invokes a source factory, exports GLB, or edits any other asset.
Run with Blender --background --python-exit-code 1 --python this_file -- stems.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from runtime_surface import merge_runtime_surface

ASSETS = (
    'arrow_tower_low', 'arrow_tower_medium', 'arrow_tower_high',
    'lumberyard_low', 'lumberyard_medium', 'lumberyard_high',
    'main_city', 'skeleton_infantry',
)
REVISION = 1
PALETTE = {
    'limestone': ('B8BBBA', .87, 0),
    'edge_stone': ('D8D1BD', .81, 0),
    'cobalt': ('2B63BE', .53, 0),
    'roof_highlight': ('5088DD', .55, 0),
    'bronze': ('DAB254', .43, .4),
    'timber': ('895B38', .87, 0),
    'wood_end': ('CEA16D', .83, 0),
    'iron': ('596171', .59, .35),
    'bone': ('E8D9BA', .79, 0),
    'bone_shadow': ('B9A88E', .85, 0),
    'undead_cloth': ('696177', .92, 0),
}


def linear(value):
    return value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4


def paint_material(material, color, roughness, metallic):
    """Keep packed source variation quiet enough to read the large color planes."""
    rgb = tuple(int(color[i:i + 2], 16) / 255 for i in (0, 2, 4))
    shader = next(node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = tuple(linear(v) for v in rgb) + (1,)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    color_input = shader.inputs['Base Color']
    if color_input.is_linked:
        texture = color_input.links[0].from_node
        if texture.type != 'TEX_IMAGE' or not texture.image:
            raise RuntimeError(f'Unexpected editable source color: {material.name}')
        image = texture.image
        width, height = image.size
        pixels = []
        for y in range(height):
            for x in range(width):
                grain = math.sin(x * .15 + math.sin(y * .06)) * .025
                if material.name in ('timber', 'wood_end'):
                    grain = math.sin(x * .17 + math.sin(y * .035) * 1.6) * .042
                shade = .97 + grain
                pixels.extend([max(0, min(1, v * shade)) for v in rgb] + [1])
        image.pixels.foreach_set(pixels)
        image.pack()


def new_material(name, color, roughness, metallic=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = True
    paint_material(material, color, roughness, metallic)
    return material


def center(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return sum(points, Vector()) / 8


def shape(obj, pivot, scale=(1, 1, 1), offset=(0, 0, 0)):
    world = obj.matrix_world.copy()
    inverse = world.inverted()
    pivot, offset = Vector(pivot), Vector(offset)
    for vertex in obj.data.vertices:
        point = world @ vertex.co - pivot
        point = Vector(tuple(point[i] * scale[i] for i in range(3)))
        vertex.co = inverse @ (pivot + point + offset)
    obj.data.update()


def thicken_beam(obj, factor):
    # The saved beam local Z follows its limb; leave its joint endpoints intact.
    for vertex in obj.data.vertices:
        vertex.co.x *= factor
        vertex.co.y *= factor
    obj.data.update()


def add_box(modules, root, name, location, size, material, bevel=.018, bone=None):
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = root
    obj.data.materials.append(material)
    if bone:
        group = obj.vertex_groups.new(name=bone)
        group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    if bevel:
        modifier = obj.modifiers.new('product_edge_bevel', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 2
        modifier.harden_normals = True
        normals = obj.modifiers.new('product_weighted_normals', 'WEIGHTED_NORMAL')
        normals.keep_sharp = True
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    modules.objects.link(obj)
    return obj


def quiet_courses(modules):
    mortar = new_material('product_mortar', '777B83', .95)
    for obj in modules.objects:
        if obj.name.startswith(('shaft_recess', 'mortar_core')):
            obj.data.materials.clear()
            obj.data.materials.append(mortar)
        elif obj.name.startswith(('stone_course', 'dressed_course')):
            shape(obj, center(obj), (1.04, 1, 1.07))
        elif obj.name.startswith(('side_stone_course', 'end_course')):
            shape(obj, center(obj), (1, 1.04, 1.07))


def refine_arrow(modules, root):
    quiet_courses(modules)
    for obj in list(modules.objects):
        name = obj.name
        if name.startswith('blue_rear_canopy'):
            # The archer already faces +Y; put the compact shelter behind his bow.
            shape(obj, (0, .37, 1.43), (1.08, .65, 1.05), (0, .16, .05))
        elif name.startswith('canopy_post'):
            shape(obj, center(obj), (1.18, 1.18, 1.15), (0, .10, .02))
        elif name.startswith('archer_torso'):
            shape(obj, center(obj), (1.2, 1.18, 1.12))
        elif name.startswith('archer_pauldron'):
            shape(obj, center(obj), (1.32, 1.24, 1.28), (0, 0, .025))
        elif name.startswith(('archer_face', 'archer_helmet', 'helmet_gold')):
            shape(obj, (0, -.07, 1.81), (1.32, 1.25, 1.2), (0, 0, .035))
            if name.startswith('archer_helmet'):
                obj.data.materials.clear()
                obj.data.materials.append(bpy.data.materials['cobalt'])
        elif name.startswith(('large_bow', 'bowstring', 'nocked_arrow')):
            shape(obj, (.21, .25, 1.71), (1.22, 1.18, 1.16), (0, .075, .025))
        elif name.startswith('archer_arm'):
            thicken_beam(obj, 1.25)
        elif name.startswith(('parapet_merlon', 'front_battlement')):
            shape(obj, center(obj), (1.1, 1.06, 1.1))
        elif name.startswith('corbel_belt'):
            shape(obj, center(obj), (1.04, 1.04, 1.12))
    add_box(modules, root, 'archer_helmet_crest', (0, -.055, 2.027),
            (.048, .16, .085), bpy.data.materials['bronze'], .012)
    add_box(modules, root, 'front_gold_cornice', (0, -.643, 1.415),
            (1.27, .055, .052), bpy.data.materials['bronze'], .012)


def refine_lumberyard(modules, root):
    steel = new_material('product_saw_steel', 'A8BACB', .4, .65)
    for obj in list(modules.objects):
        name = obj.name
        if name.startswith('post.') or name == 'post':
            shape(obj, center(obj), (1.35, 1.35, 1))
        elif name.startswith('header'):
            shape(obj, center(obj), (1, 1.22, 1.22))
        elif name.startswith('cross_brace'):
            thicken_beam(obj, 1.3)
        elif name.startswith('blue_workshop_roof'):
            shape(obj, (0, .03, 1.10), (1, .90, 1.12))
        elif name.startswith(('saw_blade', 'saw_hub', 'saw_tooth')):
            # A real front-mounted saw, rather than an enlarged hidden workshop.
            shape(obj, (-.05, -.28, .65), (1.18, 1, 1.18), (.23, -.36, .045))
            if name.startswith(('saw_blade', 'saw_tooth')):
                obj.data.materials.clear()
                obj.data.materials.append(steel)
            if name.startswith('saw_tooth'):
                thickness = obj.modifiers.new('saw_tooth_thickness', 'SOLIDIFY')
                thickness.thickness = .024
                thickness.offset = 0
                bevel = obj.modifiers.new('saw_tooth_edge', 'BEVEL')
                bevel.width = .004
                bevel.segments = 1
        elif name.startswith(('stacked_log', 'cut_end', 'growth_ring', 'upper_stack')):
            position = center(obj)
            if position.y < -.15 and .17 < position.z < .56:
                is_upper = position.z > .40
                xs = (-.23, .02) if is_upper else (-.38, -.13, .12)
                x = min(xs, key=lambda candidate: abs(candidate - position.x))
                z = .46 if is_upper else .285
                shape(obj, (x, -.45, z), (1.12, 1, 1.12), (-.035, -.04, 0))
        elif name.startswith('guild_sign'):
            shape(obj, center(obj), (.95, 1, 1), (-.25, .02, .02))
        elif name.startswith(('sun_chevron', 'sun_ray')) and center(obj).z < 1.10:
            # This is the high-tier guild plate, not the gable emblem.
            shape(obj, center(obj), (1, 1, 1), (-.25, .02, .02))
    add_box(modules, root, 'saw_front_mount', (.18, -.585, .34),
            (.49, .20, .16), bpy.data.materials['timber'], .023)


def refine_city(modules, root):
    quiet_courses(modules)
    for obj in list(modules.objects):
        name = obj.name
        if name.startswith('upper_keep_core'):
            shape(obj, center(obj), (1.06, 1.06, 1.25))
        elif name.startswith('great_blue_roof'):
            shape(obj, (0, .04, 1.42), (1.02, 1.02, 1.08))
        elif name.startswith('blue_pointed_turret'):
            pivot = center(obj)
            pivot.z = 1.47
            shape(obj, pivot, (1.045, 1.045, 1.09))
        elif name.startswith('gold_spire_tip'):
            shape(obj, center(obj), (1.15, 1.15, 1.12), (0, 0, .04))
        elif name.startswith('turret_gold_cornice'):
            shape(obj, center(obj), (1.07, 1.07, 1.12))
        elif name.startswith('keep_front_merlon'):
            shape(obj, center(obj), (1.1, 1.08, 1.13))
        elif name.startswith('castle_entry_jamb'):
            shape(obj, center(obj), (1.12, 1.08, 1))
        elif name.startswith('oak_entry_door'):
            shape(obj, center(obj), (1.1, 1, 1.03))
        elif name.startswith(('royal_banner', 'sun_chevron', 'sun_ray')):
            shape(obj, (0, -.68, 1.02), (1.12, 1, 1.05), (0, -.012, .18))
    add_box(modules, root, 'upper_keep_gold_front', (0, -.37, 1.444),
            (.89, .07, .063), bpy.data.materials['bronze'], .014)
    add_box(modules, root, 'entry_stone_threshold', (0, -.672, .226),
            (.52, .095, .078), bpy.data.materials['edge_stone'], .019)


def refine_skeleton(modules, root):
    for obj in list(modules.objects):
        name = obj.name
        if name.startswith(('skull_cranium', 'socket_dark', 'quiet_soul_eye',
                            'nose_cavity', 'cheek_bone', 'mandible', 'visible_tooth')):
            shape(obj, (0, -.012, 1.20276), (1.17, 1.07, 1.08))
        elif name.startswith('curved_rib'):
            shape(obj, (0, -.035, .90), (1.43, 1.3, 1))
        elif name.startswith('sternum'):
            shape(obj, center(obj), (1.8, 1.3, 1.02), (0, -.035, 0))
        elif name.startswith('clavicle'):
            thicken_beam(obj, 1.35)
        elif name.startswith('pauldron'):
            shape(obj, center(obj), (1.36, 1.29, 1.3))
        elif name.startswith(('upper_arm', 'forearm', 'femur', 'shin')):
            thicken_beam(obj, 1.45 if not name.startswith('shin') else 1.55)
        elif name.startswith(('knee', 'elbow')):
            shape(obj, center(obj), (1.22, 1.22, 1.16))
        elif name.startswith('gauntlet'):
            shape(obj, center(obj), (1.35, 1.28, 1.16))
        elif name.startswith('skeletal_boot'):
            pivot = center(obj)
            pivot.z = min((obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices)
            shape(obj, pivot, (1.38, 1.17, 1.20))
        elif name.startswith(('belt', 'ragged_tabard')):
            shape(obj, center(obj), (1.18, 1.08, 1))
    add_box(modules, root, 'undead_chest_jacket', (0, .032, .916),
            (.31, .17, .29), bpy.data.materials['undead_cloth'], .025, 'chest')
    add_box(modules, root, 'broad_sternum_plate', (0, -.159, .939),
            (.073, .038, .213), bpy.data.materials['bone'], .015, 'chest')
    for side in (-1, 1):
        brow = add_box(modules, root, 'angular_skull_brow',
                       (side * .089, -.157, 1.289), (.142, .054, .043),
                       bpy.data.materials['bone'], .010, 'head')
        brow.rotation_euler.y = side * .22


def clear_old_bake_targets():
    for material in list(bpy.data.materials):
        if not material.use_nodes:
            continue
        for node in list(material.node_tree.nodes):
            if node.type == 'TEX_IMAGE' and node.image and not node.image.name.endswith('_surface'):
                # Runtime atlas materials are unlinked before this; source color stays.
                material.node_tree.nodes.remove(node)
            elif node.type == 'GROUP' and node.node_tree and node.node_tree.name == 'glTF Material Output':
                material.node_tree.nodes.remove(node)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)
    for image in list(bpy.data.images):
        if image.users == 0:
            bpy.data.images.remove(image)


def bake_surface(root, modules, name, color_size):
    old = bpy.data.objects[root['export_mesh']]
    bpy.data.objects.remove(old, do_unlink=True)
    clear_old_bake_targets()
    body = merge_runtime_surface(
        (obj for obj in modules.objects if obj.type == 'MESH'),
        bpy.data.collections['runtime_export'], root, name,
    )
    materials = list(body.data.materials)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 16
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True)
    bpy.context.view_layer.objects.active = body

    def image_target(suffix, size, colorspace):
        image = bpy.data.images.new(f'{name}_product_{suffix}', width=size, height=size, alpha=False)
        image.colorspace_settings.name = colorspace
        for material in materials:
            nodes = material.node_tree.nodes
            target = nodes.new('ShaderNodeTexImage')
            target.image = image
            nodes.active = target
        return image

    ao = image_target('ao', 512, 'Non-Color')
    bpy.ops.object.bake(type='AO', margin=4)
    ao.pack()
    color = image_target('base_color_atlas', color_size, 'sRGB')
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=5)
    color.pack()
    packed = image_target('roughness_metallic_atlas', 512, 'Non-Color')
    previous = []
    for material in materials:
        nodes, links = material.node_tree.nodes, material.node_tree.links
        shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
        output = next(node for node in nodes if node.type == 'OUTPUT_MATERIAL')
        previous.append((material, output, output.inputs['Surface'].links[0].from_socket))
        emission = nodes.new('ShaderNodeEmission')
        emission.inputs['Color'].default_value = (1, shader.inputs['Roughness'].default_value,
                                                  shader.inputs['Metallic'].default_value, 1)
        links.new(emission.outputs[0], output.inputs['Surface'])
    bpy.ops.object.bake(type='EMIT', margin=4)
    packed.pack()
    for material, output, socket in previous:
        material.node_tree.links.new(socket, output.inputs['Surface'])
        for node in list(material.node_tree.nodes):
            if node.type == 'EMISSION':
                material.node_tree.nodes.remove(node)

    atlas = bpy.data.materials.new(f'{name}_product_pbr_atlas')
    atlas.use_nodes = True
    atlas.use_backface_culling = True
    nodes, links = atlas.node_tree.nodes, atlas.node_tree.links
    shader = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    base = nodes.new('ShaderNodeTexImage')
    base.image = color
    links.new(base.outputs['Color'], shader.inputs['Base Color'])
    orm = nodes.new('ShaderNodeTexImage')
    orm.image = packed
    separate = nodes.new('ShaderNodeSeparateColor')
    links.new(orm.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], shader.inputs['Roughness'])
    links.new(separate.outputs['Blue'], shader.inputs['Metallic'])
    output = nodes.new('ShaderNodeGroup')
    output.node_tree = bpy.data.node_groups['glTF Material Output']
    ao_node = nodes.new('ShaderNodeTexImage')
    ao_node.image = ao
    links.new(ao_node.outputs['Color'], output.inputs['Occlusion'])
    body.data.materials.clear()
    body.data.materials.append(atlas)
    for polygon in body.data.polygons:
        polygon.material_index = 0
    if name == 'skeleton_infantry':
        rig = bpy.data.objects['skeleton_rig']
        body.parent = rig
        modifier = body.modifiers.new('shared_rig_skin', 'ARMATURE')
        modifier.object = rig
    root['export_mesh'] = body.name
    root['atlas_note'] = 'Product source revision: quiet large color planes, structural AO and one PBR atlas; source modules and animation retained.'
    scene.render.engine = 'BLENDER_EEVEE'
    return body


def semantics():
    return {obj.name: tuple(value for row in obj.matrix_world for value in row)
            for obj in bpy.context.scene.objects if obj.type in ('EMPTY', 'ARMATURE')}


def refine(name):
    path = HERE / 'sources' / f'{name}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path))
    root = bpy.data.objects['asset_root']
    if root.get('product_shape_revision', 0) >= REVISION:
        print('ZCAMP_PRODUCT_REFINEMENT_SKIPPED', name, flush=True)
        return
    modules = bpy.data.collections['editable_modules']
    modules.hide_viewport = False
    bpy.context.view_layer.update()
    before_semantics = semantics()
    old = bpy.data.objects[root['export_mesh']]
    shader = next(node for node in old.data.materials[0].node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    color_size = shader.inputs['Base Color'].links[0].from_node.image.size[0]
    for material_name, values in PALETTE.items():
        material = bpy.data.materials.get(material_name)
        if material:
            paint_material(material, *values)
    if name.startswith('arrow_tower'):
        refine_arrow(modules, root)
    elif name.startswith('lumberyard'):
        refine_lumberyard(modules, root)
    elif name == 'main_city':
        refine_city(modules, root)
    else:
        refine_skeleton(modules, root)
    bpy.context.view_layer.update()
    body = bake_surface(root, modules, name, color_size)
    bpy.context.view_layer.update()
    if semantics() != before_semantics:
        raise RuntimeError(f'Semantic transforms changed for {name}')
    if name == 'skeleton_infantry':
        rig = bpy.data.objects['skeleton_rig']
        if len(rig.data.bones) != 14:
            raise RuntimeError('The production rig must retain fourteen joints')
        expected = {'walk', 'attack', 'hit', 'death'}
        if {track.name for track in rig.animation_data.nla_tracks} != expected:
            raise RuntimeError('The production rig must retain all four clips')
        for vertex in body.data.vertices:
            if not vertex.groups:
                raise RuntimeError(f'Unweighted skeleton vertex: {vertex.index}')
    points = [body.matrix_world @ vertex.co for vertex in body.data.vertices]
    size = [max(p[i] for p in points) - min(p[i] for p in points) for i in range(3)]
    if name != 'skeleton_infantry' and (size[0] > 1.8001 or size[1] > 1.5501):
        raise RuntimeError(f'Asset exceeds plot footprint: {name} {size}')
    root['product_shape_revision'] = REVISION
    root['product_shape_note'] = '2026-10-11 saved-module refinement; fixed camera, semantics and production rig retained.'
    modules.hide_viewport = True
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    print('ZCAMP_PRODUCT_REFINED', name, 'bounds', size, flush=True)


if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(ASSETS)
    if not names or any(name not in ASSETS for name in names) or len(set(names)) != len(names):
        raise ValueError('Choose unique explicit stems from the eight product sources')
    for name in names:
        refine(name)

"""Disposable Blender refactor probe: temporary in-memory geometry only."""
import importlib.util
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

MODULE = Path('C:/Users/Admin/.codex/worktrees/threejs-issue-4/ZCamp/art/threejs/runtime_surface.py')
spec = importlib.util.spec_from_file_location('runtime_surface', MODULE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def legacy(objects, collection, root, name):
    # Frozen pre-refactor mechanical pipeline, without source/bake/save decisions.
    copies=[]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        duplicate=obj.copy(); duplicate.data=obj.data.copy(); collection.objects.link(duplicate)
        duplicate.parent=None; duplicate.matrix_world=obj.matrix_world.copy()
        duplicate.select_set(True); bpy.context.view_layer.objects.active=duplicate
        bpy.ops.object.convert(target='MESH'); copies.append(bpy.context.object)
        duplicate.select_set(False)
    for obj in copies: obj.select_set(True)
    bpy.context.view_layer.objects.active=copies[0]; bpy.ops.object.join(); body=bpy.context.object
    body.name=name+'_surface'; body.parent=root
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012)
    bpy.ops.object.mode_set(mode='OBJECT')
    return body


def run(function, generator):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    root = bpy.data.objects.new('probe_root', None)
    bpy.context.scene.collection.objects.link(root)
    parent = bpy.data.objects.new('parts_parent', None)
    bpy.context.scene.collection.objects.link(parent)
    parent.location = (1, -2, .5)
    parent.rotation_euler.z = .25
    runtime = bpy.data.collections.new('probe_runtime')
    bpy.context.scene.collection.children.link(runtime)
    parts = []
    for index in range(2):
        bpy.ops.mesh.primitive_cube_add(size=1)
        obj = bpy.context.object
        obj.name = 'probe_part_' + str(index)
        obj.parent = parent
        obj.location = (index * 1.6, .3, 1)
        obj.scale = (1, .75, 1.5)
        obj.rotation_euler.z = index * .35
        material = bpy.data.materials.new('probe_material_' + str(index))
        obj.data.materials.append(material)
        group = obj.vertex_groups.new(name='probe_bone')
        group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
        modifier = obj.modifiers.new('probe_bevel', 'BEVEL')
        modifier.width = .03
        modifier.segments = 1
        parts.append(obj)
    bpy.context.view_layer.update()
    original = [(obj.data, obj.matrix_world.copy(), len(obj.modifiers), len(obj.data.vertices)) for obj in parts]
    body = function((obj for obj in parts) if generator else parts, runtime, root, 'probe')
    assert body.parent == root and body.name == 'probe_surface'
    assert body.location.length < 1e-6 and body.rotation_euler.to_matrix().is_identity
    assert (body.scale - Vector((1, 1, 1))).length < 1e-6
    assert len(body.data.materials) == 2 and 'probe_bone' in body.vertex_groups
    assert len(body.data.vertices) > 16 and len(body.data.uv_layers) == 1
    for obj, (data, matrix, modifiers, vertices) in zip(parts, original):
        assert obj.data == data and obj.matrix_world == matrix
        assert len(obj.modifiers) == modifiers and len(obj.data.vertices) == vertices
    points = sorted(tuple(round(value, 6) for value in vertex.co) for vertex in body.data.vertices)
    uv = [tuple(round(value, 6) for value in loop.uv) for loop in body.data.uv_layers.active.data]
    assert all(math.isfinite(value) and -.00001 <= value <= 1.00001 for pair in uv for value in pair)
    return {'points': points, 'uv': uv, 'polygons': len(body.data.polygons), 'materials': [m.name for m in body.data.materials]}


baseline = run(legacy, False)
for generator in (False, True):
    actual = run(module.merge_runtime_surface, generator)
    assert actual == baseline, 'Mechanical result differs from frozen old pipeline'
    print('ZCAMP_SURFACE_PROBE', json.dumps({'input': 'generator' if generator else 'list', 'vertices': len(actual['points']), 'polygons': actual['polygons'], 'uvLoops': len(actual['uv']), 'originalsUnchanged': True, 'matchesLegacy': True, 'savedOrExported': False}), flush=True)

"""Mechanical mesh derivative shared by source creation and explicit refinement."""
import math
import bpy


def merge_runtime_surface(objects, collection, root, name):
    """Copy evaluated parts, merge, apply transforms and unwrap; never save or bake."""
    copies = []
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        duplicate = obj.copy()
        duplicate.data = obj.data.copy()
        collection.objects.link(duplicate)
        duplicate.parent = None
        duplicate.matrix_world = obj.matrix_world.copy()
        duplicate.select_set(True)
        bpy.context.view_layer.objects.active = duplicate
        bpy.ops.object.convert(target='MESH')
        copies.append(bpy.context.object)
        duplicate.select_set(False)
    for obj in copies:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    body = bpy.context.object
    body.name = name + '_surface'
    body.parent = root
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.012)
    bpy.ops.object.mode_set(mode='OBJECT')
    return body

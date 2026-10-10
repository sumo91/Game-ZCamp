"""Original frost/rune tower sources. Create missing files only; never replace refinements.

Uses the production editable-module/UV/AO workflow. Afterwards refine_sources.py
is called explicitly with these six names for the shared 512px single PBR atlas,
and export_assets.py reads the saved sources without reconstructing them.
"""
import math
import sys
from pathlib import Path
import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import create_sample_sources as a


def begin(name):
    path = HERE / 'sources' / (name + '.blend')
    if path.exists():
        raise FileExistsError('Saved production source must not be overwritten: ' + str(path))
    a.start(name)
    a.ROOT['authorship'] = 'Original ZCamp arcane geometry and surfaces, 2026-10-11'
    a.material('ice_light', '8ACEE4', .32, .08)
    a.material('ice_face', '3398C4', .42, .10)
    a.material('rune_light', 'B19AE1', .42, .15)
    a.material('rune_face', '6955B0', .50, .20)


def plinth(stage):
    a.box('foundation', (0, 0, .065), (1.53, 1.30, .13), 'limestone', .045)
    a.box('foundation_cap', (0, 0, .17), (1.38, 1.16, .10), 'edge_stone', .033)
    a.box('shaft_mortar', (0, 0, .48), (.98, .84, .52), 'recess', .025)
    for row in range(3):
        for side in (-1, 1):
            for col in range(3):
                a.box('dressed_stone', ((col - 1) * .31, side * .42, .30 + row * .17), (.293, .10, .15), 'limestone', .015)
            for col in range(2):
                a.box('end_stone', (side * .49, (col - .5) * .40, .30 + row * .17), (.10, .382, .15), 'limestone', .015)
    for x in (-.54, .54):
        a.box('corner_buttress', (x, -.37, .43), (.18, .20, .45), 'edge_stone', .022)
    a.box('blue_belt', (0, 0, .77), (1.14, 1.04, .13), 'cobalt', .025)
    a.box('gold_cornice', (0, 0, .86), (1.22, 1.11, .065), 'bronze', .017)
    a.box('front_blue_badge', (0, -.487, .50), (.28, .033, .30), 'cobalt', .012)
    a.emblem(0, -.51, .51, .65)
    if stage >= 1:
        for x in (-.55, .55):
            a.box('gold_buttress_band', (x, -.386, .56), (.205, .223, .075), 'bronze', .010)
        a.box('reinforced_front_step', (0, -.62, .145), (.93, .12, .13), 'edge_stone', .025)
    if stage >= 2:
        a.box('gold_lower_belt', (0, 0, .23), (1.44, 1.22, .046), 'bronze', .012)
        for x in (-.64, .64):
            a.box('blue_corner_shield', (x, .25, .50), (.09, .34, .32), 'cobalt', .015)


def crystal(name, x, y, bottom, width, height, light, face):
    # Asymmetric hexagonal cut crystal: actual faceted volume, not a recoloured orb.
    sides = 6
    verts = [(x, y, bottom + height)]
    for z, radius in ((bottom + height * .72, width), (bottom + height * .12, width * .72)):
        verts.extend((x + radius * math.cos(i * math.tau / sides), y + radius * math.sin(i * math.tau / sides), z) for i in range(sides))
    verts.append((x, y, bottom))
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        faces.extend(((0, 1 + i, 1 + j), (1 + i, 7 + i, 7 + j, 1 + j), (13, 7 + j, 7 + i)))
    obj = a.mesh(name, verts, faces, face, .009)
    obj.data.materials.append(a.MATS[light])
    for index, polygon in enumerate(obj.data.polygons):
        if index % 6 in (0, 1, 2):
            polygon.material_index = 1
    return obj


def ring(name, loc, radius, mat, tilt=0):
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, location=loc, major_radius=radius, minor_radius=.035)
    obj = bpy.context.object
    obj.rotation_euler.x = tilt
    return a.finish_part(obj, name, mat)


def frost(tier):
    name = 'frost_tower_' + tier
    begin(name)
    stage = {'low': 0, 'medium': 1, 'high': 2}[tier]
    plinth(stage)
    a.cylinder('stone_crystal_bowl', (0, 0, .96), .48, .15, 'edge_stone', 8)
    a.cylinder('blue_crystal_socket', (0, 0, 1.035), .36, .13, 'cobalt', 8)
    ring('gold_socket', (0, 0, 1.095), .35, 'bronze')
    peak = (1.82, 1.98, 2.12)[stage]
    crystal('central_ice_lance', 0, 0, 1.06, .245 + stage * .012, peak - 1.06, 'ice_light', 'ice_face')
    for side in (-1, 1):
        crystal('flank_ice_shard', side * .34, -.04, 1.02, .125, .48 + stage * .06, 'ice_light', 'ice_face')
        a.beam('gold_crystal_claw', (side * .41, -.06, .99), (side * .28, -.05, 1.29), .062, 'bronze')
    if stage >= 1:
        for y in (-.31, .31):
            crystal('secondary_ice_shard', 0, y, .99, .11, .40, 'ice_light', 'ice_face')
        a.box('ice_rune_tablet', (0, -.60, .91), (.32, .048, .14), 'ice_face', .015)
    if stage >= 2:
        for x in (-.50, .50):
            a.cylinder('royal_socket', (x, .25, 1.02), .09, .22, 'bronze', 6)
            crystal('royal_side_lance', x, .25, 1.10, .085, .55, 'ice_light', 'ice_face')
        ring('frost_upper_girdle', (0, 0, 1.32), .25, 'bronze')
    a.anchor('attack_anchor', (0, .10, peak - .12))
    a.anchor('hit_anchor', (0, 0, .80))
    a.anchor('label_anchor', (0, -.5, .025))
    a.ROOT['family'] = 'frost'
    a.ROOT['growth_tier'] = tier
    a.save_source(name)


def electric(tier):
    name = 'electric_tower_' + tier
    begin(name)
    stage = {'low': 0, 'medium': 1, 'high': 2}[tier]
    plinth(stage)
    a.cylinder('hexagonal_rune_pedestal', (0, 0, 1.055), .36, .32, 'cobalt', 6)
    a.cylinder('gold_runic_cap', (0, 0, 1.235), .39, .08, 'bronze', 6)
    # Forked conductors and captive rune core define a different silhouette from frost.
    for side in (-1, 1):
        a.beam('outer_conductor', (side * .42, .02, .98), (side * .46, .02, 1.62 + stage * .12), .125, 'iron')
        a.beam('gold_conductor_tip', (side * .46, .02, 1.56 + stage * .12), (side * .26, .02, 1.83 + stage * .12), .10, 'bronze')
        a.box('blue_conductor_socket', (side * .40, .02, 1.06), (.21, .22, .17), 'cobalt', .025)
        a.box('gold_conductor_band', (side * .455, .02, 1.36), (.15, .15, .065), 'bronze', .012)
    crystal('captive_rune', 0, .02, 1.31, .21, .51, 'rune_light', 'rune_face')
    ring('runic_halo', (0, .02, 1.55), .32, 'bronze', math.pi / 2)
    a.box('front_rune_inscription', (0, -.56, .98), (.34, .05, .15), 'rune_face', .012)
    a.tube('lightning_glyph', [(-.06, -.591, 1.035), (.015, -.591, .995), (-.015, -.591, .977), (.06, -.591, .925)], .012, 'rune_light')
    if stage >= 1:
        for side in (-1, 1):
            a.beam('rear_conductor', (side * .26, .30, 1.12), (side * .20, .32, 1.70), .085, 'bronze')
        ring('upper_runic_halo', (0, .02, 1.56), .28, 'rune_face')
    if stage >= 2:
        for side in (-1, 1):
            a.beam('gold_crown_fork', (side * .26, .02, 1.94), (side * .15, .02, 2.12), .076, 'bronze')
        a.cylinder('crown_rune_socket', (0, .30, 1.83), .09, .11, 'bronze', 6)
        crystal('crown_rune', 0, .30, 1.87, .075, .20, 'rune_light', 'rune_face')
    a.anchor('attack_anchor', (0, .12, 1.57))
    a.anchor('hit_anchor', (0, 0, .80))
    a.anchor('label_anchor', (0, -.5, .025))
    a.ROOT['family'] = 'electric'
    a.ROOT['growth_tier'] = tier
    a.save_source(name)


if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [family + '_tower_' + tier for family in ('frost', 'electric') for tier in ('low', 'medium', 'high')]
    for name in names:
        family, _, tier = name.split('_')
        {'frost': frost, 'electric': electric}[family](tier)

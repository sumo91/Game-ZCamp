"""Create missing original siege sources only; never overwrite a saved .blend.

Geometry is authored in metres, source +Y points towards the threat (GLB -Z).
Saved source modules remain editable; export_assets.py only reads saved files.
"""
import math
import sys
from pathlib import Path
from mathutils import Vector
import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import create_sample_sources as a


def base(stage):
    a.box('siege_foundation', (0, 0, .065), (1.48, 1.28, .13), 'limestone', .045)
    a.box('foundation_cap', (0, 0, .17), (1.36, 1.16, .08), 'edge_stone', .028)
    a.box('shaft_mortar', (0, 0, .50), (.87, .78, .58), 'recess', .02)
    for row in range(3):
        for y in (-.4, .4):
            for col in range(3):
                a.box('dressed_stone', ((col-1)*.30, y, .30+row*.18), (.28, .10, .16), 'limestone', .017)
        for x in (-.46, .46):
            for col in range(3):
                a.box('side_course', (x, (col-1)*.25, .30+row*.18), (.11, .23, .16), 'limestone', .017)
    for x in (-.54, .54):
        for y in (-.43, .43):
            a.box('reinforced_corner', (x, y, .46), (.16, .17, .51), 'edge_stone', .018)
    a.box('deck_understructure', (0, 0, .83), (1.2, 1.04, .16), 'timber', .025)
    a.box('blue_deck_rim', (0, 0, .91), (1.32, 1.16, .09), 'cobalt', .025)
    a.box('front_blue_shield', (0, .593, .62), (.38, .035, .38), 'cobalt', .014)
    # Relief visible from the overhead front camera, original sun-chevrons.
    a.emblem(0, -.456, .57, .75)
    if stage >= 1:
        for x in (-.57, .57):
            a.box('gold_corner_strap', (x, 0, .65), (.045, .9, .055), 'bronze', .008)
            a.box('blue_side_armour', (x, 0, .45), (.045, .55, .24), 'cobalt', .012)
        a.box('gold_deck_band', (0, 0, .945), (1.36, 1.18, .035), 'bronze', .008)
    if stage >= 2:
        for x in (-.59, .59):
            a.beam('banner_mast', (x, -.37, .93), (x, -.37, 1.76), .04, 'bronze')
            flag = a.mesh('siege_flag', [(x, -.37, 1.72), (x+.15, -.37, 1.65), (x+.15, -.37, 1.39), (x, -.37, 1.46)], [(0, 1, 2, 3)], 'cobalt', 0)
            mod = flag.modifiers.new('cloth_thickness', 'SOLIDIFY'); mod.thickness = .012


def ballista(tier):
    name = 'ballista_tower_'+tier
    a.start(name)
    stage = {'low': 0, 'medium': 1, 'high': 2}[tier]
    base(stage)
    a.cylinder('swivel_socket', (0, 0, 1.01), .26, .16, 'bronze', 12)
    a.box('raised_stock', (0, -.02, 1.19), (.26, .80, .21), 'timber', .025)
    for x in (-.09, .09):
        a.box('bolt_guide', (x, .08, 1.33), (.033, .82, .045), 'iron', .008)
    # Wide swept paired limbs and visible taut strings identify a crossbow.
    for z in (1.24, 1.42 if stage >= 1 else 1.24):
        if z == 1.24 and stage == 0 and any(p.name.startswith('bow_limb') for p in a.PARTS): continue
        for sign in (-1, 1):
            a.tube('bow_limb', [(0, .35, z), (sign*.37, .39, z+.035), (sign*.68, .21, z+.015)], .052, 'wood_end')
        a.tube('taut_bowstring', [(-.68, .21, z), (0, -.29, z), (.68, .21, z)], .012, 'iron')
    a.box('gold_bolt', (0, .10, 1.355), (.034, .74, .034), 'bronze', .006)
    a.mesh('broad_bolt_head', [(-.06, .39, 1.355), (.06, .39, 1.355), (0, .56, 1.355), (0, .42, 1.40), (0, .42, 1.31)], [(0, 2, 3), (2, 1, 3), (0, 4, 2), (1, 2, 4), (0, 3, 1, 4)], 'iron', .004)
    wheel = a.cylinder('winding_wheel', (.26, -.23, 1.17), .16, .045, 'bronze', 12)
    wheel.rotation_euler.y = math.pi/2
    for sign in (-1, 1):
        a.box('ammunition_case', (sign*.43, -.18, 1.06), (.21, .40, .20), 'cobalt', .016)
        for i in range(3):
            a.box('stored_bolt', (sign*.43+(i-1)*.043, -.18, 1.175), (.026, .34, .026), 'bronze', .003)
    if stage >= 2:
        for x in (-.17, .17):
            a.box('high_feed_hopper', (x, -.32, 1.41), (.15, .19, .24), 'cobalt', .018)
            a.box('hopper_gold_cap', (x, -.32, 1.55), (.17, .21, .035), 'bronze', .005)
    a.anchor('attack_anchor', (0, .56, 1.355))
    a.anchor('hit_anchor', (0, 0, .70))
    a.anchor('label_anchor', (0, -.5, .025))
    a.save_source(name)


def hollow_barrel(start, end, radius):
    # True open bore, capped breech, thick bronze muzzle; no black solid cylinder.
    axis = (Vector(end)-Vector(start)).normalized()
    right = Vector((1, 0, 0)); up = axis.cross(right).normalized()
    verts = []
    sections = [(Vector(start), radius*.86), (Vector(end), radius), (Vector(end), radius*.65), (Vector(end)-axis*.17, radius*.65)]
    for center, r in sections:
        for i in range(12):
            t = i*math.tau/12
            verts.append(tuple(center+right*math.cos(t)*r+up*math.sin(t)*r))
    faces = []
    for ring in range(3):
        for i in range(12): faces.append((ring*12+i, ring*12+(i+1)%12, (ring+1)*12+(i+1)%12, (ring+1)*12+i))
    faces.extend([tuple(range(11, -1, -1)), tuple(range(36, 48))])
    a.mesh('open_bronze_cannon', verts, faces, 'bronze', .009)
    a.beam('dark_bore', Vector(end)-axis*.172, Vector(end)-axis*.168, radius*.95, 'recess')


def cannon(tier):
    name = 'cannon_tower_'+tier
    a.start(name)
    stage = {'low': 0, 'medium': 1, 'high': 2}[tier]
    base(stage)
    a.cylinder('blue_turntable', (0, 0, 1.02), .43, .19, 'cobalt', 12)
    a.cylinder('turret_bearing', (0, 0, 1.13), .35, .09, 'bronze', 12)
    for x in (-.29, .29):
        a.box('iron_trunnion', (x, -.03, 1.24), (.12, .32, .27), 'iron', .026)
        hub = a.cylinder('trunnion_cap', (x*1.14, -.03, 1.30), .115, .055, 'bronze', 12)
        hub.rotation_euler.y = math.pi/2
    muzzle = (0, .61, 1.59)
    hollow_barrel((0, -.22, 1.20), muzzle, .245 if stage < 2 else .275)
    a.box('breech_block', (0, -.31, 1.19), (.44, .23, .29), 'iron', .035)
    for i in range(3+stage):
        x = (i-(2+stage)/2)*.16
        a.ellipsoid('ready_cannonball', (x, -.47, 1.03), (.07, .07, .07), 'iron', segments=10, rings=6)
    if stage >= 1:
        for x in (-.47, .47):
            a.box('gold_sideplate', (x, 0, 1.14), (.075, .48, .21), 'bronze', .02)
    if stage >= 2:
        a.box('high_blue_breech_guard', (0, -.31, 1.42), (.50, .25, .10), 'cobalt', .02)
        a.box('high_gold_breech_band', (0, -.32, 1.48), (.54, .27, .035), 'bronze', .008)
    a.anchor('attack_anchor', muzzle)
    a.anchor('hit_anchor', (0, 0, .70))
    a.anchor('label_anchor', (0, -.5, .025))
    a.save_source(name)


if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [family+'_'+tier for family in ('ballista_tower', 'cannon_tower') for tier in ('low', 'medium', 'high')]
    for name in names:
        if (HERE/'sources'/f'{name}.blend').exists(): raise FileExistsError(f'Refusing to overwrite saved source: {name}')
        if name.startswith('ballista_tower_'): ballista(name.removeprefix('ballista_tower_'))
        elif name.startswith('cannon_tower_'): cannon(name.removeprefix('cannon_tower_'))
        else: raise ValueError(name)

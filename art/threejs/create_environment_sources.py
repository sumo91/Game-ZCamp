"""Create only missing Issue #4 sources; saved refinements are never overwritten."""
import math
import sys
from pathlib import Path
from mathutils import Vector
import bpy

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
import create_sample_sources as a

def stone_courses(width,depth,bottom,rows):
    a.box('mortar_core',(0,0,bottom+rows*.18/2),(width-.05,depth-.05,rows*.18),'recess',.025)
    columns=max(3,round(width/.3)); step=width/columns
    for row in range(rows):
        for side in (-1,1):
            for col in range(columns):
                x=-width/2+step*(col+.5)
                a.box('dressed_course',(x,side*depth/2,bottom+row*.18+.085),(step-.015,.09,.165),'limestone',.016)
        for side in (-1,1):
            for col in range(3):
                a.box('end_course',(side*width/2,(col-1)*depth/3,bottom+row*.18+.085),(.09,depth/3-.014,.165),'limestone',.016)

def log(name,x,y,z,length=.55,radius=.10):
    body=a.cylinder(name,(x,y,z),radius,length,'timber',12)
    body.rotation_euler.x=math.pi/2
    for side in (-1,1):
        yy=y+side*(length/2+.008)
        end=a.cylinder('cut_end',(x,yy,z),radius*.91,.013,'wood_end',12)
        end.rotation_euler.x=math.pi/2
        for ring in (.38,.70):
            points=[(x+radius*ring*math.cos(t*math.tau/12),yy+side*.008,z+radius*ring*math.sin(t*math.tau/12)) for t in range(13)]
            a.tube('growth_ring',points,.006,'timber')

def lumberyard(tier):
    name='lumberyard_'+tier; a.start(name)
    stage={'low':0,'medium':1,'high':2}[tier]
    a.box('stone_plinth',(0,0,.055),(1.6,1.32,.11),'limestone',.05)
    a.box('plinth_rim',(0,0,.125),(1.46,1.2,.045),'edge_stone',.018)
    for row in range(6): a.box('floor_plank',(0,-.48+row*.19,.17),(1.33,.177,.065),'timber',.012)
    for x in (-.56,.56):
        for y in (-.39,.4):
            a.box('post',(x,y,.64),(.115,.115,.95),'timber',.022)
            a.box('post_shoe',(x,y,.26),(.16,.16,.18),'iron',.012)
        a.beam('cross_brace',(x,-.39,.41),(x,.4,.96),.062,'wood_end')
    for y in (-.39,.4): a.box('header',(0,y,1.06),(1.34,.14,.14),'wood_end',.025)
    a.roof('blue_workshop_roof',0,.03,1.10,1.49,1.13,.37)
    for x in (-.53,.53): a.beam('gable_joist',(x,-.54,1.10),(0,-.54,1.40),.056,'timber')
    a.box('front_gable_badge',(0,-.559,1.26),(.18,.025,.17),'cobalt',.007)
    a.emblem(0,-.579,1.28,.47)
    a.box('saw_bench',(0,-.22,.48),(.77,.47,.12),'timber',.023)
    for x in (-.27,.27): a.box('bench_leg',(x,-.22,.33),(.09,.32,.32),'wood_end',.015)
    # Vertical toothed steel blade; cut timber and warm end grain identify production.
    blade=a.cylinder('saw_blade',(-.05,-.28,.65),.245,.035,'iron',16)
    blade.rotation_euler.x=math.pi/2
    for i in range(12):
        t=i*math.tau/12; x=-.05+.26*math.cos(t); z=.65+.26*math.sin(t)
        a.mesh('saw_tooth',[(x,-.30,z),(x+.055*math.cos(t+.7),-.30,z+.055*math.sin(t+.7)),(x+.035*math.cos(t-.7),-.30,z+.035*math.sin(t-.7))],[(0,1,2)],'edge_stone',0)
    hub=a.cylinder('saw_hub',(-.05,-.322,.65),.060,.04,'bronze',12); hub.rotation_euler.x=math.pi/2
    log('timber_in_saw',.13,-.17,.54,.76,.075)
    for i in range(3): log('stacked_log',-.38+i*.25,-.45,.285,.42,.10)
    if stage>=1:
        for x in (-.64,.64): a.box('gold_post_band',(x,-.38,.71),(.075,.12,.075),'bronze',.009)
        a.box('rear_storage_rack',(0,.43,.39),(1.1,.24,.055),'timber',.014)
        for i in range(3): log('stored_timber',-.31+i*.3,.36,.46,.28,.085)
        a.box('gold_roof_fascia',(0,-.558,1.12),(1.5,.033,.056),'bronze',.011)
    if stage>=2:
        for x in (-.6,.6):
            a.beam('flag_mast',(x,.42,1.13),(x,.42,1.72),.035,'bronze')
            a.mesh('guild_flag',[(x,.42,1.69),(x+.18,.42,1.65),(x+.14,.42,1.49),(x,.42,1.51)],[(0,1,2,3)],'cobalt',0)
        a.box('guild_sign',(0,-.61,.97),(.47,.035,.16),'cobalt',.012)
        a.emblem(0,-.637,.97,.45)
        for i in range(2): log('upper_stack',-.23+i*.25,-.45,.46,.42,.09)
    a.anchor('attack_anchor',(0,0,.75)); a.anchor('hit_anchor',(0,0,.72)); a.anchor('label_anchor',(0,-.5,.025))
    a.save_source(name)

def main_city():
    a.start('main_city')
    a.box('castle_foundation',(0,0,.065),(1.75,1.4,.13),'limestone',.045)
    a.box('foundation_cap',(0,0,.17),(1.66,1.32,.085),'edge_stone',.03)
    stone_courses(1.3,1.03,.21,5)
    for x in (-.67,.67):
        a.box('corner_tower',(x,.32,.72),(.28,.48,1.05),'edge_stone',.036)
        for z in (.36,.72,1.05): a.box('corner_course_band',(x,.32,z),(.31,.5,.045),'limestone',.01)
        a.roof('corner_blue_cap',x,.32,1.25,.40,.57,.24)
        a.box('gold_corner_cornice',(x,.32,1.22),(.35,.51,.055),'bronze',.014)
    a.arch('castle_entry',0,-.61,.25,.40,.72,'edge_stone')
    a.box('oak_entry_door',(0,-.64,.53),(.32,.035,.51),'timber',.015)
    for x in (-.08,.08): a.box('door_iron_stile',(x,-.665,.53),(.025,.02,.48),'iron',.006)
    a.box('door_gold_handle',(.10,-.685,.50),(.04,.022,.055),'bronze',.012)
    for x in (-.45,.45):
        a.arch('high_window',x,-.575,.75,.15,.28,'edge_stone')
        a.box('blue_window_glass',(x,-.596,.86),(.11,.018,.17),'cobalt',.008)
    a.box('gold_cornice',(0,0,1.14),(1.45,1.16,.075),'bronze',.022)
    a.roof('great_blue_roof',0,.04,1.19,1.54,1.21,.51)
    # Front dormer and a thick relief identify the fixed camp core at high angle.
    a.box('front_dormer',(0,-.43,1.36),(.38,.27,.23),'edge_stone',.02)
    a.roof('dormer_cap',0,-.46,1.47,.46,.36,.18)
    a.box('royal_banner',(0,-.673,1.02),(.27,.022,.29),'cobalt',.008)
    a.emblem(0,-.696,1.03,.70)
    a.beam('central_standard',(0,.35,1.64),(0,.35,2.06),.04,'bronze')
    a.mesh('castle_standard',[(0,.35,2.02),(.31,.35,1.97),(.27,.35,1.85),(0,.35,1.88)],[(0,1,2,3)],'cobalt',0)
    a.anchor('attack_anchor',(0,.2,1.7)); a.anchor('hit_anchor',(0,0,.86)); a.anchor('label_anchor',(0,-.52,.025))
    a.save_source('main_city')

def wall_segment():
    a.start('wall_segment')
    a.box('wall_foot',(0,0,.065),(1.9,.71,.13),'limestone',.025)
    stone_courses(1.84,.5,.13,4)
    a.box('wall_cap',(0,0,.885),(1.9,.66,.10),'edge_stone',.025)
    for x in (-.66,0,.66): a.box('broad_merlon',(x,0,1.075),(.31,.62,.31),'edge_stone',.035)
    for x in (-.72,.72):
        a.box('wall_buttress',(x,-.29,.48),(.16,.18,.65),'edge_stone',.022)
        a.box('buttress_base',(x,-.29,.18),(.22,.25,.17),'limestone',.023)
    a.box('blue_defender_banner',(0,-.30,.56),(.24,.027,.31),'cobalt',.009)
    a.emblem(0,-.327,.58,.65)
    a.anchor('hit_anchor',(0,0,.7)); a.anchor('label_anchor',(0,0,1.27))
    a.save_source('wall_segment')

def pine_tree():
    a.start('pine_tree')
    a.material('pine_dark','345047',.95); a.material('pine_mid','456548',.93); a.material('pine_tip','62805A',.92)
    trunk=a.cylinder('bark_trunk',(0,0,.64),.095,1.28,'timber',9)
    for i in range(5):
        t=i*math.tau/5
        a.beam('root_flare',(0,0,.27),(.23*math.cos(t),.23*math.sin(t),.027),.070,'timber')
    for level,(z,r,h) in enumerate(((.52,.60,.75),(.94,.49,.65),(1.29,.36,.63))):
        verts=[]
        for ring,zz in ((1,z),(1.08,z+.13),(.38,z+h*.72)):
            for i in range(9):
                t=i*math.tau/9+level*.2; irregular=1+.07*math.sin(i*4+level)
                verts.append((r*ring*irregular*math.cos(t),r*ring*irregular*math.sin(t),zz))
        verts.append((.035,-.015,z+h)); faces=[]
        for ring in range(2):
            for i in range(9): faces.append((ring*9+i,ring*9+(i+1)%9,(ring+1)*9+(i+1)%9,(ring+1)*9+i))
        for i in range(9): faces.append((18+i,18+(i+1)%9,27))
        faces.append(tuple(reversed(range(9))))
        a.mesh('branch_canopy',verts,faces,['pine_dark','pine_mid','pine_tip'][level],.014)
    a.anchor('label_anchor',(0,0,2)); a.save_source('pine_tree')

def rock_cluster():
    a.start('rock_cluster'); a.material('rock_moss','617253',.96)
    for index,(x,y,s) in enumerate(((-.22,0,1),(.26,.11,.70),(.11,-.21,.49))):
        base=[]; middle=[]; top=[]
        for i in range(7):
            t=i*math.tau/7; rr=s*(.27+.04*math.sin(i*5+index))
            base.append((x+rr*math.cos(t),y+rr*math.sin(t),0))
            middle.append((x+rr*1.07*math.cos(t),y+rr*.95*math.sin(t),s*(.20+.025*math.cos(i))))
            top.append((x+rr*.65*math.cos(t),y+rr*.65*math.sin(t),s*(.38+.022*math.sin(i*3))))
        verts=base+middle+top; faces=[]
        for ring in range(2):
            for i in range(7): faces.append((ring*7+i,ring*7+(i+1)%7,(ring+1)*7+(i+1)%7,(ring+1)*7+i))
        faces.extend([tuple(reversed(range(7))),tuple(range(14,21))])
        a.mesh('weathered_rock',verts,faces,'limestone',.025)
        moss=[(px,py,pz+.006) for px,py,pz in top[:4]]
        a.mesh('top_moss',moss,[(0,1,2,3)],'rock_moss',0)
        a.tube('stone_fissure',[(x-.10*s,y-.24*s,.15*s),(x-.04*s,y-.265*s,.25*s),(x+.03*s,y-.24*s,.33*s)],.008*s,'recess')
    a.anchor('label_anchor',(0,0,.5)); a.save_source('rock_cluster')

def camp_plot():
    a.start('camp_plot'); a.material('plot_soil','71805B',.98)
    a.box('pressed_earth',(0,0,.018),(1.76,1.49,.036),'plot_soil',.021)
    for side in (-1,1):
        for i in range(4):
            a.box('low_stone_edge',((i-1.5)*.45,side*.766,.03),(.434,.062,.06),'edge_stone',.012)
        for i in range(3):
            a.box('end_stone_edge',(side*.891,(i-1)*.48,.03),(.062,.462,.06),'limestone',.012)
    a.anchor('label_anchor',(0,-.5,.025)); a.save_source('camp_plot')

if __name__=='__main__':
    names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['lumberyard_low','lumberyard_medium','lumberyard_high','main_city','wall_segment','pine_tree','rock_cluster','camp_plot']
    for name in names:
        if (HERE/'sources'/f'{name}.blend').exists(): raise RuntimeError(f'Refusing to overwrite saved source: {name}')
        if name.startswith('lumberyard_'): lumberyard(name.removeprefix('lumberyard_'))
        elif name=='main_city': main_city()
        elif name=='wall_segment': wall_segment()
        elif name=='pine_tree': pine_tree()
        elif name=='rock_cluster': rock_cluster()
        elif name=='camp_plot': camp_plot()
        else: raise ValueError(name)

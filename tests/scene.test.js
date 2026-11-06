'use strict';
// Exercise the actual r128 scene graph/buffers on the CPU. This does not claim GPU rendering.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const THREE=require('../vendor/three.min.js'),P=require('../physics.js');
const context={window:{},HarmonicPhysics:P};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scene.js'),'utf8'),context);
const Scene=context.window.MechanicalScene;
function fixture(){
  const s=Object.create(Scene.prototype);Object.assign(s,{T:THREE,is3D:true,scene:new THREE.Scene(),objects:new Map(),materials:new Map(),helix:new Map(),labelNodes:new Map(),boxGeo:new THREE.BoxGeometry(1,1,1),sphereGeo:new THREE.SphereGeometry(1,24,16),dir:new THREE.Vector3(),time:0});
  s.label=()=>{};s.sampleHorizontal=t=>P.horizontal(P.DEFAULTS.horizontal,t);return s;
}
const options={vectors:{x:true,v:true,a:true},forces:{spring:true,gravity:true,net:true},wave:true,projections:true};
function verify(s){
  for(const [id,o]of s.objects){assert.ok(Number.isFinite(o.position.x)&&Number.isFinite(o.position.y)&&Number.isFinite(o.position.z),id);o.traverse(n=>{if(n.geometry?.attributes.position){const a=n.geometry.attributes.position.array;for(const v of a)assert.ok(Number.isFinite(v),`${id}: position`);}});}
}
test('Three.js r128: hình học động hợp lệ và bộ đệm được tái sử dụng',()=>{
  const s=fixture();
  const warm=P.all(P.DEFAULTS,'physical',.137);s.drawHorizontal(warm.samples.horizontal,0,0,6.6,options);s.drawVertical(warm.samples.vertical,0,3.2,5.6,options);s.drawPendulum(warm.samples.pendulum,7,3,5.2,options);
  s.originalCount=s.objects.size;s.originalBuffers=new Map([...s.objects].filter(([,o])=>o.geometry?.attributes.position).map(([id,o])=>[id,o.geometry.attributes.position.array]));
  for(let i=0;i<100;i++){
    const b=P.all(P.DEFAULTS,'physical',i/60);s.drawHorizontal(b.samples.horizontal,0,0,6.6,options);s.drawVertical(b.samples.vertical,0,3.2,5.6,options);s.drawPendulum(b.samples.pendulum,7,3,5.2,options);verify(s);
    assert.equal(s.objects.size,s.originalCount);for(const [id,buffer]of s.originalBuffers)assert.equal(s.objects.get(id).geometry.attributes.position.array,buffer);
  }
  s.disposeThree();assert.equal(s.objects.size,0);
});
test('Lò xo đứng: đầu dây trùng điểm gắn vật, không chạm trần',()=>{
  const s=fixture();
  for(const m of [.1,2])for(const k of [2,80])for(const g of [0,20])for(const l0 of [.2,1.5])for(const phase of [0,Math.PI/2,Math.PI]){
    const p=P.sanitize('vertical',{m,k,g,l0,A:.6,phi:phase}),q=P.vertical(p,0);s.drawVertical(q,0,3.2,5.6,options);verify(s);
    const points=s.objects.get('v-coil').geometry.attributes.position.array,foot=s.objects.get('v-attachment').position;
    assert.ok(Math.abs(points[points.length-2]-foot.y)<1e-5);assert.ok(Math.abs(points[points.length-3]-foot.x)<1e-5);assert.ok(foot.y<3.2);
    assert.ok(s.objects.get('v-mass').position.y+.33<=3.2);
  }
});
test('Lò xo ngang: đầu dây gắn đúng mặt vật và hình học không đổi độ dài dây con lắc',()=>{
  const s=fixture();
  for(const phase of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
    const h=P.horizontal({...P.DEFAULTS.horizontal,A:.6,phi:phase},0);s.drawHorizontal(h,0,0,6.6,options);verify(s);
    const pts=s.objects.get('h-coil').geometry.attributes.position.array,mass=s.objects.get('h-mass');assert.ok(Math.abs(pts[pts.length-3]-(mass.position.x-.31))<1e-5);
    const p=P.pendulum({...P.DEFAULTS.pendulum,phi:phase},0);s.drawPendulum(p,0,3,5.2,options);
    const rope=s.objects.get('p-rope').geometry.attributes.position.array;assert.ok(Math.abs(Math.hypot(rope[3]-rope[0],rope[4]-rope[1])-5.2)<1e-5);
  }
});

test('Vectơ trọng lực có độ dài không đổi khi dao động, cùng thang với lực đàn hồi',()=>{
  const s=fixture(),p=P.DEFAULTS.vertical;let length;
  for(const phase of [0,.5,Math.PI/2,Math.PI,3*Math.PI/2]){
    const q=P.vertical({...p,phi:phase},0);s.drawVertical(q,0,3.2,5.6,options);
    const gravity=s.objects.get('v-force-gravity').cone.position.y;
    if(length===undefined)length=gravity;assert.ok(Math.abs(gravity-length)<1e-12);
    if(phase===Math.PI/2)assert.ok(Math.abs(s.objects.get('v-force-spring').cone.position.y-gravity)<1e-12);
  }
});

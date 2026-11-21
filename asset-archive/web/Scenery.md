# Procedural artwork

Original Phaser drawing routines for the village, house, platforms, gate, particles and card previews. These excerpts use the scene and room coordinates from the retired prototype.

```ts
  drawRoom(){
    if(!this.scenery)return;this.scenery.removeAll(true);this.loadedRoom=world.roomIndex;this.particles=[];
    const add=(o:Phaser.GameObjects.GameObject)=>{this.scenery.add(o);return o;};
    add(this.add.image(480,210,'concept-forest').setDisplaySize(960,420).setTint([0xffffff,0xaacbdc,0xd7b7cb][world.room.chapter]));
    const atmosphere=this.add.graphics();add(atmosphere);
    if(world.room.chapter===1){
      atmosphere.fillStyle(0x081722,.7);
      for(let i=0;i<7;i++){const x=35+i*145,y=140+(i%3)*20;atmosphere.fillRect(x,y,85,220);atmosphere.fillTriangle(x-12,y,x+42,y-55,x+98,y);atmosphere.fillStyle(0xb8b995,.2);atmosphere.fillRect(x+20,y+20,12,18);atmosphere.fillStyle(0x081722,.7);}
      atmosphere.fillStyle(0x244b61,.5);atmosphere.fillRect(0,360,960,60);
      atmosphere.lineStyle(1,0x8cbac6,.15);for(let y=365;y<420;y+=9)atmosphere.lineBetween(0,y,960,y);
    }else if(world.room.chapter===2){
      atmosphere.fillStyle(0x211323,.65);atmosphere.fillRect(600,90,240,330);atmosphere.fillTriangle(575,90,720,10,865,90);
      atmosphere.fillStyle(0xd4a25d,.35);for(const x of [645,740])for(const y of [140,230])atmosphere.fillRoundedRect(x,y,30,45,12);
      atmosphere.lineStyle(5,0x1b2422,.7);for(let i=0;i<12;i++){const x=i*90;atmosphere.lineBetween(x,420,x+35,230);atmosphere.lineBetween(x+20,300,x-5,270);}
    }
    const shade=this.add.graphics();add(shade);shade.fillStyle(CHAPTERS[world.room.chapter].color,world.room.chapter===0?.12:.22);shade.fillRect(0,0,960,420);
    // Separately rendered foreground masonry shares the physical platform bounds.
    for(const p of world.room.platforms.filter(p=>!p.motion&&!p.crumble)){
      const tile=this.add.tileSprite(p.x,p.y+3,p.w,p.h,'concept-stone').setOrigin(0,0).setTileScale(.22).setTint(0xa6b3a3);
      tile.tilePositionX=p.x*3;tile.tilePositionY=p.y*2;add(tile);
    }
    // Solid platforms: muted stone bodies, brighter moss marks all landable tops.
    const stone=this.add.graphics();add(stone);
    for(const p of world.room.platforms.filter(p=>!p.motion&&!p.crumble)){
      stone.fillStyle(0x091a23,.17);stone.fillRect(p.x,p.y+8,p.w,p.h);
      stone.fillStyle(0x2c3432);stone.fillRect(p.x,p.y+2,p.w,7);
      stone.fillStyle(0xaaa68a);stone.fillRect(p.x,p.y+2,p.w,2);
      stone.fillStyle(0x63794d);stone.fillRect(p.x,p.y,p.w,5);stone.fillStyle(0xa2b16d);stone.fillRect(p.x,p.y,p.w,2);
      for(let x=p.x+4;x<p.x+p.w-4;x+=8){const h=2+Math.floor(Math.abs(Math.sin(x*6.2))*9);stone.fillStyle(x%3?0x728952:0x9cab61);stone.fillRect(x,p.y-h,3,h+4);if(x%5<2){stone.fillStyle(0x536c47);stone.fillRect(x+2,p.y+5,3,h+6);}}
      for(let x=p.x+24;x<p.x+p.w-20;x+=72){stone.lineStyle(2,0x4c6747,.6);stone.beginPath();stone.moveTo(x,p.y+4);stone.lineTo(x-4,p.y+20);stone.lineTo(x+2,p.y+40);stone.strokePath();stone.fillStyle(0x718153,.7);stone.fillEllipse(x-3,p.y+18,8,4);}
    }
    // Small original atlas details and warm mushrooms, never obscuring collision edges.
    for(const p of world.room.platforms.filter(p=>!p.motion&&!p.crumble)){if(p.w>100){const m=this.add.graphics();add(m);const fx=p.x+45;for(let j=0;j<5;j++){m.lineStyle(2,0x6b8556);m.lineBetween(fx,p.y,fx+(j-2)*8,p.y-13-Math.abs(j-2)*2);for(let k=0;k<3;k++){m.fillStyle(k%2?0x698651:0x8c9c63);m.fillEllipse(fx+(j-2)*(k+1)*2,p.y-4-k*4,9,3);}}for(let i=0;i<3;i++){const x=p.x+p.w-40+i*9;m.fillStyle(0xa59970);m.fillRect(x,p.y-8,2,8);m.fillStyle(0xad5c44);m.fillRect(x-4,p.y-12,10,4);m.fillStyle(0xd6ad6e);m.fillRect(x-2,p.y-11,2,2);}}}
    // The exit is a lantern gate, with readable light reaching the floor.
    const e=world.room.exit,gate=this.add.graphics();add(gate);
    gate.fillStyle(0xf0c46b,.03);gate.fillCircle(e.x,e.y-35,62);gate.fillStyle(0xf0c46b,.055);gate.fillCircle(e.x,e.y-35,40);
    gate.fillStyle(0x263734);gate.fillRect(e.x-25,e.y-73,8,73);gate.fillRect(e.x+17,e.y-73,8,73);gate.fillRect(e.x-25,e.y-80,50,10);
    gate.fillStyle(0x7f8e68);gate.fillRect(e.x-28,e.y-82,56,4);gate.lineStyle(2,0xa98c54);gate.lineBetween(e.x,e.y-72,e.x,e.y-58);
    gate.fillStyle(0xcf9f51);gate.fillRect(e.x-7,e.y-58,14,22);gate.fillStyle(0xf7da8a);gate.fillRect(e.x-4,e.y-54,8,14);gate.fillStyle(0x6a6445);gate.fillRect(e.x-9,e.y-60,18,4);gate.fillRect(e.x-8,e.y-37,16,4);
    add(this.add.text(e.x,e.y+15,'THE WAY ON',{fontFamily:'Arial',fontSize:'8px',color:'#b3bea0'}).setOrigin(.5,0));
    // A subtle sign near the spawn grounds the first interaction.
    const s=this.add.graphics();add(s);s.fillStyle(0x514e38);s.fillRect(126,world.room.spawn.y-26,3,26);s.fillStyle(0x807b53);s.fillRect(116,world.room.spawn.y-29,28,9);s.fillStyle(0xb9ae73);s.fillTriangle(133,world.room.spawn.y-28,139,world.room.spawn.y-25,133,world.room.spawn.y-22);
  }
  private burst(color:number,count=16){if(progress.reducedMotion)return;for(let i=0;i<count;i++)this.particles.push({x:world.x,y:world.y-16,vx:Math.cos(i/count*Math.PI*2)*45,vy:Math.sin(i/count*Math.PI*2)*45-25,life:.6,max:.6,color});}
  private renderDynamic(dt:number){
    const g=this.dynamic;g.clear();const t=world.time;
    // Fireflies are purely decorative; their clock also stops while planning.
    for(let i=0;i<(progress.reducedMotion?0:24);i++){const x=(i*73+Math.sin(t*.35+i)*15)%960,y=50+(i*47)%260+Math.sin(t*.6+i)*9;g.fillStyle(0xc1c796,.12+.12*Math.sin(t+i));g.fillRect(x,y,2,2);}
    for(const p of world.roomPlatforms){
      if(!p.motion&&!p.crumble)continue;
      if(p.motion){const original=world.room.platforms[p.sourceIndex!];g.lineStyle(1,0xb4d3d7,.4);g.lineBetween(original.x-p.motion.range,original.y+22,original.x+p.motion.range+p.w,original.y+22);}
      g.fillStyle(p.motion?0x748f91:0x967f73);g.fillRoundedRect(p.x,p.y,p.w,p.h,3);
      g.fillStyle(p.motion?0xd0e1cf:0xe4c897);g.fillRect(p.x,p.y,p.w,3);
      g.lineStyle(1,0x243b3f,.8);for(let x=p.x+12;x<p.x+p.w;x+=20)g.lineBetween(x,p.y+4,x,p.y+p.h);
      if(p.crumble){g.lineStyle(2,0x392d30);g.beginPath();g.moveTo(p.x+p.w*.4,p.y+2);g.lineTo(p.x+p.w*.5,p.y+7);g.lineTo(p.x+p.w*.43,p.y+p.h);g.strokePath();
        const left=1-(world.crumbleTimers[p.sourceIndex!]??0)/p.crumble;g.fillStyle(0xffd18c);g.fillRect(p.x,p.y-6,p.w*left,2);
      }
    }
    if(world.briar){const p=world.briar;g.lineStyle(7,0x536e47);g.lineBetween(p.x,p.y+6,p.x+p.w,p.y+6);g.lineStyle(2,0xb5c77c);g.lineBetween(p.x,p.y,p.x+p.w,p.y);for(let i=0;i<12;i++){const x=p.x+7+i*9;g.fillStyle(i%2?0x8da45e:0xa8bc71);g.fillEllipse(x,p.y+6+(i%2?4:-4),10,5);if(i%3===0){g.fillStyle(0xe0cead);g.fillCircle(x,p.y-3,3);}}}
    if(!world.treasure){const c=world.room.treasure,yy=c.y+(progress.reducedMotion?0:Math.sin(t*2)*3);g.fillStyle(0xe5c674,.06);g.fillCircle(c.x,yy,24);g.lineStyle(1,0xe4c375,.45);g.strokeCircle(c.x,yy,14);g.fillStyle(0xe6c87e);g.fillPoints([{x:c.x,y:yy-9},{x:c.x+6,y:yy},{x:c.x,y:yy+9},{x:c.x-6,y:yy}],true);g.fillStyle(0xffeab0);g.fillRect(c.x-1,yy-5,2,9);}
    const h=world.hazardPosition();if(h){const hh=world.room.hazard!;g.lineStyle(1,0xb15f57,.25);g.lineBetween(hh.x-hh.range,hh.y,hh.x+hh.range,hh.y);g.fillStyle(0xdb7460,.09);g.fillCircle(h.x,h.y,24);g.fillStyle(0xb84342,.25);g.fillCircle(h.x,h.y,15);g.fillStyle(0xdd7562);g.fillPoints([{x:h.x,y:h.y-11},{x:h.x+9,y:h.y+1},{x:h.x+3,y:h.y+12},{x:h.x-8,y:h.y+6}],true);g.fillStyle(0xffd7ac);g.fillRect(h.x-3,h.y-3,2,3);g.fillRect(h.x+3,h.y-3,2,3);}
    for(const p of this.particles){if(world.mode==='playing'||world.mode==='complete'){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=35*dt;}g.fillStyle(p.color,Math.max(0,p.life/p.max));g.fillRect(Math.round(p.x),Math.round(p.y),3,3);}
    this.particles=this.particles.filter(p=>p.life>0);
    if(world.mode==='playing'&&world.dash>0){g.fillStyle(world.dark?0xac87cc:0xead7a3,.45);g.fillRect(world.x-world.facing*40,world.y-20,world.facing*29,3);g.fillRect(world.x-world.facing*33,world.y-10,world.facing*20,2);}
    // Foreground leaves frame the bottom edge without concealing a landing surface.
    g.fillStyle(0x0a1d1f,.55);for(let i=0;i<32;i++){const x=i*32;g.fillTriangle(x,420,x+9,405+(i%3)*4,x+22,420);}
  }
  private renderPreview(){
    const g=this.preview;g.clear();if(world.mode!=='planning'||!world.selected||ui.isHelpOpen)return;
    const c=world.selected;
    if(c==='briar'){
      const valid=world.validBriar().ok,color=valid?0xb6d597:0xe18479;
      g.lineStyle(1,0xcbd8b3,.2);g.strokeCircle(world.x,world.y-15,BALANCE.briarReach);
      g.lineStyle(1,color,.45);g.lineBetween(world.x,world.y-15,world.target.x,world.target.y);
      g.fillStyle(color,.18);g.fillRect(world.target.x-56,world.target.y,112,12);g.lineStyle(2,color,.9);g.strokeRect(world.target.x-56,world.target.y,112,12);
      if(valid){g.lineBetween(world.target.x-4,world.target.y-13,world.target.x,world.target.y-9);g.lineBetween(world.target.x,world.target.y-9,world.target.x+7,world.target.y-18);}
      else{g.lineBetween(world.target.x-5,world.target.y-18,world.target.x+5,world.target.y-8);g.lineBetween(world.target.x+5,world.target.y-18,world.target.x-5,world.target.y-8);}
    }else{
      let endX=world.x,endY=world.y-15;
      if(c==='feather'){endY-=BALANCE.feather**2/(2*BALANCE.gravity);for(let y=world.y-20;y>endY;y-=12){g.fillStyle(0xefe1ad,.65);g.fillCircle(world.x,y,2);}g.lineStyle(2,0xefe1ad,.8);g.lineBetween(endX-7,endY+8,endX,endY);g.lineBetween(endX+7,endY+8,endX,endY);}
      else{endX+=world.facing*BALANCE.dashSpeed*BALANCE.dashDuration;
        for(const p of world.platforms)if(world.y>p.y+1&&world.y-30<p.y+p.h){if(world.facing>0&&p.x>world.x)endX=Math.min(endX,p.x-9);if(world.facing<0&&p.x+p.w<world.x)endX=Math.max(endX,p.x+p.w+9);}
        endX=Math.max(10,Math.min(950,endX));for(let x=world.x;Math.abs(x-world.x)<Math.abs(endX-world.x);x+=world.facing*12){g.fillStyle(0xefe1ad,.65);g.fillCircle(x,endY,2);}g.lineStyle(2,0xefe1ad,.8);g.lineBetween(endX-world.facing*9,endY-6,endX,endY);g.lineBetween(endX-world.facing*9,endY+6,endX,endY);
      }
      g.lineStyle(1,0xe6d5a0,.5);g.strokeCircle(endX,endY,12);
    }
  }
```

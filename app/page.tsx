'use client';

import { useState } from 'react';
import { Battle, Hero, HeroSelect } from './game';

type Screen = 'home'|'select'|'battle';

export default function Home() {
  const [screen,setScreen]=useState<Screen>('home');
  const [match,setMatch]=useState<{hero:Hero;era:'medieval'|'modern'}|null>(null);

  if(screen==='select') return <HeroSelect onBack={()=>setScreen('home')} onLaunch={(hero,era)=>{setMatch({hero,era});setScreen('battle');}}/>;
  if(screen==='battle'&&match) return <Battle hero={match.hero} era={match.era} onExit={()=>setScreen('select')}/>;

  return (
    <main className="shell">
      <nav className="topbar">
        <div className="brand"><span className="brandMark">B</span><b>BLOCKBOUND</b><em>ARENA</em></div>
        <div className="navLinks"><a href="#rules">HOW TO PLAY</a><a href="#eras">BATTLEGROUNDS</a></div>
        <div className="navStatus"><span className="onlineDot" /> 2,418 PLAYERS ONLINE</div>
      </nav>

      <section className="hero">
        <div className="heroCopy">
          <p className="eyebrow">TEAM UP · PUSH LANES · BREAK THE HEART</p>
          <h1>BUILD YOUR<br/><span>LEGEND.</span></h1>
          <p className="intro">A fast, block-forged 5v5 battle where every takedown powers the whole team. Level together. Upgrade your hero. Shatter their stronghold.</p>
          <button className="playButton" onClick={()=>setScreen('select')}>PLAY 5V5 DEMO <span>›</span></button>
          <div className="modeRow"><span><b>5v5</b> TEAM BATTLE</span><span><b>2</b> DISTINCT ERAS</span><span><b>10</b> HEROES</span></div>
        </div>

        <div className="arenaPreview" aria-label="Blocky arena preview">
          <div className="sun" />
          <div className="mountain mountainOne" />
          <div className="mountain mountainTwo" />
          <div className="groundPlane">
            <div className="river" />
            <div className="lane" />
            <div className="block castle"><i/><i/><i/><strong>♥</strong></div>
            <div className="block tower redTower"><i/></div>
            <div className="block tower blueTower"><i/></div>
            <div className="block fighter heroRed"><i/><b/></div>
            <div className="block fighter heroBlue"><i/><b/></div>
            <span className="heroTag tagRed">THE WARDEN</span>
            <span className="heroTag tagBlue">VOLT</span>
          </div>
          <div className="previewBadge"><small>LIVE BATTLE</small><b>MEDIEVAL FRONTIER</b></div>
        </div>
      </section>

      <section className="featureStrip" id="rules">
        <div><small>SHARED PROGRESSION</small><b>ONE TEAM. ONE LEVEL.</b></div>
        <div className="xpTrack"><i style={{width:'64%'}}/><span>TEAM XP 640 / 1000</span></div>
        <div className="levelPip">LVL <b>4</b></div>
      </section>
    </main>
  );
}

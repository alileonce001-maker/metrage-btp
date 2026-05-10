<h1>VERSION TEST 999</h1>
"use client";
import { useState, useRef, useEffect } from "react";

// ─── PALETTE ─────────────────────────────────────────────────────────────
const C = {
  dark:        "#111318",
  darkMid:     "#1A1E25",
  darkCard:    "#22262F",
  darkBorder:  "#2E333D",
  orange:      "#F06A00",
  orangeGlow:  "#FF8C3A",
  orangeDim:   "#6B3000",
  cream:       "#F2EDE6",
  creamMuted:  "#A09A92",
  creamDim:    "#5C5650",
  green:       "#1FC87A",
  greenDim:    "#0A3D25",
  red:         "#E84545",
  redDim:      "#3D0F0F",
  amber:       "#F5A623",
  amberDim:    "#5A3800",
  blue:        "#3B9EFF",
  blueDim:     "#0C2A50",
};

// ─── CODES VALIDES (à distribuer manuellement après paiement) ─────────────
// Format: CODE -> { used: false, amount: 1000 }
// Tu peux en ajouter autant que tu veux
const VALID_CODES = new Set([
  "BC2025","KB1001","KB1002","KB1003","KB1004","KB1005",
  "KS2001","KS2002","KS2003","KS2004","KS2005",
  "BA3001","BA3002","BA3003","BA3004","BA3005",
  "BTP001","BTP002","BTP003","BTP004","BTP005",
  "TEST01", // code de test
]);

// ─── HELPER : béton ───────────────────────────────────────────────────────
function beton(volBrut, perte) {
  const v = volBrut * (1 + perte / 100);
  return [
    { l: "Volume béton brut",  v: volBrut.toFixed(3), u: "m³" },
    { l: "Volume + perte",     v: v.toFixed(3),        u: "m³", n: `+${perte}%` },
    { l: "Ciment",             v: Math.ceil((v*350)/50), u: "sacs 50 kg" },
    { l: "Sable",              v: (v*0.5).toFixed(2),  u: "m³" },
    { l: "Gravier",            v: (v*0.8).toFixed(2),  u: "m³" },
    { l: "Eau estimée",        v: Math.round(v*175),   u: "litres" },
  ];
}

// ─── FERRAILLAGE ──────────────────────────────────────────────────────────
const HA_DIAMS = [6,8,10,12,14,16,20,25,32];
const RECOUV   = { recouvrement:50, ancrage:40, chute_pct:3 };
function pU(d){ return (d*d)/162; }

// ─── MODULES ─────────────────────────────────────────────────────────────
const MODULES = [
  { id:"gros", icon:"⬛", label:"Gros œuvre", subcats:[
    { id:"terra", label:"Terrassement", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"profondeur",label:"Profondeur",u:"m"},
        {id:"remblai_pct",label:"% remblai réutilisé",u:"%",def:30},
        {id:"cap_camion",label:"Capacité camion",u:"m³",def:10}],
      calc:(v)=>{
        const vol=v.longueur*v.largeur*v.profondeur, fo=vol*1.25;
        const rm=vol*(v.remblai_pct/100);
        return[{l:"Volume fouille",v:vol.toFixed(2),u:"m³"},
               {l:"Volume foisonné",v:fo.toFixed(2),u:"m³",n:"×1,25"},
               {l:"Déblai à évacuer",v:(vol-rm).toFixed(2),u:"m³"},
               {l:"Remblai réutilisable",v:rm.toFixed(2),u:"m³"},
               {l:"Rotations camion",v:Math.ceil(fo/v.cap_camion),u:"voyages"},
               {l:"Surface compactage",v:(v.longueur*v.largeur).toFixed(1),u:"m²"}];}},
    { id:"b-sem", label:"Béton — Semelles", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.40},
        {id:"nb",label:"Nombre semelles",u:"u",def:1},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur*v.nb,v.perte)},
    { id:"b-pot", label:"Béton — Poteaux", fields:[
        {id:"section",label:"Section (côté)",u:"m",def:0.25},
        {id:"hauteur",label:"Hauteur",u:"m"},
        {id:"nb",label:"Nombre poteaux",u:"u",def:4},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.section*v.section*v.hauteur*v.nb,v.perte)},
    { id:"b-lon", label:"Béton — Longrines", fields:[
        {id:"longueur",label:"Longueur totale",u:"m"},
        {id:"larg_s",label:"Largeur section",u:"m",def:0.20},
        {id:"haut_s",label:"Hauteur section",u:"m",def:0.30},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.larg_s*v.haut_s,v.perte)},
    { id:"b-dal", label:"Béton — Dalle", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.12},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur,v.perte)},
    { id:"b-pou", label:"Béton — Poutres", fields:[
        {id:"longueur",label:"Longueur totale",u:"m"},
        {id:"larg_s",label:"Largeur section",u:"m",def:0.20},
        {id:"haut_s",label:"Hauteur section",u:"m",def:0.40},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.larg_s*v.haut_s,v.perte)},
    { id:"ferr", label:"Ferraillage HA", isFerr:true, fields:[
        {id:"poids_theorique",label:"Poids théorique projet",u:"kg",def:0,hint:"Issu des plans de ferraillage"},
        {id:"diametre",label:"Diamètre HA",u:"mm",def:12,opts:HA_DIAMS},
        {id:"long_barre",label:"Long. réelle barre",u:"m",def:12,hint:"Longueur commerciale (ex: 12 m)"},
        {id:"nb_recouv",label:"Nb recouvrements",u:"u",def:0,hint:"Jonctions entre barres"},
        {id:"nb_ancrages",label:"Nb ancrages",u:"u",def:0,hint:"Extrémités ancrées dans béton"},
        {id:"long_cadre",label:"Long. développée cadre",u:"m",def:1.2},
        {id:"nb_cadres",label:"Nb cadres/étriers",u:"u",def:0},
        {id:"diam_cadre",label:"Diamètre cadres",u:"mm",def:6,opts:[6,8,10]},
        {id:"perte_chantier",label:"Perte chantier",u:"%",def:5,opts:[3,5]},
        {id:"prix_tonne",label:"Prix acier (par tonne)",u:"FCFA/t",def:450000,hint:"Prix marché actuel"}],
      calc:(v)=>{
        const d=v.diametre, pu_=pU(d);
        const lr=(RECOUV.recouvrement*d/1000)*v.nb_recouv;
        const la=(RECOUV.ancrage*d/1000)*v.nb_ancrages;
        const lt=v.poids_theorique>0?v.poids_theorique/pu_:0;
        const lav=lt+lr+la;
        const lch=lav*(RECOUV.chute_pct/100);
        const ln=lav+lch;
        const lp=ln*(1+v.perte_chantier/100);
        const nb=Math.ceil(lp/v.long_barre);
        const la2=nb*v.long_barre;
        const pa=la2*pu_;
        const pp=pa-v.poids_theorique;
        const pct_p=v.poids_theorique>0?((pp/v.poids_theorique)*100).toFixed(1):"—";
        const pc=v.nb_cadres>0?pU(v.diam_cadre)*v.long_cadre*v.nb_cadres:0;
        const ptot=pa+pc;
        const ctot=(ptot/1000)*v.prix_tonne;
        const cp=(pp/1000)*v.prix_tonne;
        return {type:"ferraillage",sections:[
          {title:"Longueurs calculées",color:"blue",items:[
            {l:"Long. théorique (plans)",v:lt.toFixed(1),u:"ml"},
            {l:`Recouvrements (${RECOUV.recouvrement}×ø)`,v:lr.toFixed(2),u:"ml"},
            {l:`Ancrages (${RECOUV.ancrage}×ø)`,v:la.toFixed(2),u:"ml"},
            {l:"Chutes estimées (3%)",v:lch.toFixed(2),u:"ml"},
            {l:"Long. nette nécessaire",v:ln.toFixed(1),u:"ml"},
            {l:`+ Perte chantier (${v.perte_chantier}%)`,v:lp.toFixed(1),u:"ml"}]},
          {title:"Barres à acheter",color:"green",items:[
            {l:`Barres HA${d} de ${v.long_barre} m`,v:nb,u:"barres"},
            {l:"Longueur achetée totale",v:la2.toFixed(1),u:"ml"},
            {l:`Poids unitaire HA${d}`,v:pu_.toFixed(4),u:"kg/ml"},
            {l:"Poids acier principal",v:pa.toFixed(1),u:"kg"},
            {l:`Poids cadres HA${v.diam_cadre}`,v:pc.toFixed(1),u:"kg"},
            {l:"Poids total acier",v:ptot.toFixed(1),u:"kg"}]},
          {title:"Pertes & surcoût",color:"red",items:[
            {l:"Poids théorique projet",v:v.poids_theorique.toFixed(1),u:"kg"},
            {l:"Poids réel acheté",v:pa.toFixed(1),u:"kg"},
            {l:"Poids perdu (chutes+perte)",v:pp.toFixed(1),u:"kg"},
            {l:"% perte réelle",v:pct_p,u:"%"},
            {l:"Coût perte",v:Math.round(cp).toLocaleString("fr-FR"),u:"FCFA"}]},
          {title:"Coût d'achat réel",color:"amber",items:[
            {l:"Prix unitaire tonne",v:v.prix_tonne.toLocaleString("fr-FR"),u:"FCFA/t"},
            {l:"Coût acier principal",v:Math.round((pa/1000)*v.prix_tonne).toLocaleString("fr-FR"),u:"FCFA"},
            {l:"Coût cadres/étriers",v:Math.round((pc/1000)*v.prix_tonne).toLocaleString("fr-FR"),u:"FCFA"},
            {l:"COÛT TOTAL RÉEL",v:Math.round(ctot).toLocaleString("fr-FR"),u:"FCFA",highlight:true}]}]};
      }},
    { id:"cofr", label:"Coffrage", fields:[
        {id:"perimetre",label:"Périmètre développé",u:"m"},
        {id:"hauteur",label:"Hauteur coffrée",u:"m"},
        {id:"nb_el",label:"Nb éléments",u:"u",def:1},
        {id:"perte",label:"Marge perte",u:"%",def:15}],
      calc:(v)=>{
        const s=v.perimetre*v.hauteur*v.nb_el, sP=s*(1+v.perte/100);
        return[{l:"Surface nette coffrage",v:s.toFixed(1),u:"m²"},
               {l:"Surface + perte",v:sP.toFixed(1),u:"m²",n:`+${v.perte}%`},
               {l:"Panneaux contreplaqué (1,2×1,2)",v:Math.ceil(sP/1.44),u:"u"},
               {l:"Étais de soutien",v:Math.ceil(sP/2),u:"u"}];}},
  ]},
  { id:"macon", icon:"🧱", label:"Maçonnerie", subcats:[
    { id:"parp", label:"Mur agglo / parpaing", fields:[
        {id:"longueur",label:"Longueur mur",u:"m"},{id:"hauteur",label:"Hauteur mur",u:"m"},
        {id:"epaisseur",label:"Épaisseur agglo",u:"cm",def:15,opts:[10,12,15,20]},
        {id:"nb_ouv",label:"Nb ouvertures",u:"u",def:0},
        {id:"surf_ouv",label:"Surface/ouverture",u:"m²",def:2},
        {id:"perte",label:"Marge perte",u:"%",def:5}],
      calc:(v)=>{
        const s=v.longueur*v.hauteur-v.nb_ouv*v.surf_ouv;
        const nb=Math.ceil((s/(0.40*0.20))*(1+v.perte/100));
        const mv=s*0.015;
        return[{l:"Surface nette mur",v:s.toFixed(1),u:"m²"},
               {l:`Agglos ${v.epaisseur} cm`,v:nb,u:"unités"},
               {l:"Volume mortier",v:mv.toFixed(3),u:"m³"},
               {l:"Ciment mortier",v:Math.ceil((mv*300)/50),u:"sacs 50 kg"},
               {l:"Sable",v:(mv*1.5).toFixed(2),u:"m³"},
               {l:"Eau estimée",v:Math.round(mv*180),u:"litres"}];}},
    { id:"endu", label:"Enduit / crépi", fields:[
        {id:"surface",label:"Surface à enduire",u:"m²"},
        {id:"epaisseur",label:"Épaisseur enduit",u:"mm",def:15},
        {id:"nb_couches",label:"Nombre de couches",u:"u",def:2},
        {id:"perte",label:"Marge perte",u:"%",def:10}],
      calc:(v)=>{
        const vol=v.surface*(v.epaisseur/1000)*v.nb_couches*(1+v.perte/100);
        return[{l:"Volume mortier total",v:vol.toFixed(3),u:"m³"},
               {l:"Ciment",v:Math.ceil((vol*350)/50),u:"sacs 50 kg"},
               {l:"Sable fin",v:(vol*1.5).toFixed(2),u:"m³"},
               {l:"Eau estimée",v:Math.round(vol*170),u:"litres"}];}},
    { id:"chap", label:"Chape", fields:[
        {id:"surface",label:"Surface",u:"m²"},
        {id:"epaisseur",label:"Épaisseur",u:"cm",def:5},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>{
        const vol=v.surface*(v.epaisseur/100)*(1+v.perte/100);
        return[{l:"Volume chape + perte",v:vol.toFixed(3),u:"m³"},
               {l:"Ciment",v:Math.ceil((vol*350)/50),u:"sacs 50 kg"},
               {l:"Sable",v:(vol*1.4).toFixed(2),u:"m³"},
               {l:"Eau estimée",v:Math.round(vol*160),u:"litres"}];}},
  ]},
  { id:"sols", icon:"🔲", label:"Dalle & Sols", subcats:[
    { id:"carr", label:"Carrelage", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"format",label:"Format carreau",u:"cm",def:"60x60",
          opts:["30x30","40x40","45x45","60x60","60x120","80x80","120x120"]},
        {id:"perte",label:"Marge perte",u:"%",def:10}],
      calc:(v)=>{
        const s=v.longueur*v.largeur;
        const fmt=String(v.format||"60x60").split("x").map(Number);
        const sc=(fmt[0]/100)*(fmt[1]/100);
        const nb=Math.ceil((s*(1+v.perte/100))/sc);
        return[{l:"Surface brute",v:s.toFixed(1),u:"m²"},
               {l:"Surface + perte",v:(s*(1+v.perte/100)).toFixed(1),u:"m²",n:`+${v.perte}%`},
               {l:`Carreaux ${v.format}`,v:nb,u:"unités"},
               {l:"Colle carrelage",v:Math.ceil((s*5)/25),u:"sacs 25 kg"},
               {l:"Joint",v:(s*0.3).toFixed(1),u:"kg"}];}},
    { id:"parq", label:"Parquet / PVC", fields:[
        {id:"longueur",label:"Longueur pièce",u:"m"},{id:"largeur",label:"Largeur pièce",u:"m"},
        {id:"perte",label:"Marge perte coupe",u:"%",def:10}],
      calc:(v)=>{
        const s=v.longueur*v.largeur, sP=s*(1+v.perte/100);
        return[{l:"Surface nette",v:s.toFixed(1),u:"m²"},
               {l:"Surface à commander",v:sP.toFixed(1),u:"m²",n:`+${v.perte}% coupe`},
               {l:"Boîtes (typ. 2 m²)",v:Math.ceil(sP/2),u:"boîtes"},
               {l:"Colle sol (6 kg/m²)",v:Math.ceil(s*6),u:"kg"}];}},
  ]},
  { id:"toit", icon:"🏠", label:"Toiture", subcats:[
    { id:"tole", label:"Couverture tôle / bac", fields:[
        {id:"longueur",label:"Longueur faîtage",u:"m"},
        {id:"largeur",label:"Largeur demi-versant",u:"m"},
        {id:"pente",label:"Pente",u:"%",def:30},
        {id:"nb_versants",label:"Nb versants",u:"u",def:2},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>{
        const co=Math.sqrt(1+(v.pente/100)**2);
        const sv=v.longueur*v.largeur*co, sT=sv*v.nb_versants*(1+v.perte/100);
        const tol=Math.ceil(sT/0.75);
        return[{l:"Surface par versant",v:sv.toFixed(1),u:"m²"},
               {l:"Surface totale + perte",v:sT.toFixed(1),u:"m²"},
               {l:"Tôles bac (75 cm utile)",v:tol,u:"tôles"},
               {l:"Vis de fixation",v:tol*8,u:"u"},
               {l:"Faîtage",v:Math.ceil(v.longueur/2),u:"u"},
               {l:"Gouttières",v:(v.longueur*v.nb_versants).toFixed(1),u:"ml"}];}},
    { id:"charp", label:"Charpente bois", fields:[
        {id:"longueur",label:"Longueur bâtiment",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"espacement",label:"Espacement pannes",u:"m",def:1.5},
        {id:"perte",label:"Marge perte",u:"%",def:10}],
      calc:(v)=>{
        const nb=Math.ceil(v.largeur/v.espacement)+1;
        return[{l:"Nombre pannes",v:nb*2,u:"pannes"},
               {l:"Longueur totale pannes",v:(nb*v.longueur*(1+v.perte/100)).toFixed(1),u:"ml"},
               {l:"Chevrons estimés",v:Math.ceil(v.longueur/0.6)*2,u:"u"},
               {l:"Liteaux (indicatif)",v:(v.longueur*nb*0.4*(1+v.perte/100)).toFixed(1),u:"ml"}];}},
  ]},
  { id:"pein", icon:"🎨", label:"Peinture", subcats:[
    { id:"peint", label:"Peinture murale", fields:[
        {id:"surface",label:"Surface totale",u:"m²"},
        {id:"nb_couches",label:"Nb couches",u:"u",def:2},
        {id:"rendement",label:"Rendement peinture",u:"m²/L",def:10},
        {id:"perte",label:"Marge perte",u:"%",def:10}],
      calc:(v)=>{
        const tot=v.surface*v.nb_couches*(1+v.perte/100), L=tot/v.rendement;
        return[{l:"Surface effective totale",v:tot.toFixed(1),u:"m²"},
               {l:"Peinture nécessaire",v:L.toFixed(1),u:"litres"},
               {l:"Pots de 20 L",v:Math.ceil(L/20),u:"pots"},
               {l:"Pots de 5 L",v:Math.ceil(L/5),u:"pots"}];}},
    { id:"fplaf", label:"Faux plafond", fields:[
        {id:"longueur",label:"Longueur pièce",u:"m"},{id:"largeur",label:"Largeur pièce",u:"m"},
        {id:"perte",label:"Marge perte",u:"%",def:10}],
      calc:(v)=>{
        const s=v.longueur*v.largeur*(1+v.perte/100), per=2*(v.longueur+v.largeur);
        return[{l:"Surface faux plafond",v:s.toFixed(1),u:"m²"},
               {l:"Dalles 60×60",v:Math.ceil(s/0.36),u:"u"},
               {l:"Profilés porteurs",v:Math.ceil(s/1.2),u:"u"},
               {l:"Cornières périmètre",v:Math.ceil(per*1.1),u:"ml"},
               {l:"Suspentes",v:Math.ceil(s),u:"u"}];}},
  ]},
  { id:"plom", icon:"🔧", label:"Plomberie", subcats:[
    { id:"reseau", label:"Réseau eau / évacuation", fields:[
        {id:"long_alim",label:"Alimentation (eau)",u:"m"},
        {id:"long_evac",label:"Évacuation EU/EV",u:"m"},
        {id:"nb_points",label:"Points d'eau",u:"u"},
        {id:"perte",label:"Marge perte",u:"%",def:15}],
      calc:(v)=>[
        {l:"Tuyaux alimentation",v:(v.long_alim*(1+v.perte/100)).toFixed(1),u:"ml"},
        {l:"Tuyaux évacuation",v:(v.long_evac*(1+v.perte/100)).toFixed(1),u:"ml"},
        {l:"Raccords estimés",v:v.nb_points*4,u:"u"},
        {l:"Robinetteries",v:v.nb_points,u:"u"}]},
  ]},
  { id:"elec", icon:"⚡", label:"Électricité", subcats:[
    { id:"cable", label:"Câblage & gaines", fields:[
        {id:"surface",label:"Surface habitable",u:"m²"},
        {id:"nb_prises",label:"Nb prises",u:"u"},
        {id:"nb_inter",label:"Nb interrupteurs",u:"u"},
        {id:"nb_circuits",label:"Nb circuits",u:"u",def:4},
        {id:"perte",label:"Marge perte",u:"%",def:15}],
      calc:(v)=>{
        const c=(v.surface*3+v.nb_prises*3+v.nb_inter*2)*(1+v.perte/100);
        return[{l:"Câble électrique total",v:c.toFixed(0),u:"ml"},
               {l:"Gaines ICTA",v:(c*0.8).toFixed(0),u:"ml"},
               {l:"Prises",v:v.nb_prises,u:"u"},
               {l:"Interrupteurs",v:v.nb_inter,u:"u"},
               {l:"Disjoncteurs tableau",v:v.nb_circuits+1,u:"u"}];}},
  ]},
  { id:"menu", icon:"🚪", label:"Menuiserie", subcats:[
    { id:"pf", label:"Portes & Fenêtres", fields:[
        {id:"nb_portes",label:"Nb portes",u:"u",def:3},
        {id:"larg_porte",label:"Largeur porte",u:"m",def:0.90},
        {id:"haut_porte",label:"Hauteur porte",u:"m",def:2.10},
        {id:"nb_fen",label:"Nb fenêtres",u:"u",def:4},
        {id:"larg_fen",label:"Largeur fenêtre",u:"m",def:1.20},
        {id:"haut_fen",label:"Hauteur fenêtre",u:"m",def:1.20}],
      calc:(v)=>{
        const sP=v.nb_portes*v.larg_porte*v.haut_porte;
        const sF=v.nb_fen*v.larg_fen*v.haut_fen;
        return[{l:"Portes",v:v.nb_portes,u:"u"},
               {l:"Surface portes",v:sP.toFixed(1),u:"m²"},
               {l:"Fenêtres",v:v.nb_fen,u:"u"},
               {l:"Surface vitrée",v:sF.toFixed(1),u:"m²"},
               {l:"Verre commandé",v:(sF*1.1).toFixed(1),u:"m²"}];}},
  ]},
  { id:"vrd", icon:"🛣️", label:"VRD & Extérieur", subcats:[
    { id:"pave", label:"Pavés / voirie", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"format",label:"Format pavé",u:"cm",def:20,opts:[15,20,25]},
        {id:"perte",label:"Marge perte",u:"%",def:5}],
      calc:(v)=>{
        const s=v.longueur*v.largeur, f=v.format/100;
        return[{l:"Surface à paver",v:s.toFixed(1),u:"m²"},
               {l:`Pavés ${v.format}×${v.format} cm`,v:Math.ceil((s*(1+v.perte/100))/(f*f)),u:"u"},
               {l:"Sable lit de pose",v:(s*0.03).toFixed(2),u:"m³"},
               {l:"Bordures périmètre",v:Math.ceil(2*(v.longueur+v.largeur)),u:"ml"},
               {l:"Caniveaux",v:Math.ceil(v.longueur*2),u:"ml"}];}},
    { id:"bvrd", label:"Béton voirie", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.15},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur,v.perte)},
  ]},
];

const FCOL = {
  blue:  {bg:"#08192E",border:"#153A6E",acc:"#5BB8FF",ttl:"#90D0FF"},
  green: {bg:"#081E12",border:"#145229",acc:"#1FC87A",ttl:"#7AE8B8"},
  red:   {bg:"#1E0808",border:"#6E1515",acc:"#E84545",ttl:"#FF9090"},
  amber: {bg:"#1E1008",border:"#6E4015",acc:"#F5A623",ttl:"#FFD080"},
};

// ─── HELPER : génération PDF via jsPDF ───────────────────────────────────
async function downloadPdf(curMod, curSub, results, isFerr) {
  // Charge jsPDF dynamiquement si pas encore chargé
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });
  const W = 210, L = 297;
  const mL = 18, mR = 18, mT = 20;
  let y = mT;

  // ── Fond header ──
  doc.setFillColor(240, 106, 0);
  doc.rect(0, 0, W, 36, "F");

  // Logo BC
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setFillColor(255,255,255);
  doc.roundedRect(mL, 8, 18, 18, 3, 3, "F");
  doc.setFont("helvetica","bold");
  doc.setFontSize(11);
  doc.setTextColor(240,106,0);
  doc.text("BC", mL+9, 19.5, { align:"center" });

  // Titre
  doc.setTextColor(255,255,255);
  doc.setFontSize(18);
  doc.text("BâtiCalc", mL+24, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica","normal");
  doc.text("Propulsé par Bou Aké × KS BTP", mL+24, 23);

  // Date à droite
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("fr-FR"), W-mR, 23, { align:"right" });

  y = 46;

  // ── Titre module ──
  doc.setFillColor(34,38,47);
  doc.roundedRect(mL, y-5, W-mL-mR, 16, 2, 2, "F");
  doc.setFont("helvetica","bold");
  doc.setFontSize(11);
  doc.setTextColor(242,237,230);
  doc.text(`${curMod?.label}  —  ${curSub?.label}`, mL+5, y+5);
  y += 20;

  const addSection = (title, items, accentR, accentG, accentB) => {
    if (y > L - 40) { doc.addPage(); y = mT; }
    // Section header
    doc.setFillColor(accentR, accentG, accentB);
    doc.rect(mL, y, 3, items.length*10+6, "F");
    doc.setFont("helvetica","bold");
    doc.setFontSize(8.5);
    doc.setTextColor(accentR, accentG, accentB);
    doc.text(title.toUpperCase(), mL+7, y+5);
    y += 9;

    items.forEach((it, i) => {
      if (y > L - 20) { doc.addPage(); y = mT; }
      const bg = i % 2 === 0;
      if (bg) { doc.setFillColor(26,30,37); doc.rect(mL, y-1, W-mL-mR, 9, "F"); }
      doc.setFont("helvetica","normal");
      doc.setFontSize(8);
      doc.setTextColor(160,154,146);
      doc.text(it.l, mL+6, y+5.5);
      doc.setFont("helvetica","bold");
      doc.setTextColor(it.highlight ? 240 : 242, it.highlight ? 106 : 237, it.highlight ? 0 : 230);
      doc.text(`${it.v}  ${it.u}`, W-mR-2, y+5.5, { align:"right" });
      // Ligne séparatrice légère
      doc.setDrawColor(46,51,61);
      doc.setLineWidth(0.2);
      doc.line(mL, y+8, W-mR, y+8);
      y += 9;
    });
    y += 6;
  };

  if (isFerr && results?.type === "ferraillage") {
    const colorMap = { blue:[59,158,255], green:[31,200,122], red:[232,69,69], amber:[245,166,35] };
    results.sections.forEach(sec => {
      const [r,g,b] = colorMap[sec.color] || [160,154,146];
      addSection(sec.title, sec.items, r, g, b);
    });
  } else if (Array.isArray(results)) {
    addSection("Résultats du calcul", results, 240, 106, 0);
  }

  // ── Footer ──
  doc.setFillColor(26,30,37);
  doc.rect(0, L-14, W, 14, "F");
  doc.setFont("helvetica","normal");
  doc.setFontSize(7.5);
  doc.setTextColor(92,86,80);
  doc.text("BâtiCalc · Bou Aké × KS BTP · Lomé, Togo", W/2, L-5.5, { align:"center" });

  const fname = `BatiCalc_${(curSub?.label||"").replace(/\s+/g,"_")}_${new Date().toLocaleDateString("fr-FR").replace(/\//g,"-")}.pdf`;
  doc.save(fname);
}

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────
export default function BatiCalc() {
  const [screen, setScreen]     = useState("home");
  const [curMod, setCurMod]     = useState(null);
  const [curSub, setCurSub]     = useState(null);
  const [vals, setVals]         = useState({});
  const [results, setResults]   = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // Paywall
  const [paywallStep, setPaywallStep] = useState(null); // null | "info" | "code" | "unlocked"
  const [whatsapp, setWhatsapp] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const resultsRef = useRef(null);

  const goHome = () => { setScreen("home"); setCurMod(null); setCurSub(null); setVals({}); setResults(null); setPaywallStep(null); setUnlocked(false); setShowSuccess(false); };
  const goModule = (mod) => { setCurMod(mod); setScreen("module"); setCurSub(null); setVals({}); setResults(null); setPaywallStep(null); };
  const goCalc = (sub) => { setCurSub(sub); setVals({}); setResults(null); setPaywallStep(null); setUnlocked(false); setShowSuccess(false); setScreen("calc"); };
  const setVal = (id, v) => setVals(p => ({ ...p, [id]: v }));

  const calculate = () => {
    if (!curSub) return;
    const parsed = {};
    curSub.fields.forEach(f => {
      if (f.opts && typeof (vals[f.id] ?? f.def ?? f.opts[0]) === "string") {
        parsed[f.id] = vals[f.id] ?? f.def ?? f.opts[0];
      } else {
        const n = parseFloat(vals[f.id] ?? f.def ?? 0);
        parsed[f.id] = isNaN(n) ? 0 : n;
      }
    });
    try {
      const res = curSub.calc(parsed);
      setResults(res);
      setShowSuccess(true);
      setPaywallStep(null);
      setTimeout(() => setShowSuccess(false), 3000);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch {
      setResults([{ l: "Erreur de calcul", v: "—", u: "" }]);
    }
  };

  const tryUnlock = () => {
    const code = codeInput.trim().toUpperCase();
    if (VALID_CODES.has(code)) {
      setUnlocked(true);
      setPaywallStep("unlocked");
      setCodeError("");
    } else {
      setCodeError("Code invalide. Vérifiez votre code ou contactez-nous sur WhatsApp.");
    }
  };



  const isFerr = curSub?.isFerr;

  // ── CSS ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body, #root { height: 100%; background: ${C.dark}; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: ${C.darkBorder}; border-radius: 2px; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
    @keyframes slideUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes pulse {
      0%,100% { opacity:1; }
      50%      { opacity:0.6; }
    }
    @keyframes checkIn {
      0%   { opacity:0; transform:scale(0.5); }
      70%  { transform:scale(1.1); }
      100% { opacity:1; transform:scale(1); }
    }
    .success-banner { animation: slideUp 0.4s ease; }
    .result-card    { animation: slideUp 0.35s ease both; }
    .lock-icon      { animation: pulse 2s ease infinite; }
  `;

  // ─── HOME ──────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"20px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:52, height:52, background:C.orange, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:`0 0 24px ${C.orangeDim}` }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, color:"#fff", letterSpacing:"-0.5px" }}>BC</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:28, color:C.cream, letterSpacing:"-0.5px", lineHeight:1 }}>BâtiCalc</div>
              <div style={{ fontSize:12, color:C.creamMuted, marginTop:4, letterSpacing:"0.05em" }}>
                Propulsé par <span style={{ color:C.orange, fontWeight:600 }}>Bou Aké × KS BTP</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <div style={{ padding:"22px 22px 20px", background:`linear-gradient(160deg,${C.darkMid} 0%,${C.dark} 100%)` }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:800, color:C.cream, lineHeight:1.3, marginBottom:10 }}>
            Fini les erreurs de métrés.<br/>
            <span style={{ color:C.orange }}>Calculez juste, du premier coup.</span>
          </div>
          <div style={{ fontSize:13, color:C.creamMuted, lineHeight:1.65, marginBottom:16 }}>
            BâtiCalc fait vos quantitatifs en quelques secondes — béton, ferraillage, carrelage, toiture et plus. Conçu pour les entrepreneurs, maîtres d'œuvre et chefs de chantier au Togo.
          </div>
          {/* SOCIAL PROOF PILLS */}
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["✓ 9 modules métier","✓ 20+ calculateurs","✓ Conforme BAEL / Eurocode"].map(t => (
              <div key={t} style={{ fontSize:11, fontWeight:600, color:C.green, background:C.greenDim, padding:"4px 10px", borderRadius:20 }}>{t}</div>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div style={{ padding:"0 16px 32px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {MODULES.map((mod,i) => (
            <button key={mod.id} onClick={() => goModule(mod)}
              style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:16,
                       padding:"18px 14px", textAlign:"left", cursor:"pointer",
                       display:"flex", flexDirection:"column", gap:10,
                       animation:`slideUp 0.3s ease ${i*0.04}s both` }}>
              <span style={{ fontSize:28 }}>{mod.icon}</span>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:C.cream, lineHeight:1.25 }}>{mod.label}</div>
                <div style={{ fontSize:11, color:C.creamDim, marginTop:3 }}>{mod.subcats.length} calcul{mod.subcats.length>1?"s":""}</div>
              </div>
            </button>
          ))}
        </div>

        {/* FOOTER */}
        <div style={{ textAlign:"center", padding:"16px", fontSize:11, color:C.creamDim, borderTop:`1px solid ${C.darkBorder}` }}>
          © BâtiCalc · Bou Aké × KS BTP
        </div>
      </div>
    </>
  );

  // ─── MODULE ────────────────────────────────────────────────────────────
  if (screen === "module") return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={goHome} style={{ background:"none", border:"none", color:C.orange, fontSize:24, cursor:"pointer", lineHeight:1, padding:0 }}>←</button>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.cream }}>{curMod.icon} {curMod.label}</div>
            <div style={{ fontSize:11, color:C.creamMuted }}>Bou Aké × KS BTP</div>
          </div>
        </div>
        <div style={{ padding:"16px" }}>
          <div style={{ fontSize:11, color:C.creamDim, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Sélectionnez un calcul</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {curMod.subcats.map((sub,i) => (
              <button key={sub.id} onClick={() => goCalc(sub)}
                style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:14,
                         padding:"16px 18px", textAlign:"left", cursor:"pointer",
                         display:"flex", alignItems:"center", justifyContent:"space-between",
                         animation:`slideUp 0.25s ease ${i*0.05}s both` }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:C.cream }}>{sub.label}</div>
                  <div style={{ fontSize:11, color:C.creamDim, marginTop:3 }}>{sub.fields.length} paramètres</div>
                </div>
                <span style={{ color:C.orange, fontSize:22 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // ─── CALC ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* TOPBAR */}
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:30 }}>
          <button onClick={() => { setScreen("module"); setResults(null); setVals({}); setPaywallStep(null); }}
            style={{ background:"none", border:"none", color:C.orange, fontSize:24, cursor:"pointer", lineHeight:1, padding:0 }}>
            ←
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:C.cream, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{curSub.label}</div>
            <div style={{ fontSize:10, color:C.creamMuted }}>{curMod.label}</div>
          </div>
          <div style={{ fontSize:10, fontWeight:600, background:C.orangeDim, color:C.orange, padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>{curMod.icon}</div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>

          {/* NOTICE FERRAILLAGE */}
          {isFerr && (
            <div style={{ background:"#1A1205", border:`1px solid ${C.amberDim}`, borderRadius:10, padding:"12px 14px", marginBottom:14, fontSize:11, color:C.amber, lineHeight:1.6 }}>
              ⚠️ Recouvrements : {RECOUV.recouvrement}×ø (Eurocode 2 / BAEL) · Ancrages : {RECOUV.ancrage}×ø · Chutes auto : {RECOUV.chute_pct}%
            </div>
          )}

          {/* SUCCESS BANNER */}
          {showSuccess && (
            <div className="success-banner" style={{ background:"#081E12", border:`1px solid ${C.green}`, borderRadius:12, padding:"14px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.green, display:"flex", alignItems:"center", justifyContent:"center", animation:"checkIn 0.4s ease", flexShrink:0 }}>
                <span style={{ color:"#000", fontWeight:800, fontSize:16 }}>✓</span>
              </div>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:13, color:C.green }}>Vos métrés sont prêts !</div>
                <div style={{ fontSize:11, color:"#4AE89A", marginTop:2 }}>Consultez le récapitulatif ci-dessous</div>
              </div>
            </div>
          )}

          {/* CHAMPS */}
          <div style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:16, padding:"18px 16px", marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.creamDim, marginBottom:14 }}>Dimensions & paramètres</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {curSub.fields.map(f => (
                <div key={f.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:C.creamMuted }}>{f.label}</label>
                    <span style={{ fontSize:10, color:C.creamDim }}>{f.u}</span>
                  </div>
                  {f.opts ? (
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {f.opts.map(o => {
                        const cur = vals[f.id] ?? f.def ?? f.opts[0];
                        const isActive = String(cur) === String(o);
                        return (
                          <button key={o} onClick={() => setVal(f.id, o)}
                            style={{ padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", border:"none",
                                     background: isActive ? C.orange : C.darkBorder,
                                     color: isActive ? "#fff" : C.creamMuted, transition:"all 0.1s" }}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input inputMode="decimal" type="number" min="0" step="any"
                      placeholder={String(f.def ?? 0)}
                      value={vals[f.id] ?? ""}
                      onChange={e => setVal(f.id, e.target.value)}
                      style={{ width:"100%", background:C.dark, border:`1.5px solid ${C.darkBorder}`, borderRadius:10,
                               padding:"13px 14px", color:C.cream, fontSize:16, fontFamily:"'DM Sans',sans-serif", outline:"none" }}
                      onFocus={e => (e.target.style.borderColor = C.orange)}
                      onBlur={e  => (e.target.style.borderColor = C.darkBorder)} />
                  )}
                  {f.hint && <div style={{ fontSize:10, color:C.creamDim, marginTop:5, fontStyle:"italic" }}>{f.hint}</div>}
                </div>
              ))}
            </div>

            {/* BOUTONS CALCUL */}
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={calculate}
                style={{ flex:1, background:C.orange, color:"#fff", border:"none", borderRadius:12, padding:"16px",
                         fontSize:15, fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:"pointer", letterSpacing:"0.01em" }}>
                Calculer →
              </button>
              <button onClick={() => { setVals({}); setResults(null); setPaywallStep(null); setUnlocked(false); setShowSuccess(false); }}
                style={{ padding:"16px 18px", background:"none", border:`1.5px solid ${C.darkBorder}`, borderRadius:12,
                         color:C.creamMuted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                ↺
              </button>
            </div>
          </div>

          {/* ── RÉSULTATS ── */}
          <div ref={resultsRef}>
            {results ? (
              <>
                {isFerr && results.type === "ferraillage" ? (
                  <div>
                    {results.sections.map((sec,si) => {
                      const fc = FCOL[sec.color];
                      return (
                        <div key={sec.title} className="result-card"
                          style={{ background:fc.bg, border:`1px solid ${fc.border}`, borderRadius:14, padding:"16px", marginBottom:12, animationDelay:`${si*0.08}s` }}>
                          <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:fc.ttl, marginBottom:12 }}>{sec.title}</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            {sec.items.map((it,i) => (
                              <div key={i} style={{ background: it.highlight ? fc.border : "rgba(0,0,0,0.3)", border:`1px solid ${fc.border}`, borderRadius:10, padding:"12px 14px", ...(it.highlight?{marginTop:4}:{}) }}>
                                <div style={{ fontSize:11, color:fc.acc, marginBottom:4 }}>{it.l}</div>
                                <div style={{ fontFamily:"'Syne',sans-serif", fontSize: it.highlight?22:18, fontWeight:800, color:"#fff" }}>
                                  {it.v} <span style={{ fontSize:12, fontWeight:400, color:fc.ttl }}>{it.u}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="result-card" style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:16, padding:"18px 16px" }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.creamDim, marginBottom:14 }}>Résultats du calcul</div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {(Array.isArray(results) ? results : []).map((r,i) => (
                        <div key={i} style={{ background:C.dark, border:`1px solid ${C.darkBorder}`, borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:11, color:C.creamMuted, lineHeight:1.3, marginBottom:2 }}>{r.l}</div>
                            {r.n && <div style={{ fontSize:10, color:C.green }}>{r.n}</div>}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0, marginLeft:12 }}>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:C.cream }}>{r.v}</span>
                            <span style={{ fontSize:11, color:C.creamDim, marginLeft:4 }}>{r.u}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── PAYWALL BLOCK ── */}
                {!unlocked && paywallStep === null && (
                  <div style={{ marginTop:16 }}>
                    {/* APERÇU FLOU */}
                    <div style={{ position:"relative", borderRadius:14, overflow:"hidden", marginBottom:12 }}>
                      <div style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:14, padding:"18px 16px", filter:"blur(5px)", userSelect:"none", pointerEvents:"none" }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.creamDim, marginBottom:12 }}>Récapitulatif complet PDF</div>
                        {[
                          "Volume béton total : █████ m³",
                          "Ciment nécessaire : ██ sacs",
                          "Coût matériaux estimé : ████ FCFA",
                          "Marge de perte appliquée : █%",
                          "Quantité totale : ████ u",
                        ].map((line,i) => (
                          <div key={i} style={{ background:C.dark, border:`1px solid ${C.darkBorder}`, borderRadius:8, padding:"10px 14px", marginBottom:8, fontSize:13, color:C.creamMuted }}>
                            {line}
                          </div>
                        ))}
                      </div>
                      {/* OVERLAY */}
                      <div style={{ position:"absolute", inset:0, background:"rgba(17,19,24,0.7)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 }}>
                        <div className="lock-icon" style={{ fontSize:32 }}>🔒</div>
                        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:14, fontWeight:800, color:C.cream, textAlign:"center" }}>Récapitulatif téléchargeable</div>
                        <div style={{ fontSize:12, color:C.creamMuted, textAlign:"center", maxWidth:220, lineHeight:1.5 }}>Obtenez votre document PDF complet avec toutes vos quantités, prêt à imprimer</div>
                      </div>
                    </div>

                    {/* COLLECTE WHATSAPP */}
                    <div style={{ background:"#0F1A10", border:`1px solid #1A3D1C`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                      <div style={{ fontSize:11, color:"#5AE87A", fontWeight:600, marginBottom:8 }}>📱 Numéro WhatsApp (facultatif)</div>
                      <input type="tel" placeholder="+228 9X XX XX XX"
                        value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        style={{ width:"100%", background:"#081208", border:`1.5px solid #1A3D1C`, borderRadius:8, padding:"11px 14px",
                                 color:C.cream, fontSize:15, fontFamily:"'DM Sans',sans-serif", outline:"none" }}
                        onFocus={e => (e.target.style.borderColor = C.green)}
                        onBlur={e  => (e.target.style.borderColor = "#1A3D1C")} />
                      <div style={{ fontSize:10, color:C.creamDim, marginTop:6, fontStyle:"italic" }}>Pour recevoir votre document plus vite via WhatsApp</div>
                    </div>

                    {/* CTA PAIEMENT */}
                    <button onClick={() => setPaywallStep("info")}
                      style={{ width:"100%", background:C.orange, color:"#fff", border:"none", borderRadius:14, padding:"18px",
                               fontSize:16, fontWeight:800, fontFamily:"'Syne',sans-serif", cursor:"pointer", letterSpacing:"0.01em",
                               boxShadow:`0 4px 24px ${C.orangeDim}` }}>
                      Télécharger mon récapitulatif — 1 000 FCFA
                    </button>
                    <div style={{ textAlign:"center", fontSize:11, color:C.creamDim, marginTop:8 }}>Paiement Flooz / Mixx by Yas · Déblocage par code</div>
                  </div>
                )}

                {/* ── PAYWALL STEP : INFO PAIEMENT ── */}
                {!unlocked && paywallStep === "info" && (
                  <div style={{ marginTop:16, background:"#1A1205", border:`1px solid ${C.amberDim}`, borderRadius:16, padding:"20px" }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:C.amber, marginBottom:16 }}>💳 Comment payer</div>

                    {/* STEPS */}
                    {[
                      { n:"1", txt:"Envoyez 1 000 FCFA via Flooz ou Mixx by Yas" },
                      { n:"2", txt:"Flooz (Moov) : +228 96 28 14 51 — Mixx by Yas : +228 72 72 25 10" },
                      { n:"3", txt:"Envoyez la capture de confirmation sur WhatsApp au même numéro utilisé" },
                      { n:"4", txt:"Votre code à 6 caractères vous est envoyé sous quelques minutes" },
                    ].map(s => (
                      <div key={s.n} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
                        <div style={{ width:28, height:28, borderRadius:"50%", background:C.orange, color:"#fff", fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{s.n}</div>
                        <div style={{ fontSize:13, color:C.cream, lineHeight:1.5, paddingTop:4 }}>{s.txt}</div>
                      </div>
                    ))}

                    <div style={{ display:"flex", gap:10, marginTop:16 }}>
                      <button onClick={() => setPaywallStep("code")}
                        style={{ flex:1, background:C.orange, color:"#fff", border:"none", borderRadius:12, padding:"15px",
                                 fontSize:14, fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>
                        J'ai payé, entrer mon code →
                      </button>
                      <button onClick={() => setPaywallStep(null)}
                        style={{ padding:"15px 16px", background:"none", border:`1.5px solid ${C.darkBorder}`, borderRadius:12,
                                 color:C.creamMuted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                        ← Retour
                      </button>
                    </div>
                  </div>
                )}

                {/* ── PAYWALL STEP : CODE ── */}
                {!unlocked && paywallStep === "code" && (
                  <div style={{ marginTop:16, background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:16, padding:"20px" }}>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:C.cream, marginBottom:6 }}>🔑 Entrez votre code</div>
                    <div style={{ fontSize:12, color:C.creamMuted, marginBottom:16 }}>Code à 6 caractères reçu par WhatsApp</div>

                    <input type="text" maxLength={6} placeholder="EX : BC2025"
                      value={codeInput} onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                      style={{ width:"100%", background:C.dark, border:`2px solid ${codeError ? C.red : C.darkBorder}`, borderRadius:10,
                               padding:"16px 14px", color:C.cream, fontSize:22, fontFamily:"'Syne',sans-serif",
                               fontWeight:800, letterSpacing:"0.2em", textAlign:"center", outline:"none" }}
                      onFocus={e => (e.target.style.borderColor = codeError ? C.red : C.orange)}
                      onBlur={e  => (e.target.style.borderColor = codeError ? C.red : C.darkBorder)} />

                    {codeError && (
                      <div style={{ fontSize:11, color:C.red, marginTop:8, textAlign:"center" }}>{codeError}</div>
                    )}

                    <div style={{ display:"flex", gap:10, marginTop:14 }}>
                      <button onClick={tryUnlock}
                        style={{ flex:1, background:C.orange, color:"#fff", border:"none", borderRadius:12, padding:"15px",
                                 fontSize:14, fontWeight:700, fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>
                        Débloquer le document ✓
                      </button>
                      <button onClick={() => { setPaywallStep("info"); setCodeError(""); }}
                        style={{ padding:"15px 16px", background:"none", border:`1.5px solid ${C.darkBorder}`, borderRadius:12,
                                 color:C.creamMuted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                        ← Retour
                      </button>
                    </div>
                  </div>
                )}

                {/* ── UNLOCKED ── */}
                {unlocked && paywallStep === "unlocked" && (
                  <div style={{ marginTop:16 }}>
                    {/* CELEBRATION */}
                    <div style={{ background:"#081E12", border:`1px solid ${C.green}`, borderRadius:14, padding:"18px", marginBottom:14, textAlign:"center" }}>
                      <div style={{ fontSize:36, marginBottom:8 }}>🎉</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:C.green, marginBottom:4 }}>Document débloqué !</div>
                      <div style={{ fontSize:12, color:"#4AE89A", lineHeight:1.5 }}>Votre récapitulatif complet est maintenant disponible. Merci pour votre confiance.</div>
                    </div>

                    {/* RÉSUMÉ COMPLET */}
                    <div style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:14, padding:"18px 16px", marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.creamDim, marginBottom:14 }}>📄 Récapitulatif complet</div>

                      {isFerr && results?.type === "ferraillage" ? (
                        results.sections.map(sec => (
                          <div key={sec.title} style={{ marginBottom:16 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:C.orange, marginBottom:8, letterSpacing:"0.05em" }}>{sec.title}</div>
                            {sec.items.map((it,i) => (
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.darkBorder}` }}>
                                <span style={{ fontSize:12, color:C.creamMuted }}>{it.l}</span>
                                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color: it.highlight ? C.orange : C.cream }}>{it.v} <span style={{ fontSize:11, fontWeight:400, color:C.creamDim }}>{it.u}</span></span>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        (Array.isArray(results) ? results : []).map((r,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.darkBorder}` }}>
                            <span style={{ fontSize:12, color:C.creamMuted }}>{r.l}</span>
                            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:C.cream }}>{r.v} <span style={{ fontSize:11, fontWeight:400, color:C.creamDim }}>{r.u}</span></span>
                          </div>
                        ))
                      )}

                      {/* META */}
                      <div style={{ marginTop:14, padding:"10px 12px", background:C.dark, borderRadius:8, fontSize:11, color:C.creamDim, lineHeight:1.7 }}>
                        <div><strong style={{ color:C.creamMuted }}>Module :</strong> {curMod?.label} — {curSub?.label}</div>
                        <div><strong style={{ color:C.creamMuted }}>Date :</strong> {new Date().toLocaleDateString("fr-FR")}</div>
                        <div><strong style={{ color:C.creamMuted }}>Édité par :</strong> BâtiCalc · Bou Aké × KS BTP</div>
                      </div>
                    </div>

                    {/* DOWNLOAD BUTTON */}
                    <button onClick={() => downloadPdf(curMod, curSub, results, isFerr)}
                      style={{ width:"100%", background:C.green, color:"#000", border:"none", borderRadius:14, padding:"18px",
                               fontSize:15, fontWeight:800, fontFamily:"'Syne',sans-serif", cursor:"pointer" }}>
                      ⬇ Télécharger le récapitulatif PDF
                    </button>
                    <div style={{ textAlign:"center", fontSize:11, color:C.creamDim, marginTop:8 }}>Document PDF · Mise en page professionnelle · Prêt à imprimer</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"32px 0", color:C.creamDim, fontSize:12 }}>
                Remplissez les champs puis appuyez sur Calculer.
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div style={{ textAlign:"center", padding:"24px 0 8px", fontSize:11, color:C.creamDim }}>
            BâtiCalc · Bou Aké × KS BTP
          </div>
        </div>
      </div>
    </>
  );
}

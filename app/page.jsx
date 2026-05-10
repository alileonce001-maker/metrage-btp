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
  { id:"gros",    icon:"⬛", label:"Gros œuvre", subcats:[
    { id:"terra",   label:"Terrassement", fields:[
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
    { id:"b-sem",  label:"Béton — Semelles", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.40},
        {id:"nb",label:"Nombre semelles",u:"u",def:1},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur*v.nb,v.perte)},
    { id:"b-pot",  label:"Béton — Poteaux", fields:[
        {id:"section",label:"Section (côté)",u:"m",def:0.25},
        {id:"hauteur",label:"Hauteur",u:"m"},
        {id:"nb",label:"Nombre poteaux",u:"u",def:4},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.section*v.section*v.hauteur*v.nb,v.perte)},
    { id:"b-lon",  label:"Béton — Longrines", fields:[
        {id:"longueur",label:"Longueur totale",u:"m"},
        {id:"larg_s",label:"Largeur section",u:"m",def:0.20},
        {id:"haut_s",label:"Hauteur section",u:"m",def:0.30},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.larg_s*v.haut_s,v.perte)},
    { id:"b-dal",  label:"Béton — Dalle", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.12},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur,v.perte)},
    { id:"b-pou",  label:"Béton — Poutres", fields:[
        {id:"longueur",label:"Longueur totale",u:"m"},
        {id:"larg_s",label:"Largeur section",u:"m",def:0.20},
        {id:"haut_s",label:"Hauteur section",u:"m",def:0.40},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.larg_s*v.haut_s,v.perte)},
    { id:"ferr",   label:"Ferraillage HA", isFerr:true, fields:[
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
    { id:"cofr",  label:"Coffrage", fields:[
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
  { id:"macon",   icon:"🧱", label:"Maçonnerie", subcats:[
    { id:"parp",  label:"Mur agglo / parpaing", fields:[
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
    { id:"endu",  label:"Enduit / crépi", fields:[
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
    { id:"chap",  label:"Chape", fields:[
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
  { id:"sols",    icon:"🔲", label:"Dalle & Sols", subcats:[
    { id:"carr",  label:"Carrelage", fields:[
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
    { id:"parq",  label:"Parquet / PVC", fields:[
        {id:"longueur",label:"Longueur pièce",u:"m"},{id:"largeur",label:"Largeur pièce",u:"m"},
        {id:"perte",label:"Marge perte coupe",u:"%",def:10}],
      calc:(v)=>{
        const s=v.longueur*v.largeur, sP=s*(1+v.perte/100);
        return[{l:"Surface nette",v:s.toFixed(1),u:"m²"},
               {l:"Surface à commander",v:sP.toFixed(1),u:"m²",n:`+${v.perte}% coupe`},
               {l:"Boîtes (typ. 2 m²)",v:Math.ceil(sP/2),u:"boîtes"},
               {l:"Colle sol (6 kg/m²)",v:Math.ceil(s*6),u:"kg"}];}},
  ]},
  { id:"toit",    icon:"🏠", label:"Toiture", subcats:[
    { id:"tole",  label:"Couverture tôle / bac", fields:[
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
  { id:"pein",    icon:"🎨", label:"Peinture", subcats:[
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
  { id:"plom",    icon:"🔧", label:"Plomberie", subcats:[
    { id:"reseau",label:"Réseau eau / évacuation", fields:[
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
  { id:"elec",    icon:"⚡", label:"Électricité", subcats:[
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
  { id:"menu",    icon:"🚪", label:"Menuiserie", subcats:[
    { id:"pf",    label:"Portes & Fenêtres", fields:[
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
  { id:"vrd",     icon:"🛣️", label:"VRD & Extérieur", subcats:[
    { id:"pave",  label:"Pavés / voirie", fields:[
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
    { id:"bvrd",  label:"Béton voirie", fields:[
        {id:"longueur",label:"Longueur",u:"m"},{id:"largeur",label:"Largeur",u:"m"},
        {id:"epaisseur",label:"Épaisseur",u:"m",def:0.15},
        {id:"perte",label:"Marge perte",u:"%",def:8}],
      calc:(v)=>beton(v.longueur*v.largeur*v.epaisseur,v.perte)},
  ]},
];

// ─── COULEURS FERRAILLAGE ─────────────────────────────────────────────────
const FCOL = {
  blue:  {bg:"#08192E",border:"#153A6E",acc:"#5BB8FF",ttl:"#90D0FF"},
  green: {bg:"#081E12",border:"#145229",acc:"#1FC87A",ttl:"#7AE8B8"},
  red:   {bg:"#1E0808",border:"#6E1515",acc:"#E84545",ttl:"#FF9090"},
  amber: {bg:"#1E1008",border:"#6E4015",acc:"#F5A623",ttl:"#FFD080"},
};

// ─── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────
export default function BatiCalc() {
  const [screen, setScreen]   = useState("home");   // "home" | "module" | "calc"
  const [curMod, setCurMod]   = useState(null);
  const [curSub, setCurSub]   = useState(null);
  const [vals, setVals]       = useState({});
  const [results, setResults] = useState(null);
  const resultsRef            = useRef(null);

  const goHome   = ()         => { setScreen("home"); setCurMod(null); setCurSub(null); setVals({}); setResults(null); };
  const goModule = (mod)      => { setCurMod(mod); setScreen("module"); setCurSub(null); setVals({}); setResults(null); };
  const goCalc   = (sub)      => { setCurSub(sub); setVals({}); setResults(null); setScreen("calc"); };
  const setVal   = (id, v)    => setVals(p => ({ ...p, [id]: v }));

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
      setResults(curSub.calc(parsed));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setResults([{ l: "Erreur de calcul", v: "—", u: "" }]);
    }
  };

  const isFerr = curSub?.isFerr;

  // ── CSS inline global ──
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body, #root { height: 100%; background: ${C.dark}; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: ${C.darkBorder}; border-radius: 2px; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
    input[type=number] { -moz-appearance: textfield; }
  `;

  // ─── SCREEN : HOME ───────────────────────────────────────────────────
  if (screen === "home") return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* HEADER */}
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"16px 20px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, background:C.orange, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:13, color:"#fff", letterSpacing:"-0.5px" }}>BC</span>
            </div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, color:C.cream, letterSpacing:"-0.3px" }}>BâtiCalc</div>
              <div style={{ fontSize:10, color:C.creamMuted, letterSpacing:"0.06em", marginTop:1 }}>
                Propulsé par <span style={{ color:C.orange }}>Bou Aké × KS BTP</span>
              </div>
            </div>
          </div>
        </div>

        {/* HERO */}
        <div style={{ padding:"24px 20px 16px", background:`linear-gradient(160deg,${C.darkMid} 0%,${C.dark} 100%)` }}>
          <div style={{ fontSize:13, color:C.creamMuted, marginBottom:6 }}>9 modules · 20+ calculateurs</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:C.cream, lineHeight:1.3 }}>
            Choisissez un module<br/>
            <span style={{ color:C.orange }}>pour commencer</span>
          </div>
        </div>

        {/* MODULES GRID */}
        <div style={{ padding:"0 16px 32px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {MODULES.map(mod => (
            <button key={mod.id} onClick={() => goModule(mod)}
              style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:14,
                       padding:"18px 14px", textAlign:"left", cursor:"pointer", transition:"all 0.15s",
                       display:"flex", flexDirection:"column", gap:8 }}>
              <span style={{ fontSize:26 }}>{mod.icon}</span>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:C.cream, lineHeight:1.2 }}>{mod.label}</div>
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

  // ─── SCREEN : MODULE (liste des sous-calculateurs) ────────────────────
  if (screen === "module") return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* TOP BAR */}
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"14px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={goHome}
            style={{ background:"none", border:"none", color:C.orange, fontSize:22, cursor:"pointer", lineHeight:1, padding:0, display:"flex", alignItems:"center" }}>
            ←
          </button>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:C.cream }}>{curMod.icon} {curMod.label}</div>
            <div style={{ fontSize:11, color:C.creamMuted }}>Propulsé par Bou Aké × KS BTP</div>
          </div>
        </div>

        {/* LISTE */}
        <div style={{ padding:"16px" }}>
          <div style={{ fontSize:11, color:C.creamDim, marginBottom:14, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>
            Sélectionnez un calcul
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {curMod.subcats.map(sub => (
              <button key={sub.id} onClick={() => goCalc(sub)}
                style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:12,
                         padding:"16px 18px", textAlign:"left", cursor:"pointer",
                         display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:700, color:C.cream }}>{sub.label}</div>
                  <div style={{ fontSize:11, color:C.creamDim, marginTop:3 }}>{sub.fields.length} paramètres</div>
                </div>
                <span style={{ color:C.orange, fontSize:20 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  // ─── SCREEN : CALC ────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'DM Sans',sans-serif", background:C.dark, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* TOP BAR */}
        <div style={{ background:C.darkMid, borderBottom:`1px solid ${C.darkBorder}`, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, position:"sticky", top:0, zIndex:20 }}>
          <button onClick={() => { setScreen("module"); setResults(null); setVals({}); }}
            style={{ background:"none", border:"none", color:C.orange, fontSize:22, cursor:"pointer", lineHeight:1, padding:0 }}>
            ←
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:15, fontWeight:800, color:C.cream,
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{curSub.label}</div>
            <div style={{ fontSize:10, color:C.creamMuted }}>{curMod.label}</div>
          </div>
          <div style={{ fontSize:10, fontWeight:600, background:C.orangeDim, color:C.orange,
                        padding:"3px 10px", borderRadius:20, whiteSpace:"nowrap" }}>
            {curMod.icon}
          </div>
        </div>

        {/* CONTENU */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>

          {/* NOTICE FERRAILLAGE */}
          {isFerr && (
            <div style={{ background:"#1A1205", border:`1px solid ${C.amberDim}`, borderRadius:10,
                          padding:"12px 14px", marginBottom:14, fontSize:11, color:C.amber, lineHeight:1.6 }}>
              ⚠️ Recouvrements : {RECOUV.recouvrement}×ø (Eurocode 2 / BAEL) · Ancrages : {RECOUV.ancrage}×ø · Chutes auto : {RECOUV.chute_pct}%
            </div>
          )}

          {/* CHAMPS */}
          <div style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`, borderRadius:14,
                        padding:"18px 16px", marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                          color:C.creamDim, marginBottom:14 }}>Dimensions & paramètres</div>

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
                                     color: isActive ? "#fff" : C.creamMuted,
                                     transition:"all 0.1s" }}>
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      inputMode="decimal"
                      type="number" min="0" step="any"
                      placeholder={String(f.def ?? 0)}
                      value={vals[f.id] ?? ""}
                      onChange={e => setVal(f.id, e.target.value)}
                      style={{ width:"100%", background:C.dark, border:`1.5px solid ${C.darkBorder}`,
                               borderRadius:10, padding:"13px 14px", color:C.cream, fontSize:16,
                               fontFamily:"'DM Sans',sans-serif", outline:"none" }}
                      onFocus={e => (e.target.style.borderColor = C.orange)}
                      onBlur={e  => (e.target.style.borderColor = C.darkBorder)}
                    />
                  )}
                  {f.hint && <div style={{ fontSize:10, color:C.creamDim, marginTop:5, fontStyle:"italic" }}>{f.hint}</div>}
                </div>
              ))}
            </div>

            {/* BOUTONS */}
            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={calculate}
                style={{ flex:1, background:C.orange, color:"#fff", border:"none", borderRadius:12,
                         padding:"16px", fontSize:15, fontWeight:700, fontFamily:"'Syne',sans-serif",
                         cursor:"pointer", letterSpacing:"0.01em" }}>
                Calculer →
              </button>
              <button onClick={() => { setVals({}); setResults(null); }}
                style={{ padding:"16px 18px", background:"none", border:`1.5px solid ${C.darkBorder}`,
                         borderRadius:12, color:C.creamMuted, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                ↺
              </button>
            </div>
          </div>

          {/* RÉSULTATS */}
          <div ref={resultsRef}>
            {results ? (
              isFerr && results.type === "ferraillage" ? (
                // ── FERRAILLAGE ──────────────────────────────────────
                <div>
                  {results.sections.map(sec => {
                    const fc = FCOL[sec.color];
                    return (
                      <div key={sec.title} style={{ background:fc.bg, border:`1px solid ${fc.border}`,
                                                     borderRadius:14, padding:"16px", marginBottom:12 }}>
                        <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase",
                                      color:fc.ttl, marginBottom:12 }}>{sec.title}</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          {sec.items.map((it, i) => (
                            <div key={i} style={{ background: it.highlight ? fc.border : "rgba(0,0,0,0.3)",
                                                  border:`1px solid ${fc.border}`, borderRadius:10,
                                                  padding:"12px 14px",
                                                  ...(it.highlight ? { marginTop:4 } : {}) }}>
                              <div style={{ fontSize:11, color:fc.acc, marginBottom:4 }}>{it.l}</div>
                              <div style={{ fontFamily:"'Syne',sans-serif", fontSize: it.highlight?22:18,
                                            fontWeight:800, color:"#fff" }}>
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
                // ── STANDARD ────────────────────────────────────────
                <div style={{ background:C.darkCard, border:`1px solid ${C.darkBorder}`,
                              borderRadius:14, padding:"18px 16px" }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase",
                                color:C.creamDim, marginBottom:14 }}>Résultats du calcul</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {(Array.isArray(results) ? results : []).map((r, i) => (
                      <div key={i} style={{ background:C.dark, border:`1px solid ${C.darkBorder}`,
                                            borderRadius:10, padding:"12px 14px",
                                            display:"flex", alignItems:"center", justifyContent:"space-between" }}>
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
              )
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

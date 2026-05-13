"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const C = {
  anthracite:      "#16191E",
  anthraciteMid:   "#1E2228",
  anthraciteLight: "#2C3039",
  anthraciteBorder:"#363B45",
  orange:          "#E8650A",
  orangeLight:     "#FF8C3A",
  orangeDim:       "#7A3505",
  orangeGlow:      "rgba(232,101,10,0.12)",
  text:            "#F0EDE8",
  textMuted:       "#9A9590",
  textDim:         "#5A5550",
  green:           "#2ECC8A",
  greenDim:        "#0A2A1A",
  red:             "#E84A4A",
  redDim:          "#2A0D0D",
  amber:           "#F5A623",
  amberDim:        "#2A1A05",
  blue:            "#5BB8FF",
  blueDim:         "#0D2A45",
};

// ─── DOSAGES ────────────────────────────────────────────────────────────────
const DOSAGES = {
  beton: {
    250: { ciment: 250, sable: 0.55, gravier: 0.85, eau: 160 },
    300: { ciment: 300, sable: 0.52, gravier: 0.82, eau: 170 },
    350: { ciment: 350, sable: 0.50, gravier: 0.80, eau: 175 },
  },
};

const MORTIERS = { maigre: 250, standard: 300, riche: 400 };
const ENDUITS  = { fin: 250, standard: 350, hydrofuge: 450 };

// ─── HELPER BÉTON ────────────────────────────────────────────────────────────
function beton(volBrut, perte, dosage = 350) {
  const d = DOSAGES.beton[dosage] || DOSAGES.beton[350];
  const v = volBrut * (1 + perte / 100);
  return [
    { l: "Dosage béton",         v: dosage,                       u: "kg/m³" },
    { l: "Volume brut",          v: volBrut.toFixed(3),           u: "m³" },
    { l: "Volume + perte",       v: v.toFixed(3),                 u: "m³",  n: `+${perte}% perte` },
    { l: "Ciment",               v: Math.ceil((v * d.ciment) / 50), u: "sacs 50 kg" },
    { l: "Sable",                v: (v * d.sable).toFixed(2),     u: "m³" },
    { l: "Gravier",              v: (v * d.gravier).toFixed(2),   u: "m³" },
    { l: "Eau estimée",          v: Math.round(v * d.eau),        u: "litres" },
  ];
}

// ─── FERRAILLAGE ─────────────────────────────────────────────────────────────
const HA_DIAMS = [6, 8, 10, 12, 14, 16, 20, 25, 32];
const RECOUVREMENT_COEFF = { ancrage: 40, recouvrement: 50, chute_pct: 3 };
function poidsUnitaire(d) { return (d * d) / 162; }

// ─── SECTION COLORS ─────────────────────────────────────────────────────────
const SECTION_COLORS = {
  blue:  { bg: "#0D2A45", border: "#1A4A7A", accent: "#5BB8FF", title: "#90D0FF" },
  green: { bg: "#0A2A1A", border: "#1A5A30", accent: "#2ECC8A", title: "#7AEFC0" },
  red:   { bg: "#2A0D0D", border: "#6B1A1A", accent: "#E84A4A", title: "#FF9090" },
  amber: { bg: "#2A1A05", border: "#6B4510", accent: "#F5A623", title: "#FFD080" },
};

// ─── MODULES ─────────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "gros-oeuvre", label: "Gros œuvre", icon: "⬛",
    subcats: [
      {
        id: "terrassement", label: "Terrassement",
        fields: [
          { id: "longueur",    label: "Longueur",             unit: "m" },
          { id: "largeur",     label: "Largeur",              unit: "m" },
          { id: "profondeur",  label: "Profondeur",           unit: "m" },
          { id: "remblai_pct", label: "% remblai réutilisé", unit: "%", def: 30 },
          { id: "cap_camion",  label: "Capacité camion",      unit: "m³", def: 10 },
        ],
        calc: (v) => {
          const vol = v.longueur * v.largeur * v.profondeur;
          const foisonne = vol * 1.25;
          const remblai = vol * (v.remblai_pct / 100);
          const deblai = vol - remblai;
          return [
            { l: "Volume fouille",          v: vol.toFixed(2),                          u: "m³" },
            { l: "Volume foisonné (évac.)", v: foisonne.toFixed(2),                     u: "m³", n: "×1,25 coeff." },
            { l: "Déblai à évacuer",        v: deblai.toFixed(2),                       u: "m³" },
            { l: "Remblai réutilisable",    v: remblai.toFixed(2),                      u: "m³" },
            { l: "Rotations camion",        v: Math.ceil(foisonne / v.cap_camion),      u: "voyages" },
            { l: "Surface compactage",      v: (v.longueur * v.largeur).toFixed(1),     u: "m²" },
          ];
        },
      },
      {
        id: "beton-semelle", label: "Béton — Semelles",
        fields: [
          { id: "longueur",  label: "Longueur semelle", unit: "m" },
          { id: "largeur",   label: "Largeur semelle",  unit: "m" },
          { id: "epaisseur", label: "Épaisseur",        unit: "m", def: 0.40 },
          { id: "nb",        label: "Nombre semelles",  unit: "u", def: 1 },
          { id: "perte",     label: "Marge perte",      unit: "%", def: 8 },
          { id: "dosage",    label: "Dosage béton",     unit: "kg/m³", def: 350, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur * v.nb, v.perte, v.dosage),
      },
      {
        id: "beton-poteau", label: "Béton — Poteaux",
        fields: [
          { id: "section",  label: "Section (côté carré)", unit: "m", def: 0.25 },
          { id: "hauteur",  label: "Hauteur poteau",       unit: "m" },
          { id: "nb",       label: "Nombre poteaux",       unit: "u", def: 4 },
          { id: "perte",    label: "Marge perte",          unit: "%", def: 8 },
          { id: "dosage",   label: "Dosage béton",         unit: "kg/m³", def: 350, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.section * v.section * v.hauteur * v.nb, v.perte, v.dosage),
      },
      {
        id: "beton-longrine", label: "Béton — Longrines",
        fields: [
          { id: "longueur", label: "Longueur totale", unit: "m" },
          { id: "larg_s",   label: "Largeur section", unit: "m", def: 0.20 },
          { id: "haut_s",   label: "Hauteur section", unit: "m", def: 0.30 },
          { id: "perte",    label: "Marge perte",     unit: "%", def: 8 },
          { id: "dosage",   label: "Dosage béton",    unit: "kg/m³", def: 350, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.longueur * v.larg_s * v.haut_s, v.perte, v.dosage),
      },
      {
        id: "beton-dalle", label: "Béton — Dalle",
        fields: [
          { id: "longueur",  label: "Longueur",    unit: "m" },
          { id: "largeur",   label: "Largeur",     unit: "m" },
          { id: "epaisseur", label: "Épaisseur",   unit: "m", def: 0.12 },
          { id: "perte",     label: "Marge perte", unit: "%", def: 8 },
          { id: "dosage",    label: "Dosage béton", unit: "kg/m³", def: 350, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur, v.perte, v.dosage),
      },
      {
        id: "beton-poutre", label: "Béton — Poutres",
        fields: [
          { id: "longueur", label: "Longueur totale", unit: "m" },
          { id: "larg_s",   label: "Largeur section", unit: "m", def: 0.20 },
          { id: "haut_s",   label: "Hauteur section", unit: "m", def: 0.40 },
          { id: "perte",    label: "Marge perte",     unit: "%", def: 8 },
          { id: "dosage",   label: "Dosage béton",    unit: "kg/m³", def: 350, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.longueur * v.larg_s * v.haut_s, v.perte, v.dosage),
      },
      {
        id: "ferraillage", label: "Ferraillage HA",
        isFerraillage: true,
        fields: [
          { id: "poids_theorique", label: "Poids théorique projet", unit: "kg",      def: 0,      hint: "Issu des plans de ferraillage" },
          { id: "diametre",        label: "Diamètre HA",            unit: "mm",      def: 12,     opts: HA_DIAMS },
          { id: "long_barre",      label: "Longueur réelle barre",  unit: "m",       def: 12,     hint: "Longueur commerciale (ex: 12 m)" },
          { id: "nb_recouv",       label: "Nb recouvrements",       unit: "u",       def: 0,      hint: "Jonctions entre barres" },
          { id: "nb_ancrages",     label: "Nb ancrages",            unit: "u",       def: 0,      hint: "Extrémités ancrées dans béton" },
          { id: "long_cadre",      label: "Long. développée cadre", unit: "m",       def: 1.2 },
          { id: "nb_cadres",       label: "Nombre cadres/étriers",  unit: "u",       def: 0 },
          { id: "diam_cadre",      label: "Diamètre cadres",        unit: "mm",      def: 6,      opts: [6, 8, 10] },
          { id: "perte_chantier",  label: "Perte chantier",         unit: "%",       def: 5,      opts: [3, 5] },
          { id: "prix_tonne",      label: "Prix acier (par tonne)", unit: "FCFA/t",  def: 450000, hint: "Prix marché Lomé actuel" },
        ],
        calc: (v) => {
          const d = v.diametre;
          const pu = poidsUnitaire(d);
          const long_recouv  = (RECOUVREMENT_COEFF.recouvrement * d / 1000) * v.nb_recouv;
          const long_ancrage = (RECOUVREMENT_COEFF.ancrage * d / 1000) * v.nb_ancrages;
          const long_theorique = v.poids_theorique > 0 ? v.poids_theorique / pu : 0;
          const long_avant_chutes = long_theorique + long_recouv + long_ancrage;
          const long_chutes = long_avant_chutes * (RECOUVREMENT_COEFF.chute_pct / 100);
          const long_nette = long_avant_chutes + long_chutes;
          const long_avec_perte = long_nette * (1 + v.perte_chantier / 100);
          const nb_barres = Math.ceil(long_avec_perte / v.long_barre);
          const long_achetee = nb_barres * v.long_barre;
          const poids_achete = long_achetee * pu;
          const poids_perte = poids_achete - v.poids_theorique;
          const pct_perte_reelle = v.poids_theorique > 0 ? ((poids_perte / v.poids_theorique) * 100).toFixed(1) : "—";
          const poids_cadres = v.nb_cadres > 0 ? poidsUnitaire(v.diam_cadre) * v.long_cadre * v.nb_cadres : 0;
          const poids_total = poids_achete + poids_cadres;
          const cout_total = (poids_total / 1000) * v.prix_tonne;
          const cout_perte = (poids_perte / 1000) * v.prix_tonne;
          return {
            type: "ferraillage",
            sections: [
              { title: "Longueurs calculées", color: "blue", items: [
                { l: "Long. théorique (plans)",      v: long_theorique.toFixed(1),   u: "ml" },
                { l: `Recouvrements (${RECOUVREMENT_COEFF.recouvrement}×ø)`, v: long_recouv.toFixed(2), u: "ml" },
                { l: `Ancrages (${RECOUVREMENT_COEFF.ancrage}×ø)`,           v: long_ancrage.toFixed(2), u: "ml" },
                { l: "Chutes estimées (3%)",         v: long_chutes.toFixed(2),      u: "ml" },
                { l: "Long. nette nécessaire",       v: long_nette.toFixed(1),       u: "ml" },
                { l: `+ Perte chantier (${v.perte_chantier}%)`, v: long_avec_perte.toFixed(1), u: "ml" },
              ]},
              { title: "Barres à acheter", color: "green", items: [
                { l: `Barres HA${d} de ${v.long_barre} m`, v: nb_barres,              u: "barres" },
                { l: "Longueur achetée totale",            v: long_achetee.toFixed(1), u: "ml" },
                { l: `Poids unitaire HA${d}`,             v: pu.toFixed(4),           u: "kg/ml" },
                { l: "Poids acier principal",             v: poids_achete.toFixed(1), u: "kg" },
                { l: `Poids cadres HA${v.diam_cadre}`,   v: poids_cadres.toFixed(1), u: "kg" },
                { l: "Poids total acier",                v: poids_total.toFixed(1),  u: "kg" },
              ]},
              { title: "Pertes & surcoût", color: "red", items: [
                { l: "Poids théorique projet",    v: v.poids_theorique.toFixed(1), u: "kg" },
                { l: "Poids réel acheté",         v: poids_achete.toFixed(1),      u: "kg" },
                { l: "Poids perdu",               v: poids_perte.toFixed(1),       u: "kg" },
                { l: "% perte réelle",            v: pct_perte_reelle,             u: "%" },
                { l: "Coût perte",                v: Math.round(cout_perte).toLocaleString("fr-FR"), u: "FCFA" },
              ]},
              { title: "Coût d'achat réel", color: "amber", items: [
                { l: "Prix / tonne",              v: v.prix_tonne.toLocaleString("fr-FR"),               u: "FCFA/t" },
                { l: "Coût acier principal",      v: Math.round((poids_achete / 1000) * v.prix_tonne).toLocaleString("fr-FR"), u: "FCFA" },
                { l: "Coût cadres/étriers",       v: Math.round((poids_cadres  / 1000) * v.prix_tonne).toLocaleString("fr-FR"), u: "FCFA" },
                { l: "COÛT TOTAL RÉEL",           v: Math.round(cout_total).toLocaleString("fr-FR"),     u: "FCFA", highlight: true },
              ]},
            ],
          };
        },
      },
      {
        id: "coffrage", label: "Coffrage",
        fields: [
          { id: "perimetre", label: "Périmètre développé", unit: "m" },
          { id: "hauteur",   label: "Hauteur coffrée",     unit: "m" },
          { id: "nb_el",     label: "Nombre d'éléments",   unit: "u", def: 1 },
          { id: "perte",     label: "Marge perte",         unit: "%", def: 15 },
        ],
        calc: (v) => {
          const s  = v.perimetre * v.hauteur * v.nb_el;
          const sP = s * (1 + v.perte / 100);
          return [
            { l: "Surface nette coffrage",           v: s.toFixed(1),          u: "m²" },
            { l: "Surface + perte",                  v: sP.toFixed(1),         u: "m²", n: `+${v.perte}%` },
            { l: "Panneaux contreplaqué 1,2×1,2 m", v: Math.ceil(sP / 1.44),  u: "u" },
            { l: "Étais de soutien estimés",         v: Math.ceil(sP / 2),     u: "u" },
          ];
        },
      },
    ],
  },
  {
    id: "maconnerie", label: "Maçonnerie", icon: "🧱",
    subcats: [
      {
        id: "parpaing", label: "Mur agglo / parpaing",
        fields: [
          { id: "longueur",  label: "Longueur mur",        unit: "m" },
          { id: "hauteur",   label: "Hauteur mur",         unit: "m" },
          { id: "epaisseur", label: "Épaisseur agglo",     unit: "cm", def: 15, opts: [10, 12, 15, 20] },
          { id: "nb_ouv",    label: "Nb ouvertures",       unit: "u",  def: 0 },
          { id: "surf_ouv",  label: "Surface / ouverture", unit: "m²", def: 2 },
          { id: "perte",     label: "Marge perte",         unit: "%",  def: 5 },
          { id: "dosage_m",  label: "Mortier",             unit: "", def: "standard", opts: ["maigre", "standard", "riche"] },
        ],
        calc: (v) => {
          const surf = v.longueur * v.hauteur - v.nb_ouv * v.surf_ouv;
          const nb   = Math.ceil((surf / (0.40 * 0.20)) * (1 + v.perte / 100));
          const mvol = surf * 0.015;
          const ciment_kg = MORTIERS[v.dosage_m] || 300;
          return [
            { l: "Surface nette mur",    v: surf.toFixed(1),               u: "m²" },
            { l: `Agglos ${v.epaisseur} cm`, v: nb,                        u: "unités" },
            { l: `Mortier ${v.dosage_m}`, v: mvol.toFixed(3),              u: "m³" },
            { l: "Ciment mortier",       v: Math.ceil((mvol * ciment_kg) / 50), u: "sacs 50 kg" },
            { l: "Sable",                v: (mvol * 1.5).toFixed(2),       u: "m³" },
            { l: "Eau estimée",          v: Math.round(mvol * 180),        u: "litres" },
          ];
        },
      },
      {
        id: "enduit", label: "Enduit / crépi",
        fields: [
          { id: "surface",    label: "Surface à enduire", unit: "m²" },
          { id: "epaisseur",  label: "Épaisseur enduit",  unit: "mm", def: 15 },
          { id: "nb_couches", label: "Nb de couches",     unit: "u",  def: 2 },
          { id: "perte",      label: "Marge perte",       unit: "%",  def: 10 },
          { id: "type_enduit",label: "Type enduit",       unit: "", def: "standard", opts: ["fin", "standard", "hydrofuge"] },
        ],
        calc: (v) => {
          const vol = v.surface * (v.epaisseur / 1000) * v.nb_couches * (1 + v.perte / 100);
          const ckg = ENDUITS[v.type_enduit] || 350;
          return [
            { l: `Enduit ${v.type_enduit}`,  v: vol.toFixed(3),              u: "m³" },
            { l: "Ciment",                   v: Math.ceil((vol * ckg) / 50), u: "sacs 50 kg" },
            { l: "Sable fin",                v: (vol * 1.5).toFixed(2),      u: "m³" },
            { l: "Eau estimée",              v: Math.round(vol * 170),       u: "litres" },
          ];
        },
      },
      {
        id: "chape", label: "Chape",
        fields: [
          { id: "surface",   label: "Surface",     unit: "m²" },
          { id: "epaisseur", label: "Épaisseur",   unit: "cm", def: 5 },
          { id: "perte",     label: "Marge perte", unit: "%",  def: 8 },
          { id: "dosage_c",  label: "Dosage",      unit: "", def: "standard", opts: ["maigre", "standard", "riche"] },
        ],
        calc: (v) => {
          const vol = v.surface * (v.epaisseur / 100) * (1 + v.perte / 100);
          const ckg = MORTIERS[v.dosage_c] || 300;
          return [
            { l: "Volume chape + perte", v: vol.toFixed(3),               u: "m³" },
            { l: "Ciment",              v: Math.ceil((vol * ckg) / 50),   u: "sacs 50 kg" },
            { l: "Sable",               v: (vol * 1.4).toFixed(2),        u: "m³" },
            { l: "Eau estimée",         v: Math.round(vol * 160),         u: "litres" },
          ];
        },
      },
    ],
  },
  {
    id: "sols", label: "Dalle & Sols", icon: "🔲",
    subcats: [
      {
        id: "carrelage", label: "Carrelage",
        fields: [
          { id: "longueur", label: "Longueur",    unit: "m" },
          { id: "largeur",  label: "Largeur",     unit: "m" },
          { id: "format",   label: "Format (cm)", unit: "cm", def: "60x60", opts: ["30x30","40x40","45x45","60x60","60x120","80x80","120x120"] },
          { id: "perte",    label: "Marge perte", unit: "%",  def: 10 },
        ],
        calc: (v) => {
          const surf = v.longueur * v.largeur;
          const fmt  = String(v.format || "60x60").split("x").map(Number);
          const sc   = (fmt[0] / 100) * (fmt[1] / 100);
          const nb   = Math.ceil((surf * (1 + v.perte / 100)) / sc);
          return [
            { l: "Surface brute",      v: surf.toFixed(1),                              u: "m²" },
            { l: "Surface + perte",    v: (surf * (1 + v.perte / 100)).toFixed(1),      u: "m²", n: `+${v.perte}%` },
            { l: `Carreaux ${v.format}`, v: nb,                                         u: "unités" },
            { l: "Colle carrelage",    v: Math.ceil((surf * 5) / 25),                   u: "sacs 25 kg" },
            { l: "Joint",              v: (surf * 0.3).toFixed(1),                      u: "kg" },
          ];
        },
      },
      {
        id: "parquet-pvc", label: "Parquet / PVC",
        fields: [
          { id: "longueur", label: "Longueur pièce",    unit: "m" },
          { id: "largeur",  label: "Largeur pièce",     unit: "m" },
          { id: "perte",    label: "Marge perte coupe", unit: "%", def: 10 },
        ],
        calc: (v) => {
          const s  = v.longueur * v.largeur;
          const sP = s * (1 + v.perte / 100);
          return [
            { l: "Surface nette",       v: s.toFixed(1),       u: "m²" },
            { l: "Surface à commander", v: sP.toFixed(1),      u: "m²", n: `+${v.perte}% coupe` },
            { l: "Boîtes (typ. 2 m²)",  v: Math.ceil(sP / 2), u: "boîtes" },
            { l: "Colle sol (6 kg/m²)", v: Math.ceil(s * 6),   u: "kg" },
          ];
        },
      },
    ],
  },
  {
    id: "toiture", label: "Toiture", icon: "🏠",
    subcats: [
      {
        id: "tole", label: "Couverture tôle / bac",
        fields: [
          { id: "longueur",    label: "Longueur faîtage",     unit: "m" },
          { id: "largeur",     label: "Largeur demi-versant", unit: "m" },
          { id: "pente",       label: "Pente",                unit: "%", def: 30 },
          { id: "nb_versants", label: "Nb de versants",       unit: "u", def: 2 },
          { id: "perte",       label: "Marge perte",          unit: "%", def: 8 },
        ],
        calc: (v) => {
          const coeff = Math.sqrt(1 + (v.pente / 100) ** 2);
          const sv    = v.longueur * v.largeur * coeff;
          const sT    = sv * v.nb_versants * (1 + v.perte / 100);
          const toles = Math.ceil(sT / 0.75);
          return [
            { l: "Surface par versant",    v: sv.toFixed(1),                                      u: "m²" },
            { l: "Surface totale + perte", v: sT.toFixed(1),                                      u: "m²" },
            { l: "Tôles bac (75 cm utile)", v: toles,                                             u: "tôles" },
            { l: "Vis de fixation",        v: toles * 8,                                          u: "u" },
            { l: "Faîtage",               v: Math.ceil(v.longueur / 2),                           u: "u" },
            { l: "Gouttières",            v: (v.longueur * v.nb_versants).toFixed(1),             u: "ml" },
          ];
        },
      },
      {
        id: "charpente", label: "Charpente bois",
        fields: [
          { id: "longueur",   label: "Longueur bâtiment", unit: "m" },
          { id: "largeur",    label: "Largeur",           unit: "m" },
          { id: "espacement", label: "Espacement pannes", unit: "m", def: 1.5 },
          { id: "perte",      label: "Marge perte",       unit: "%", def: 10 },
        ],
        calc: (v) => {
          const nbP = Math.ceil(v.largeur / v.espacement) + 1;
          return [
            { l: "Nombre pannes",          v: nbP * 2,                                                 u: "pannes" },
            { l: "Longueur totale pannes", v: (nbP * v.longueur * (1 + v.perte / 100)).toFixed(1),     u: "ml" },
            { l: "Chevrons estimés",       v: Math.ceil(v.longueur / 0.6) * 2,                         u: "u" },
            { l: "Liteaux (indicatif)",    v: (v.longueur * nbP * 0.4 * (1 + v.perte / 100)).toFixed(1), u: "ml" },
          ];
        },
      },
    ],
  },
  {
    id: "peinture", label: "Peinture & Finitions", icon: "🎨",
    subcats: [
      {
        id: "peinture-mur", label: "Peinture murale",
        fields: [
          { id: "surface",    label: "Surface totale",     unit: "m²" },
          { id: "nb_couches", label: "Nb de couches",      unit: "u",    def: 2 },
          { id: "rendement",  label: "Rendement peinture", unit: "m²/L", def: 10 },
          { id: "perte",      label: "Marge perte",        unit: "%",    def: 10 },
        ],
        calc: (v) => {
          const tot = v.surface * v.nb_couches * (1 + v.perte / 100);
          const L   = tot / v.rendement;
          return [
            { l: "Surface effective totale", v: tot.toFixed(1),   u: "m²" },
            { l: "Peinture nécessaire",      v: L.toFixed(1),      u: "litres" },
            { l: "Pots de 20 L",             v: Math.ceil(L / 20), u: "pots" },
            { l: "Pots de 5 L",              v: Math.ceil(L / 5),  u: "pots" },
          ];
        },
      },
      {
        id: "faux-plafond", label: "Faux plafond",
        fields: [
          { id: "longueur", label: "Longueur pièce", unit: "m" },
          { id: "largeur",  label: "Largeur pièce",  unit: "m" },
          { id: "perte",    label: "Marge perte",    unit: "%", def: 10 },
        ],
        calc: (v) => {
          const s   = v.longueur * v.largeur * (1 + v.perte / 100);
          const per = 2 * (v.longueur + v.largeur);
          return [
            { l: "Surface faux plafond", v: s.toFixed(1),          u: "m²" },
            { l: "Dalles 60×60",         v: Math.ceil(s / 0.36),   u: "u" },
            { l: "Profilés porteurs",    v: Math.ceil(s / 1.2),     u: "u" },
            { l: "Cornières périmètre",  v: Math.ceil(per * 1.1),   u: "ml" },
            { l: "Suspentes",            v: Math.ceil(s),           u: "u" },
          ];
        },
      },
    ],
  },
  {
    id: "plomberie", label: "Plomberie", icon: "🔧",
    subcats: [
      {
        id: "reseau", label: "Réseau eau / évacuation",
        fields: [
          { id: "long_alim", label: "Alimentation (eau)", unit: "m" },
          { id: "long_evac", label: "Évacuation EU/EV",   unit: "m" },
          { id: "nb_points", label: "Points d'eau",       unit: "u" },
          { id: "perte",     label: "Marge perte",        unit: "%", def: 15 },
        ],
        calc: (v) => [
          { l: "Tuyaux alimentation", v: (v.long_alim * (1 + v.perte / 100)).toFixed(1), u: "ml" },
          { l: "Tuyaux évacuation",   v: (v.long_evac * (1 + v.perte / 100)).toFixed(1), u: "ml" },
          { l: "Raccords estimés",    v: v.nb_points * 4,                                 u: "u" },
          { l: "Robinetteries",       v: v.nb_points,                                     u: "u" },
        ],
      },
    ],
  },
  {
    id: "electricite", label: "Électricité", icon: "⚡",
    subcats: [
      {
        id: "cablage", label: "Câblage & gaines",
        fields: [
          { id: "surface",     label: "Surface habitable",      unit: "m²" },
          { id: "nb_prises",   label: "Nombre de prises",       unit: "u" },
          { id: "nb_inter",    label: "Nb interrupteurs",       unit: "u" },
          { id: "nb_circuits", label: "Nombre de circuits",     unit: "u", def: 4 },
          { id: "perte",       label: "Marge perte",            unit: "%", def: 15 },
        ],
        calc: (v) => {
          const cable = (v.surface * 3 + v.nb_prises * 3 + v.nb_inter * 2) * (1 + v.perte / 100);
          return [
            { l: "Câble électrique total", v: cable.toFixed(0),          u: "ml" },
            { l: "Gaines ICTA",            v: (cable * 0.8).toFixed(0),  u: "ml" },
            { l: "Prises",                 v: v.nb_prises,               u: "u" },
            { l: "Interrupteurs",          v: v.nb_inter,                u: "u" },
            { l: "Disjoncteurs tableau",   v: v.nb_circuits + 1,         u: "u" },
          ];
        },
      },
    ],
  },
  {
    id: "menuiserie", label: "Menuiserie", icon: "🚪",
    subcats: [
      {
        id: "portes-fen", label: "Portes & Fenêtres",
        fields: [
          { id: "nb_portes",  label: "Nb de portes",    unit: "u",  def: 3 },
          { id: "larg_porte", label: "Largeur porte",   unit: "m",  def: 0.90 },
          { id: "haut_porte", label: "Hauteur porte",   unit: "m",  def: 2.10 },
          { id: "nb_fen",     label: "Nb de fenêtres",  unit: "u",  def: 4 },
          { id: "larg_fen",   label: "Largeur fenêtre", unit: "m",  def: 1.20 },
          { id: "haut_fen",   label: "Hauteur fenêtre", unit: "m",  def: 1.20 },
        ],
        calc: (v) => {
          const sP = v.nb_portes * v.larg_porte * v.haut_porte;
          const sF = v.nb_fen * v.larg_fen * v.haut_fen;
          return [
            { l: "Portes",         v: v.nb_portes,           u: "u" },
            { l: "Surface portes", v: sP.toFixed(1),         u: "m²" },
            { l: "Fenêtres",       v: v.nb_fen,              u: "u" },
            { l: "Surface vitrée", v: sF.toFixed(1),         u: "m²" },
            { l: "Verre commandé", v: (sF * 1.1).toFixed(1), u: "m²" },
          ];
        },
      },
    ],
  },
  {
    id: "vrd", label: "VRD & Extérieur", icon: "🛣️",
    subcats: [
      {
        id: "paves", label: "Pavés / voirie",
        fields: [
          { id: "longueur", label: "Longueur",    unit: "m" },
          { id: "largeur",  label: "Largeur",     unit: "m" },
          { id: "format",   label: "Format pavé", unit: "cm", def: 20, opts: [15, 20, 25] },
          { id: "perte",    label: "Marge perte", unit: "%",  def: 5 },
        ],
        calc: (v) => {
          const s = v.longueur * v.largeur, f = v.format / 100;
          return [
            { l: "Surface à paver",                 v: s.toFixed(1),                                          u: "m²" },
            { l: `Pavés ${v.format}×${v.format} cm`, v: Math.ceil((s * (1 + v.perte / 100)) / (f * f)),      u: "u" },
            { l: "Sable lit de pose",               v: (s * 0.03).toFixed(2),                                 u: "m³" },
            { l: "Bordures périmètre",              v: Math.ceil(2 * (v.longueur + v.largeur)),               u: "ml" },
            { l: "Caniveaux",                       v: Math.ceil(v.longueur * 2),                             u: "ml" },
          ];
        },
      },
      {
        id: "beton-voirie", label: "Béton voirie",
        fields: [
          { id: "longueur",  label: "Longueur",    unit: "m" },
          { id: "largeur",   label: "Largeur",     unit: "m" },
          { id: "epaisseur", label: "Épaisseur",   unit: "m",    def: 0.15 },
          { id: "perte",     label: "Marge perte", unit: "%",    def: 8 },
          { id: "dosage",    label: "Dosage béton", unit: "kg/m³", def: 300, opts: [250, 300, 350] },
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur, v.perte, v.dosage),
      },
    ],
  },
];

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 88, right: 16, zIndex: 999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#0A2A1A" : t.type === "error" ? "#2A0D0D" : "#1E2228",
          border: `1px solid ${t.type === "success" ? C.green : t.type === "error" ? C.red : C.amber}`,
          color: t.type === "success" ? C.green : t.type === "error" ? C.red : C.amber,
          borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600,
          animation: "slideIn 0.2s ease",
          maxWidth: 260,
        }}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✗ " : "⚡ "}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── SKELETON ────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(152px,1fr))", gap: 10 }}>
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          background: C.anthraciteLight, borderRadius: 7, padding: "12px 14px", height: 72,
          animation: "pulse 1.4s ease-in-out infinite",
          opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  );
}

// ─── RÉSULTAT ITEM ───────────────────────────────────────────────────────────
function ResItem({ r }) {
  return (
    <div
      style={{
        background: C.anthracite,
        border: `1px solid ${C.anthraciteBorder}`,
        borderRadius: 8, padding: "12px 14px",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.orange}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.anthraciteBorder}
    >
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, lineHeight: 1.4 }}>{r.l}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>
        {r.v}<span style={{ fontSize: 11, fontWeight: 400, color: C.textDim, marginLeft: 4 }}>{r.u}</span>
      </div>
      {r.n && <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>{r.n}</div>}
    </div>
  );
}

// ─── HISTORIQUE ITEM ─────────────────────────────────────────────────────────
function HistoryItem({ item, onRestore, onDelete, expanded, onToggle }) {
  return (
    <div style={{
      background: C.anthraciteMid,
      border: `1px solid ${C.anthraciteBorder}`,
      borderRadius: 10, marginBottom: 10, overflow: "hidden",
    }}>
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", cursor: "pointer",
          borderBottom: expanded ? `1px solid ${C.anthraciteBorder}` : "none",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.calcul}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.module} · {item.date}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onRestore(); }}
            style={{ background: C.orangeDim, color: C.orangeLight, border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
          >
            Restaurer
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            style={{ background: "transparent", color: C.textDim, border: `1px solid ${C.anthraciteLight}`, borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }}
          >
            ✕
          </button>
          <span style={{ color: C.textDim, fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
            {Array.isArray(item.results) && item.results.map((r, i) => (
              <div key={i} style={{ background: C.anthracite, borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{r.l}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                  {r.v}<span style={{ fontSize: 10, color: C.textDim, marginLeft: 3 }}>{r.u}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function App() {
  const [isMobile]       = useState(() => window.innerWidth < 768);
  const [curMod, setCurMod]   = useState("gros-oeuvre");
  const [curSub, setCurSub]   = useState("terrassement");
  const [vals, setVals]       = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen]   = useState("calc");
  const [history, setHistory] = useState(() => {
    try { const s = localStorage.getItem("baticalc-history"); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [expandedHistory, setExpandedHistory] = useState({});
  const [toasts, setToasts]   = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const resultsRef = useRef(null);

  const addToast = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const findSub = () => {
    const m = MODULES.find(x => x.id === curMod);
    return m?.subcats.find(x => x.id === curSub);
  };
  const findMod = () => MODULES.find(x => x.id === curMod);

  const nav = (mId, sId) => {
    setCurMod(mId); setCurSub(sId); setVals({}); setResults(null);
    setScreen("calc");
    if (isMobile) setSidebarOpen(false);
  };

  const setVal = (id, v) => setVals(prev => ({ ...prev, [id]: v }));

  const calculate = () => {
    const sub = findSub();
    if (!sub) return;
    const parsed = {};
    sub.fields.forEach(f => {
      if (f.opts && typeof (vals[f.id] ?? f.def ?? f.opts[0]) === "string") {
        parsed[f.id] = vals[f.id] ?? f.def ?? f.opts[0];
      } else {
        const raw = vals[f.id] ?? f.def ?? 0;
        const n = parseFloat(raw);
        parsed[f.id] = isNaN(n) ? 0 : n;
      }
    });
    setLoading(true);
    setTimeout(() => {
      try {
        const res = sub.calc(parsed);
        setResults(res);
        const entry = {
          id: Date.now(),
          module: findMod()?.label || "",
          calcul: sub.label,
          values: parsed,
          results: Array.isArray(res) ? res : [],
          date: new Date().toLocaleString("fr-FR"),
        };
        const updated = [entry, ...history].slice(0, 50);
        setHistory(updated);
        try { localStorage.setItem("baticalc-history", JSON.stringify(updated)); } catch {}
        addToast("Calcul effectué et sauvegardé");
        navigator.vibrate?.(30);
      } catch {
        setResults([{ l: "Erreur de calcul", v: "—", u: "" }]);
        addToast("Erreur de calcul", "error");
      }
      setLoading(false);
    }, 350);
  };

  const clearHistory = () => {
    try { localStorage.removeItem("baticalc-history"); } catch {}
    setHistory([]);
    addToast("Historique effacé");
  };

  const restoreCalc = (item) => {
    const m = MODULES.find(x => x.label === item.module);
    if (!m) return;
    const sb = m.subcats.find(x => x.label === item.calcul);
    if (!sb) return;
    setCurMod(m.id); setCurSub(sb.id);
    setVals(Object.fromEntries(Object.entries(item.values).map(([k, v]) => [k, String(v)])));
    setResults(item.results);
    setScreen("calc");
    addToast("Calcul restauré !");
  };

  const exportPDF = async () => {
    if (!resultsRef.current) return;
    addToast("Génération PDF…", "info");
    try {
      const { default: jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
      const { default: html2canvas } = await import("https://esm.sh/html2canvas@1.4.1");
      const canvas = await html2canvas(resultsRef.current, { scale: 2, backgroundColor: "#16191E" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const sub = findSub();
      const mod = findMod();
      pdf.setFillColor(22, 25, 30);
      pdf.rect(0, 0, 210, 297, "F");
      pdf.setFillColor(232, 101, 10);
      pdf.rect(0, 0, 210, 18, "F");
      pdf.setFontSize(14); pdf.setTextColor(255, 255, 255);
      pdf.text("Bâti-Calc", 14, 12);
      pdf.setFontSize(9); pdf.text("Rapport de calcul BTP", 80, 12);
      pdf.setFontSize(9); pdf.setTextColor(200, 180, 160);
      pdf.text(`Calcul : ${sub?.label || ""}  ·  Module : ${mod?.label || ""}`, 14, 26);
      pdf.text(`Date : ${new Date().toLocaleString("fr-FR")}`, 14, 32);
      const width  = 185;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 12, 38, width, Math.min(height, 230));
      pdf.setFontSize(8); pdf.setTextColor(100, 100, 100);
      pdf.text("Propulsé par Bou Aké", 14, 287);
      pdf.text("Bâti-Calc — Calculateur de métrés BTP", 100, 287, { align: "center" });
      pdf.save(`bati-calc-${Date.now()}.pdf`);
      addToast("PDF exporté avec succès !");
    } catch {
      addToast("Erreur export PDF", "error");
    }
  };

  const sub = findSub();
  const mod = findMod();
  const isFerr = sub?.isFerraillage;

  // ─── SIDEBAR CONTENT ────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <nav style={{
      width: isMobile ? "100%" : 220,
      background: C.anthraciteMid,
      borderRight: isMobile ? "none" : `1px solid ${C.anthraciteBorder}`,
      overflowY: "auto", padding: "8px 0 80px",
      height: "100%",
    }}>
      {MODULES.map(m => (
        <div key={m.id}>
          <div style={{ padding: "8px 14px 4px", fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.textDim, marginTop: 4 }}>
            {m.icon} {m.label}
          </div>
          {m.subcats.map(sb => (
            <button
              key={sb.id}
              onClick={() => nav(m.id, sb.id)}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 14px 7px 20px", fontSize: 12,
                background: curSub === sb.id ? C.anthraciteLight : "transparent",
                color: curSub === sb.id ? C.orange : C.textMuted,
                border: "none",
                borderLeft: curSub === sb.id ? `3px solid ${C.orange}` : "3px solid transparent",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.1s",
              }}
            >
              {sb.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );

  // ─── MAIN CONTENT ───────────────────────────────────────────────────────────
  const MainContent = () => {
    if (screen === "history") {
      return (
        <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px 100px" : "22px 28px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
              Historique des calculs
              <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 10, fontWeight: 400 }}>
                {history.length} calcul{history.length > 1 ? "s" : ""}
              </span>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                style={{ background: C.redDim, color: C.red, border: `1px solid #6B1A1A`, borderRadius: 7, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
              >
                Tout effacer
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", color: C.textDim, fontSize: 13, padding: "48px 0" }}>
              Aucun calcul enregistré.<br />
              <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>Vos calculs apparaîtront ici automatiquement.</span>
            </div>
          ) : (
            history.map(item => (
              <HistoryItem
                key={item.id}
                item={item}
                expanded={!!expandedHistory[item.id]}
                onToggle={() => setExpandedHistory(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                onRestore={() => restoreCalc(item)}
                onDelete={() => {
                  const updated = history.filter(h => h.id !== item.id);
                  setHistory(updated);
                  try { localStorage.setItem("baticalc-history", JSON.stringify(updated)); } catch {}
                }}
              />
            ))
          )}
        </main>
      );
    }

    return (
      <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px 100px" : "22px 28px 80px" }}>
        {sub ? (
          <>
            <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: C.text, marginBottom: 3, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {sub.label}
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: C.orangeDim, color: C.orangeLight, padding: "3px 9px", borderRadius: 4 }}>
                {mod?.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
              {isFerr
                ? "Recouvrements, ancrages, chutes et pertes chantier intégrés."
                : "Quantités calculées avec marges de perte."}
            </div>

            {isFerr && (
              <div style={{ background: "#1A1505", border: `1px solid ${C.amberDim}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 11, color: C.amber, lineHeight: 1.6 }}>
                ⚠ Recouvrements : {RECOUVREMENT_COEFF.recouvrement}×ø · Ancrages : {RECOUVREMENT_COEFF.ancrage}×ø · Chutes : {RECOUVREMENT_COEFF.chute_pct}%
              </div>
            )}

            <div style={{ background: C.anthraciteMid, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 10, padding: isMobile ? 14 : 20, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
                {sub.fields.map(f => (
                  <div key={f.id}>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: C.textMuted, marginBottom: 5 }}>
                      {f.label}
                    </label>
                    {f.opts ? (
                      <select
                        style={{ width: "100%", background: C.anthracite, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 7, padding: "9px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", cursor: "pointer", boxSizing: "border-box", appearance: "none" }}
                        value={vals[f.id] ?? f.def ?? f.opts[0]}
                        onChange={e => setVal(f.id, e.target.value)}
                      >
                        {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type="number" min="0" step="any"
                        placeholder={f.def ?? 0}
                        value={vals[f.id] ?? ""}
                        style={{ width: "100%", background: C.anthracite, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 7, padding: "9px 11px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", transition: "border-color 0.12s", boxSizing: "border-box" }}
                        onChange={e => setVal(f.id, e.target.value)}
                        onFocus={e => (e.target.style.borderColor = C.orange)}
                        onBlur={e  => (e.target.style.borderColor = C.anthraciteBorder)}
                      />
                    )}
                    {f.hint && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, fontStyle: "italic" }}>{f.hint}</div>}
                    {!f.hint && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>{f.unit}</div>}
                  </div>
                ))}
              </div>

              <div style={{ display: isMobile ? "grid" : "flex", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center" }}>
                <button
                  onClick={calculate}
                  style={{
                    background: C.orange, color: "#fff", border: "none", borderRadius: 8,
                    padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", letterSpacing: "0.02em",
                    ...(isMobile ? { gridColumn: "1/-1" } : {}),
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => e.target.style.background = C.orangeLight}
                  onMouseLeave={e => e.target.style.background = C.orange}
                >
                  ⚡ Calculer
                </button>
                <button
                  onClick={() => { setVals({}); setResults(null); }}
                  style={{ background: "transparent", border: `1px solid ${C.anthraciteBorder}`, borderRadius: 8, padding: "12px 18px", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Réinitialiser
                </button>
                {results && !isFerr && (
                  <button
                    onClick={exportPDF}
                    style={{ background: C.blueDim, color: C.blue, border: `1px solid #1A4A7A`, borderRadius: 8, padding: "12px 18px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                  >
                    ↓ Export PDF
                  </button>
                )}
              </div>
            </div>

            <div ref={resultsRef}>
              {loading ? (
                <div style={{ background: C.anthraciteMid, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 10, padding: 20 }}>
                  <Skeleton />
                </div>
              ) : results ? (
                isFerr && results.type === "ferraillage" ? (
                  <div>
                    {results.sections.map(sec => (
                      <div key={sec.title} style={{ background: SECTION_COLORS[sec.color].bg, border: `1px solid ${SECTION_COLORS[sec.color].border}`, borderRadius: 10, padding: 18, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: SECTION_COLORS[sec.color].title, marginBottom: 12 }}>
                          {sec.title}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                          {sec.items.map((it, i) => (
                            <div key={i} style={{
                              background: it.highlight ? SECTION_COLORS[sec.color].border : "rgba(0,0,0,0.25)",
                              border: `1px solid ${SECTION_COLORS[sec.color].border}`,
                              borderRadius: 7, padding: "11px 13px",
                              ...(it.highlight ? { gridColumn: "1 / -1" } : {}),
                            }}>
                              <div style={{ fontSize: 10, color: SECTION_COLORS[sec.color].accent, marginBottom: 4 }}>{it.l}</div>
                              <div style={{ fontSize: it.highlight ? 24 : 19, fontWeight: 800, color: "#FFF" }}>
                                {it.v}<span style={{ fontSize: 11, fontWeight: 400, color: SECTION_COLORS[sec.color].title, marginLeft: 3 }}>{it.u}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={exportPDF}
                      style={{ marginTop: 8, width: "100%", background: C.blueDim, color: C.blue, border: `1px solid #1A4A7A`, borderRadius: 8, padding: "12px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                    >
                      ↓ Exporter ce rapport en PDF
                    </button>
                  </div>
                ) : (
                  <div style={{ background: C.anthraciteMid, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 10, padding: 20 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.textDim, marginBottom: 14 }}>
                      Résultats du calcul
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
                      {(Array.isArray(results) ? results : []).map((r, i) => <ResItem key={i} r={r} />)}
                    </div>
                  </div>
                )
              ) : (
                <div style={{ background: C.anthraciteMid, border: `1px solid ${C.anthraciteBorder}`, borderRadius: 10, padding: 32, textAlign: "center", color: C.textDim, fontSize: 13 }}>
                  Remplissez les champs et cliquez sur Calculer.
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", color: C.textDim, fontSize: 13, padding: "48px 0" }}>
            Sélectionnez un calcul dans le menu.
          </div>
        )}
      </main>
    );
  };

  return (
    <div style={{ fontFamily: "'Barlow','Helvetica Neue',sans-serif", background: C.anthracite, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #363B45; border-radius: 4px; }
      `}</style>

      {/* HEADER */}
      <header style={{
        background: C.anthraciteMid, borderBottom: `1px solid ${C.anthraciteBorder}`,
        padding: isMobile ? "10px 14px" : "10px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 20, cursor: "pointer", padding: "0 4px" }}>
              ☰
            </button>
          )}
          <div style={{ width: 34, height: 34, background: C.orange, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: "#fff", flexShrink: 0 }}>BC</div>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color: C.text, letterSpacing: "0.01em" }}>Bâti-Calc</div>
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Propulsé par Bou Aké</div>
          </div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setScreen("calc")}
              style={{ background: screen === "calc" ? C.orangeGlow : "transparent", color: screen === "calc" ? C.orangeLight : C.textMuted, border: `1px solid ${screen === "calc" ? C.orangeDim : C.anthraciteBorder}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Calculateur
            </button>
            <button
              onClick={() => setScreen("history")}
              style={{ background: screen === "history" ? C.orangeGlow : "transparent", color: screen === "history" ? C.orangeLight : C.textMuted, border: `1px solid ${screen === "history" ? C.orangeDim : C.anthraciteBorder}`, borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Historique {history.length > 0 && <span style={{ background: C.orange, color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{history.length}</span>}
            </button>
          </div>
        )}
      </header>

      {/* MOBILE SIDEBAR DRAWER */}
      {isMobile && sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ width: "75vw", maxWidth: 280, height: "100%", background: C.anthraciteMid, overflowY: "auto", paddingTop: 58 }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* LAYOUT */}
      <div style={{
        display: isMobile ? "block" : "flex",
        flex: 1,
        overflow: "hidden",
        height: isMobile ? "auto" : "calc(100vh - 57px)",
      }}>
        {!isMobile && <SidebarContent />}
        <MainContent />
      </div>

      {/* BOTTOM NAV MOBILE */}
      {isMobile && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: C.anthraciteMid, borderTop: `1px solid ${C.anthraciteBorder}`,
          display: "flex", padding: "8px 0 env(safe-area-inset-bottom,8px)",
        }}>
          {[
            { id: "calc",    label: "Calculer",   icon: "⚡" },
            { id: "menu",    label: "Modules",     icon: "☰" },
            { id: "history", label: "Historique",  icon: "📋" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { if (tab.id === "menu") setSidebarOpen(true); else setScreen(tab.id); }}
              style={{
                flex: 1, background: "none", border: "none",
                color: screen === tab.id ? C.orange : C.textDim,
                fontSize: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                cursor: "pointer", padding: "6px 0",
              }}
            >
              <span>{tab.icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em" }}>{tab.label}</span>
              {tab.id === "history" && history.length > 0 && (
                <span style={{ position: "absolute", top: 8, fontSize: 8, background: C.orange, color: "#fff", borderRadius: 8, padding: "1px 4px" }}>
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      )}

      <Toast toasts={toasts} />

      {!isMobile && (
        <footer style={{ background: C.anthraciteMid, borderTop: `1px solid ${C.anthraciteBorder}`, padding: "8px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: C.textDim, fontWeight: 600 }}>Bâti-Calc</span>
          <span style={{ fontSize: 11, color: C.textDim }}>Propulsé par Bou Aké</span>
        </footer>
      )}
    </div>
  );
}
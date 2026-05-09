"use client";
import { useState } from "react";

// ─── PALETTE 2A DESIGN & BUILD ────────────────────────────────────────────
const C = {
  anthracite:      "#1C1F24",
  anthraciteMid:   "#2A2E35",
  anthraciteLight: "#353A42",
  orange:          "#E8650A",
  orangeLight:     "#FF8C3A",
  orangeDim:       "#7A3505",
  text:            "#F0EDE8",
  textMuted:       "#9A9590",
  textDim:         "#6A6560",
  green:           "#2ECC8A",
  red:             "#E84A4A",
  redDim:          "#5C1A1A",
  amber:           "#F5A623",
  amberDim:        "#6B4510",
};

// ─── HELPER : calcul béton commun ────────────────────────────────────────
function beton(volBrut, perte) {
  const v = volBrut * (1 + perte / 100);
  return [
    { l: "Volume béton brut",   v: volBrut.toFixed(3), u: "m³" },
    { l: "Volume + perte",      v: v.toFixed(3),        u: "m³", n: `+${perte}% perte` },
    { l: "Ciment",              v: Math.ceil((v * 350) / 50), u: "sacs 50 kg" },
    { l: "Sable",               v: (v * 0.5).toFixed(2), u: "m³" },
    { l: "Gravier",             v: (v * 0.8).toFixed(2), u: "m³" },
    { l: "Eau estimée",         v: Math.round(v * 175),  u: "litres" },
  ];
}

// ─── DONNÉES FERRAILLAGE : poids théoriques HA ────────────────────────────
// Formule officielle : poids (kg/ml) = D² / 162
const HA_DIAMS = [6, 8, 10, 12, 14, 16, 20, 25, 32];
function poidsUnitaire(d) { return (d * d) / 162; }

// Longueurs de recouvrement réglementaires (en nombre de diamètres)
// Selon Eurocode 2 / règles BAEL — béton C25/30
const RECOUVREMENT_COEFF = { ancrage: 40, recouvrement: 50, chute_pct: 3 };

// ─── TOUS LES MODULES ────────────────────────────────────────────────────
const MODULES = [
  {
    id: "gros-oeuvre", label: "Gros œuvre", icon: "⬛",
    subcats: [
      {
        id: "terrassement", label: "Terrassement",
        fields: [
          { id: "longueur",    label: "Longueur",              unit: "m" },
          { id: "largeur",     label: "Largeur",               unit: "m" },
          { id: "profondeur",  label: "Profondeur",            unit: "m" },
          { id: "remblai_pct", label: "% remblai réutilisé",  unit: "%", def: 30 },
          { id: "cap_camion",  label: "Capacité camion",       unit: "m³", def: 10 },
        ],
        calc: (v) => {
          const vol = v.longueur * v.largeur * v.profondeur;
          const foisonne = vol * 1.25;
          const remblai = vol * (v.remblai_pct / 100);
          const deblai = vol - remblai;
          return [
            { l: "Volume fouille",             v: vol.toFixed(2),      u: "m³" },
            { l: "Volume foisonné (évac.)",    v: foisonne.toFixed(2), u: "m³", n: "×1,25 coeff." },
            { l: "Déblai à évacuer",           v: deblai.toFixed(2),   u: "m³" },
            { l: "Remblai réutilisable",       v: remblai.toFixed(2),  u: "m³" },
            { l: "Rotations camion",           v: Math.ceil(foisonne / v.cap_camion), u: "voyages" },
            { l: "Surface compactage",         v: (v.longueur * v.largeur).toFixed(1), u: "m²" },
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
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur * v.nb, v.perte),
      },
      {
        id: "beton-poteau", label: "Béton — Poteaux",
        fields: [
          { id: "section",  label: "Section (côté carré)", unit: "m", def: 0.25 },
          { id: "hauteur",  label: "Hauteur poteau",       unit: "m" },
          { id: "nb",       label: "Nombre poteaux",       unit: "u", def: 4 },
          { id: "perte",    label: "Marge perte",          unit: "%", def: 8 },
        ],
        calc: (v) => beton(v.section * v.section * v.hauteur * v.nb, v.perte),
      },
      {
        id: "beton-longrine", label: "Béton — Longrines",
        fields: [
          { id: "longueur", label: "Longueur totale",  unit: "m" },
          { id: "larg_s",   label: "Largeur section",  unit: "m", def: 0.20 },
          { id: "haut_s",   label: "Hauteur section",  unit: "m", def: 0.30 },
          { id: "perte",    label: "Marge perte",      unit: "%", def: 8 },
        ],
        calc: (v) => beton(v.longueur * v.larg_s * v.haut_s, v.perte),
      },
      {
        id: "beton-dalle", label: "Béton — Dalle",
        fields: [
          { id: "longueur",  label: "Longueur",    unit: "m" },
          { id: "largeur",   label: "Largeur",     unit: "m" },
          { id: "epaisseur", label: "Épaisseur",   unit: "m", def: 0.12 },
          { id: "perte",     label: "Marge perte", unit: "%", def: 8 },
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur, v.perte),
      },
      {
        id: "beton-poutre", label: "Béton — Poutres",
        fields: [
          { id: "longueur", label: "Longueur totale poutres", unit: "m" },
          { id: "larg_s",   label: "Largeur section",         unit: "m", def: 0.20 },
          { id: "haut_s",   label: "Hauteur section",         unit: "m", def: 0.40 },
          { id: "perte",    label: "Marge perte",             unit: "%", def: 8 },
        ],
        calc: (v) => beton(v.longueur * v.larg_s * v.haut_s, v.perte),
      },

      // ── FERRAILLAGE ─────────────────────────────────────────────────────
      {
        id: "ferraillage", label: "Ferraillage HA",
        isFerraillage: true, // flag pour rendu spécial
        fields: [
          // ENTRÉES PRINCIPALES
          { id: "poids_theorique",  label: "Poids théorique projet", unit: "kg",  def: 0,
            hint: "Issu des plans de ferraillage" },
          { id: "diametre",         label: "Diamètre HA",            unit: "mm",  def: 12,
            opts: HA_DIAMS },
          { id: "long_barre",       label: "Longueur réelle barre",  unit: "m",   def: 12,
            hint: "Longueur commerciale (ex : 12 m)" },
          // RECOUVREMENTS & ANCRAGES
          { id: "nb_recouv",        label: "Nombre de recouvrements", unit: "u",  def: 0,
            hint: "Jonctions entre barres" },
          { id: "nb_ancrages",      label: "Nombre d'ancrages",      unit: "u",  def: 0,
            hint: "Extrémités ancrées dans béton" },
          // CADRES / ÉTRIERS
          { id: "long_cadre",       label: "Long. développée cadre", unit: "m",   def: 1.2 },
          { id: "nb_cadres",        label: "Nombre cadres/étriers",  unit: "u",   def: 0 },
          { id: "diam_cadre",       label: "Diamètre cadres",        unit: "mm",  def: 6,
            opts: [6, 8, 10] },
          // PERTES CHANTIER
          { id: "perte_chantier",   label: "Perte chantier",         unit: "%",   def: 5,
            opts: [3, 5] },
          // COÛT
          { id: "prix_tonne",       label: "Prix acier (par tonne)", unit: "FCFA/t", def: 450000,
            hint: "Prix marché Lomé actuel" },
        ],
        calc: (v) => {
          const d = v.diametre;
          const pu = poidsUnitaire(d);                     // kg/ml
          const long_recouv = (RECOUVREMENT_COEFF.recouvrement * d / 1000) * v.nb_recouv; // m
          const long_ancrage = (RECOUVREMENT_COEFF.ancrage * d / 1000) * v.nb_ancrages;  // m
          const long_chutes_pct = RECOUVREMENT_COEFF.chute_pct / 100;                    // 3%

          // Longueur totale nécessaire (théorique + recouvrements + ancrages)
          const long_theorique = v.poids_theorique > 0
            ? v.poids_theorique / pu
            : 0;
          const long_suppl = long_recouv + long_ancrage;
          const long_avant_chutes = long_theorique + long_suppl;
          const long_chutes = long_avant_chutes * long_chutes_pct;
          const long_nette_necessaire = long_avant_chutes + long_chutes;

          // Perte chantier globale (sur la long. nette)
          const long_avec_perte = long_nette_necessaire * (1 + v.perte_chantier / 100);

          // Nombre de barres à acheter (arrondi au sup)
          const nb_barres = Math.ceil(long_avec_perte / v.long_barre);
          const long_achetee = nb_barres * v.long_barre;

          // Poids réel acheté
          const poids_achete = long_achetee * pu;

          // Poids pertes totales
          const poids_perte = poids_achete - v.poids_theorique;
          const pct_perte_reelle = v.poids_theorique > 0
            ? ((poids_perte / v.poids_theorique) * 100).toFixed(1) : "—";

          // Cadres / étriers
          const poids_cadres = v.nb_cadres > 0
            ? poidsUnitaire(v.diam_cadre) * v.long_cadre * v.nb_cadres : 0;

          const poids_total = poids_achete + poids_cadres;

          // Coût
          const cout_total = (poids_total / 1000) * v.prix_tonne;
          const cout_perte = (poids_perte / 1000) * v.prix_tonne;

          return {
            type: "ferraillage",
            sections: [
              {
                title: "Longueurs calculées",
                color: "blue",
                items: [
                  { l: "Long. théorique (plans)",     v: long_theorique.toFixed(1),       u: "ml" },
                  { l: `Recouvrements (${RECOUVREMENT_COEFF.recouvrement}×ø)`, v: long_recouv.toFixed(2), u: "ml" },
                  { l: `Ancrages (${RECOUVREMENT_COEFF.ancrage}×ø)`,          v: long_ancrage.toFixed(2), u: "ml" },
                  { l: "Chutes estimées (3%)",        v: long_chutes.toFixed(2),           u: "ml" },
                  { l: "Long. nette nécessaire",      v: long_nette_necessaire.toFixed(1), u: "ml" },
                  { l: `+ Perte chantier (${v.perte_chantier}%)`, v: long_avec_perte.toFixed(1), u: "ml" },
                ],
              },
              {
                title: "Barres à acheter",
                color: "green",
                items: [
                  { l: `Barres HA${d} de ${v.long_barre} m`,  v: nb_barres,                    u: "barres" },
                  { l: "Longueur achetée totale",              v: long_achetee.toFixed(1),       u: "ml" },
                  { l: "Poids unitaire HA" + d,                v: pu.toFixed(4),                 u: "kg/ml" },
                  { l: "Poids acier principal acheté",         v: poids_achete.toFixed(1),       u: "kg" },
                  { l: `Poids cadres/étriers HA${v.diam_cadre}`, v: poids_cadres.toFixed(1),    u: "kg" },
                  { l: "Poids total acier",                    v: poids_total.toFixed(1),        u: "kg" },
                ],
              },
              {
                title: "Pertes & surcoût",
                color: "red",
                items: [
                  { l: "Poids théorique projet",    v: v.poids_theorique.toFixed(1),  u: "kg" },
                  { l: "Poids réel acheté",         v: poids_achete.toFixed(1),       u: "kg" },
                  { l: "Poids perdu (chutes+perte)", v: poids_perte.toFixed(1),       u: "kg" },
                  { l: "% perte réelle",            v: pct_perte_reelle,              u: "%" },
                  { l: "Coût perte (FCFA)",         v: Math.round(cout_perte).toLocaleString("fr-FR"), u: "FCFA" },
                ],
              },
              {
                title: "Coût d'achat réel",
                color: "amber",
                items: [
                  { l: "Prix unitaire tonne",       v: v.prix_tonne.toLocaleString("fr-FR"), u: "FCFA/t" },
                  { l: "Coût acier principal",      v: Math.round((poids_achete/1000)*v.prix_tonne).toLocaleString("fr-FR"), u: "FCFA" },
                  { l: "Coût cadres/étriers",       v: Math.round((poids_cadres/1000)*v.prix_tonne).toLocaleString("fr-FR"), u: "FCFA" },
                  { l: "COÛT TOTAL RÉEL",           v: Math.round(cout_total).toLocaleString("fr-FR"), u: "FCFA", highlight: true },
                ],
              },
            ],
          };
        },
      },

      {
        id: "coffrage", label: "Coffrage",
        fields: [
          { id: "perimetre",  label: "Périmètre développé", unit: "m" },
          { id: "hauteur",    label: "Hauteur coffrée",     unit: "m" },
          { id: "nb_el",      label: "Nombre d'éléments",   unit: "u", def: 1 },
          { id: "perte",      label: "Marge perte",         unit: "%", def: 15 },
        ],
        calc: (v) => {
          const s = v.perimetre * v.hauteur * v.nb_el;
          const sP = s * (1 + v.perte / 100);
          return [
            { l: "Surface nette coffrage",          v: s.toFixed(1),          u: "m²" },
            { l: "Surface + perte",                 v: sP.toFixed(1),         u: "m²", n: `+${v.perte}%` },
            { l: "Panneaux contreplaqué 1,2×1,2 m", v: Math.ceil(sP / 1.44), u: "u" },
            { l: "Étais de soutien estimés",        v: Math.ceil(sP / 2),     u: "u" },
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
          { id: "longueur",   label: "Longueur mur",         unit: "m" },
          { id: "hauteur",    label: "Hauteur mur",          unit: "m" },
          { id: "epaisseur",  label: "Épaisseur agglo",      unit: "cm", def: 15, opts: [10, 12, 15, 20] },
          { id: "nb_ouv",     label: "Nb ouvertures",        unit: "u",  def: 0 },
          { id: "surf_ouv",   label: "Surface / ouverture",  unit: "m²", def: 2 },
          { id: "perte",      label: "Marge perte",          unit: "%",  def: 5 },
        ],
        calc: (v) => {
          const surf = v.longueur * v.hauteur - v.nb_ouv * v.surf_ouv;
          const nb = Math.ceil((surf / (0.40 * 0.20)) * (1 + v.perte / 100));
          const mvol = surf * 0.015;
          return [
            { l: "Surface nette mur",   v: surf.toFixed(1),             u: "m²" },
            { l: `Agglos ${v.epaisseur} cm`, v: nb,                     u: "unités" },
            { l: "Volume mortier",      v: mvol.toFixed(3),             u: "m³" },
            { l: "Ciment mortier",      v: Math.ceil((mvol * 300) / 50), u: "sacs 50 kg" },
            { l: "Sable",              v: (mvol * 1.5).toFixed(2),      u: "m³" },
            { l: "Eau estimée",        v: Math.round(mvol * 180),       u: "litres" },
          ];
        },
      },
      {
        id: "enduit", label: "Enduit / crépi",
        fields: [
          { id: "surface",     label: "Surface à enduire", unit: "m²" },
          { id: "epaisseur",   label: "Épaisseur enduit",  unit: "mm", def: 15 },
          { id: "nb_couches",  label: "Nombre de couches", unit: "u",  def: 2 },
          { id: "perte",       label: "Marge perte",       unit: "%",  def: 10 },
        ],
        calc: (v) => {
          const vol = v.surface * (v.epaisseur / 1000) * v.nb_couches * (1 + v.perte / 100);
          return [
            { l: "Volume mortier total", v: vol.toFixed(3),              u: "m³" },
            { l: "Ciment",              v: Math.ceil((vol * 350) / 50),  u: "sacs 50 kg" },
            { l: "Sable fin",           v: (vol * 1.5).toFixed(2),       u: "m³" },
            { l: "Eau estimée",         v: Math.round(vol * 170),        u: "litres" },
          ];
        },
      },
      {
        id: "chape", label: "Chape",
        fields: [
          { id: "surface",   label: "Surface",       unit: "m²" },
          { id: "epaisseur", label: "Épaisseur",     unit: "cm", def: 5 },
          { id: "perte",     label: "Marge perte",   unit: "%",  def: 8 },
        ],
        calc: (v) => {
          const vol = v.surface * (v.epaisseur / 100) * (1 + v.perte / 100);
          return [
            { l: "Volume chape + perte", v: vol.toFixed(3),             u: "m³" },
            { l: "Ciment",              v: Math.ceil((vol * 350) / 50), u: "sacs 50 kg" },
            { l: "Sable",               v: (vol * 1.4).toFixed(2),      u: "m³" },
            { l: "Eau estimée",         v: Math.round(vol * 160),       u: "litres" },
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
          { id: "longueur", label: "Longueur",     unit: "m" },
          { id: "largeur",  label: "Largeur",      unit: "m" },
          { id: "format",   label: "Format carreau", unit: "cm", def: "60x60",
            opts: ["30x30", "40x40", "45x45", "60x60", "60x120", "80x80", "120x120"] },
          { id: "perte",    label: "Marge perte",  unit: "%",  def: 10 },
        ],
        calc: (v) => {
          const surf = v.longueur * v.largeur;
          const fmt = String(v.format || "60x60").split("x").map(Number);
          const sc = (fmt[0] / 100) * (fmt[1] / 100);
          const nb = Math.ceil((surf * (1 + v.perte / 100)) / sc);
          return [
            { l: "Surface brute",                v: surf.toFixed(1),                     u: "m²" },
            { l: "Surface + perte",              v: (surf * (1 + v.perte / 100)).toFixed(1), u: "m²", n: `+${v.perte}%` },
            { l: `Carreaux ${v.format}`,         v: nb,                                  u: "unités" },
            { l: "Colle carrelage",              v: Math.ceil((surf * 5) / 25),          u: "sacs 25 kg" },
            { l: "Joint",                        v: (surf * 0.3).toFixed(1),             u: "kg" },
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
          const s = v.longueur * v.largeur;
          const sP = s * (1 + v.perte / 100);
          return [
            { l: "Surface nette",         v: s.toFixed(1),        u: "m²" },
            { l: "Surface à commander",   v: sP.toFixed(1),       u: "m²", n: `+${v.perte}% coupe` },
            { l: "Boîtes (typ. 2 m²)",    v: Math.ceil(sP / 2),   u: "boîtes" },
            { l: "Colle sol (6 kg/m²)",   v: Math.ceil(s * 6),    u: "kg" },
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
          { id: "longueur",    label: "Longueur faîtage",      unit: "m" },
          { id: "largeur",     label: "Largeur demi-versant",  unit: "m" },
          { id: "pente",       label: "Pente",                 unit: "%", def: 30 },
          { id: "nb_versants", label: "Nombre de versants",    unit: "u", def: 2 },
          { id: "perte",       label: "Marge perte",           unit: "%", def: 8 },
        ],
        calc: (v) => {
          const coeff = Math.sqrt(1 + (v.pente / 100) ** 2);
          const sv = v.longueur * v.largeur * coeff;
          const sT = sv * v.nb_versants * (1 + v.perte / 100);
          const toles = Math.ceil(sT / 0.75);
          return [
            { l: "Surface par versant",       v: sv.toFixed(1),         u: "m²" },
            { l: "Surface totale + perte",    v: sT.toFixed(1),         u: "m²" },
            { l: "Tôles bac (75 cm utile)",   v: toles,                  u: "tôles" },
            { l: "Vis de fixation",           v: toles * 8,              u: "u" },
            { l: "Faîtage",                   v: Math.ceil(v.longueur / 2), u: "u" },
            { l: "Gouttières",                v: (v.longueur * v.nb_versants).toFixed(1), u: "ml" },
          ];
        },
      },
      {
        id: "charpente", label: "Charpente bois",
        fields: [
          { id: "longueur",    label: "Longueur bâtiment", unit: "m" },
          { id: "largeur",     label: "Largeur",           unit: "m" },
          { id: "espacement",  label: "Espacement pannes", unit: "m", def: 1.5 },
          { id: "perte",       label: "Marge perte",       unit: "%", def: 10 },
        ],
        calc: (v) => {
          const nbP = Math.ceil(v.largeur / v.espacement) + 1;
          return [
            { l: "Nombre pannes",          v: nbP * 2,                                               u: "pannes" },
            { l: "Longueur totale pannes", v: (nbP * v.longueur * (1 + v.perte / 100)).toFixed(1),   u: "ml" },
            { l: "Chevrons estimés",       v: Math.ceil(v.longueur / 0.6) * 2,                       u: "u" },
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
          { id: "surface",     label: "Surface totale",       unit: "m²" },
          { id: "nb_couches",  label: "Nombre de couches",    unit: "u",     def: 2 },
          { id: "rendement",   label: "Rendement peinture",   unit: "m²/L",  def: 10 },
          { id: "perte",       label: "Marge perte",          unit: "%",     def: 10 },
        ],
        calc: (v) => {
          const tot = v.surface * v.nb_couches * (1 + v.perte / 100);
          const L = tot / v.rendement;
          return [
            { l: "Surface effective totale", v: tot.toFixed(1),        u: "m²" },
            { l: "Peinture nécessaire",      v: L.toFixed(1),           u: "litres" },
            { l: "Pots de 20 L",             v: Math.ceil(L / 20),      u: "pots" },
            { l: "Pots de 5 L",              v: Math.ceil(L / 5),       u: "pots" },
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
          const s = v.longueur * v.largeur * (1 + v.perte / 100);
          const per = 2 * (v.longueur + v.largeur);
          return [
            { l: "Surface faux plafond", v: s.toFixed(1),            u: "m²" },
            { l: "Dalles 60×60",         v: Math.ceil(s / 0.36),     u: "u" },
            { l: "Profilés porteurs",    v: Math.ceil(s / 1.2),      u: "u" },
            { l: "Cornières périmètre",  v: Math.ceil(per * 1.1),    u: "ml" },
            { l: "Suspentes",            v: Math.ceil(s),             u: "u" },
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
          { id: "long_alim",  label: "Alimentation (eau)", unit: "m" },
          { id: "long_evac",  label: "Évacuation EU/EV",   unit: "m" },
          { id: "nb_points",  label: "Points d'eau",       unit: "u" },
          { id: "perte",      label: "Marge perte",        unit: "%", def: 15 },
        ],
        calc: (v) => [
          { l: "Tuyaux alimentation", v: (v.long_alim * (1 + v.perte / 100)).toFixed(1), u: "ml" },
          { l: "Tuyaux évacuation",   v: (v.long_evac * (1 + v.perte / 100)).toFixed(1), u: "ml" },
          { l: "Raccords estimés",    v: v.nb_points * 4, u: "u" },
          { l: "Robinetteries",       v: v.nb_points,     u: "u" },
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
          { id: "surface",      label: "Surface habitable",       unit: "m²" },
          { id: "nb_prises",    label: "Nombre de prises",        unit: "u" },
          { id: "nb_inter",     label: "Nombre d'interrupteurs",  unit: "u" },
          { id: "nb_circuits",  label: "Nombre de circuits",      unit: "u", def: 4 },
          { id: "perte",        label: "Marge perte",             unit: "%", def: 15 },
        ],
        calc: (v) => {
          const cable = (v.surface * 3 + v.nb_prises * 3 + v.nb_inter * 2) * (1 + v.perte / 100);
          return [
            { l: "Câble électrique total",  v: cable.toFixed(0),           u: "ml" },
            { l: "Gaines ICTA",             v: (cable * 0.8).toFixed(0),   u: "ml" },
            { l: "Prises",                  v: v.nb_prises,                 u: "u" },
            { l: "Interrupteurs",           v: v.nb_inter,                  u: "u" },
            { l: "Disjoncteurs tableau",    v: v.nb_circuits + 1,           u: "u" },
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
          { id: "nb_portes",   label: "Nombre de portes",    unit: "u",  def: 3 },
          { id: "larg_porte",  label: "Largeur porte",       unit: "m",  def: 0.90 },
          { id: "haut_porte",  label: "Hauteur porte",       unit: "m",  def: 2.10 },
          { id: "nb_fen",      label: "Nombre de fenêtres",  unit: "u",  def: 4 },
          { id: "larg_fen",    label: "Largeur fenêtre",     unit: "m",  def: 1.20 },
          { id: "haut_fen",    label: "Hauteur fenêtre",     unit: "m",  def: 1.20 },
        ],
        calc: (v) => {
          const sP = v.nb_portes * v.larg_porte * v.haut_porte;
          const sF = v.nb_fen * v.larg_fen * v.haut_fen;
          return [
            { l: "Portes",          v: v.nb_portes,        u: "u" },
            { l: "Surface portes",  v: sP.toFixed(1),      u: "m²" },
            { l: "Fenêtres",        v: v.nb_fen,           u: "u" },
            { l: "Surface vitrée",  v: sF.toFixed(1),      u: "m²" },
            { l: "Verre commandé",  v: (sF * 1.1).toFixed(1), u: "m²" },
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
          { id: "longueur", label: "Longueur",     unit: "m" },
          { id: "largeur",  label: "Largeur",      unit: "m" },
          { id: "format",   label: "Format pavé",  unit: "cm", def: 20, opts: [15, 20, 25] },
          { id: "perte",    label: "Marge perte",  unit: "%",  def: 5 },
        ],
        calc: (v) => {
          const s = v.longueur * v.largeur, f = v.format / 100;
          return [
            { l: "Surface à paver",           v: s.toFixed(1),                                         u: "m²" },
            { l: `Pavés ${v.format}×${v.format} cm`, v: Math.ceil((s * (1 + v.perte / 100)) / (f * f)), u: "u" },
            { l: "Sable lit de pose",         v: (s * 0.03).toFixed(2),                                u: "m³" },
            { l: "Bordures périmètre",        v: Math.ceil(2 * (v.longueur + v.largeur)),               u: "ml" },
            { l: "Caniveaux",                 v: Math.ceil(v.longueur * 2),                             u: "ml" },
          ];
        },
      },
      {
        id: "beton-voirie", label: "Béton voirie",
        fields: [
          { id: "longueur",  label: "Longueur",    unit: "m" },
          { id: "largeur",   label: "Largeur",     unit: "m" },
          { id: "epaisseur", label: "Épaisseur",   unit: "m", def: 0.15 },
          { id: "perte",     label: "Marge perte", unit: "%", def: 8 },
        ],
        calc: (v) => beton(v.longueur * v.largeur * v.epaisseur, v.perte),
      },
    ],
  },
];

// ─── COULEURS SECTIONS FERRAILLAGE ───────────────────────────────────────
const SECTION_COLORS = {
  blue:  { bg: "#0D2A45", border: "#1A4A7A", accent: "#5BB8FF", title: "#90D0FF" },
  green: { bg: "#0A2A1A", border: "#1A5A30", accent: "#2ECC8A", title: "#7AEFC0" },
  red:   { bg: "#2A0D0D", border: "#6B1A1A", accent: "#E84A4A", title: "#FF9090" },
  amber: { bg: "#2A1A05", border: "#6B4510", accent: "#F5A623", title: "#FFD080" },
};

// ─── STYLES ───────────────────────────────────────────────────────────────
const s = {
  app:    { fontFamily:"'Barlow','Helvetica Neue',sans-serif", background:C.anthracite, minHeight:"100vh", display:"flex", flexDirection:"column" },
  header: { background:C.anthraciteMid, borderBottom:`1px solid ${C.anthraciteLight}`, padding:"12px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 },
  logoWrap: { display:"flex", alignItems:"center", gap:11 },
  logoMark: { width:36, height:36, background:C.orange, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:15, color:"#fff", flexShrink:0 },
  logoText: { fontSize:17, fontWeight:800, color:C.text, letterSpacing:"0.01em" },
  logoSub:  { fontSize:10, color:C.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:1 },
  layout:   { display:"flex", flex:1, overflow:"hidden", height:"calc(100vh - 58px)" },
  sidebar:  { width:212, flexShrink:0, background:C.anthraciteMid, borderRight:`1px solid ${C.anthraciteLight}`, overflowY:"auto", padding:"8px 0" },
  modLabel: { padding:"6px 14px", fontSize:9, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:C.textDim, marginTop:4 },
  navItem:  (active) => ({ display:"block", width:"100%", textAlign:"left", padding:"7px 14px 7px 20px", fontSize:12, background: active?C.anthraciteLight:"transparent", color: active?C.orange:C.textMuted, border:"none", borderLeft: active?`3px solid ${C.orange}`:"3px solid transparent", cursor:"pointer", fontFamily:"inherit", transition:"all 0.1s" }),
  main:     { flex:1, overflowY:"auto", padding:"22px 28px" },
  pageTitle:{ fontSize:20, fontWeight:800, color:C.text, marginBottom:3, display:"flex", alignItems:"center", gap:10 },
  modTag:   { fontSize:9, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", background:C.orangeDim, color:C.orangeLight, padding:"3px 9px", borderRadius:4 },
  pageDesc: { fontSize:12, color:C.textMuted, marginBottom:20, marginTop:3 },
  formCard: { background:C.anthraciteMid, border:`1px solid ${C.anthraciteLight}`, borderRadius:10, padding:"20px", marginBottom:16 },
  fieldGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(168px,1fr))", gap:14, marginBottom:16 },
  fieldLabel:{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:C.textMuted, marginBottom:5 },
  fieldHint: { fontSize:10, color:C.textDim, marginTop:3, fontStyle:"italic" },
  fieldUnit: { fontSize:10, color:C.textDim, marginTop:3 },
  input:    { width:"100%", background:C.anthracite, border:`1px solid ${C.anthraciteLight}`, borderRadius:7, padding:"9px 11px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", transition:"border-color 0.12s", boxSizing:"border-box" },
  select:   { width:"100%", background:C.anthracite, border:`1px solid ${C.anthraciteLight}`, borderRadius:7, padding:"9px 11px", color:C.text, fontSize:13, fontFamily:"inherit", outline:"none", cursor:"pointer", boxSizing:"border-box", appearance:"none" },
  btnCalc:  (hover) => ({ background: hover?C.orangeLight:C.orange, color:"#fff", border:"none", borderRadius:7, padding:"10px 26px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", transition:"background 0.12s", letterSpacing:"0.02em" }),
  btnReset: { background:"transparent", border:`1px solid ${C.anthraciteLight}`, borderRadius:7, padding:"10px 18px", color:C.textMuted, fontSize:12, cursor:"pointer", fontFamily:"inherit", marginLeft:10 },
  // résultats standard
  resCard:  { background:C.anthraciteMid, border:`1px solid ${C.anthraciteLight}`, borderRadius:10, padding:"20px", marginBottom:16 },
  resTitle: { fontSize:9, fontWeight:800, letterSpacing:"0.14em", textTransform:"uppercase", color:C.textDim, marginBottom:14 },
  resGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(152px,1fr))", gap:10 },
  resItem:  { background:C.anthracite, border:`1px solid ${C.anthraciteLight}`, borderRadius:7, padding:"12px 14px" },
  resLbl:   { fontSize:10, color:C.textMuted, marginBottom:5, lineHeight:1.3 },
  resVal:   { fontSize:20, fontWeight:700, color:C.text, lineHeight:1 },
  resUnit:  { fontSize:11, fontWeight:400, color:C.textDim, marginLeft:3 },
  resNote:  { fontSize:10, color:C.green, marginTop:3 },
  empty:    { textAlign:"center", color:C.textDim, fontSize:12, padding:"32px 0" },
  // ferraillage sections
  ferrSection:(color) => ({
    background: SECTION_COLORS[color].bg,
    border: `1px solid ${SECTION_COLORS[color].border}`,
    borderRadius:10, padding:"18px", marginBottom:14,
  }),
  ferrTitle:(color) => ({
    fontSize:10, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase",
    color: SECTION_COLORS[color].title, marginBottom:12,
  }),
  ferrGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 },
  ferrItem: (color, highlight) => ({
    background: highlight ? SECTION_COLORS[color].border : "rgba(0,0,0,0.25)",
    border: `1px solid ${SECTION_COLORS[color].border}`,
    borderRadius:7, padding:"11px 13px",
    ...(highlight ? { gridColumn:"1 / -1" } : {}),
  }),
  ferrLbl:(color) => ({ fontSize:10, color:SECTION_COLORS[color].accent, marginBottom:4, lineHeight:1.3 }),
  ferrVal:(highlight) => ({ fontSize: highlight?24:19, fontWeight:800, color:"#FFFFFF", lineHeight:1 }),
  ferrUnit:(color) => ({ fontSize:11, fontWeight:400, color:SECTION_COLORS[color].title, marginLeft:3 }),
  ferNote: { fontSize:10, color:"#aaa", marginTop:3 },
  // notice ferraillage
  notice: { background:"#1A1505", border:`1px solid ${C.amberDim}`, borderRadius:8, padding:"12px 16px", marginBottom:14, fontSize:11, color:C.amber, lineHeight:1.6 },
};

// ─── COMPOSANT ───────────────────────────────────────────────────────────
export default function App() {
  const [curMod, setCurMod]     = useState("gros-oeuvre");
  const [curSub, setCurSub]     = useState("terrassement");
  const [vals, setVals]         = useState({});
  const [results, setResults]   = useState(null);
  const [btnHover, setBtnHover] = useState(false);

  const findSub = () => {
    const m = MODULES.find(x => x.id === curMod);
    return m?.subcats.find(x => x.id === curSub);
  };
  const findMod = () => MODULES.find(x => x.id === curMod);

  const nav = (mId, sId) => { setCurMod(mId); setCurSub(sId); setVals({}); setResults(null); };

  const setVal = (id, v) => setVals(prev => ({ ...prev, [id]: v }));

  const calculate = () => {
    const sub = findSub();
    if (!sub) return;
    const parsed = {};
    sub.fields.forEach(f => {
      if (f.opts && typeof (vals[f.id] ?? f.def ?? f.opts[0]) === "string") {
        parsed[f.id] = vals[f.id] ?? f.def ?? f.opts[0];
      } else {
        const n = parseFloat(vals[f.id] ?? f.def ?? 0);
        parsed[f.id] = isNaN(n) ? 0 : n;
      }
    });
    try { setResults(sub.calc(parsed)); }
    catch (e) { setResults([{ l: "Erreur de calcul", v: "—", u: "" }]); }
  };

  const sub = findSub();
  const mod = findMod();
  const isFerr = sub?.isFerraillage;

  return (
    <div style={s.app}>
      {/* HEADER */}
      <header style={s.header}>
        <div style={s.logoWrap}>
          <div style={s.logoMark}>2A</div>
          <div>
            <div style={s.logoText}>2A DESIGN & BUILD</div>
            <div style={s.logoSub}>Calculateur de métrés BTP</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:C.textDim }}>9 modules · 20+ calculateurs</div>
      </header>

      <div style={s.layout}>
        {/* SIDEBAR */}
        <nav style={s.sidebar}>
          {MODULES.map(m => (
            <div key={m.id}>
              <div style={s.modLabel}>{m.icon} {m.label}</div>
              {m.subcats.map(sb => (
                <button key={sb.id} style={s.navItem(curSub === sb.id)} onClick={() => nav(m.id, sb.id)}>
                  {sb.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* MAIN */}
        <main style={s.main}>
          {sub ? (
            <>
              <div style={s.pageTitle}>
                {sub.label}
                <span style={s.modTag}>{mod?.label}</span>
              </div>
              <div style={s.pageDesc}>
                {isFerr
                  ? "Saisissez le poids théorique des plans — l'outil intègre recouvrements, ancrages, chutes et pertes chantier."
                  : "Saisissez les dimensions — quantités calculées avec marges de perte."}
              </div>

              {isFerr && (
                <div style={s.notice}>
                  ⚠ Recouvrements : {RECOUVREMENT_COEFF.recouvrement}×ø (Eurocode 2 / BAEL) · Ancrages : {RECOUVREMENT_COEFF.ancrage}×ø · Chutes automatiques : {RECOUVREMENT_COEFF.chute_pct}%
                </div>
              )}

              {/* FORM */}
              <div style={s.formCard}>
                <div style={s.fieldGrid}>
                  {sub.fields.map(f => (
                    <div key={f.id}>
                      <label style={s.fieldLabel}>{f.label}</label>
                      {f.opts ? (
                        <select
                          style={s.select}
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
                          style={s.input}
                          onChange={e => setVal(f.id, e.target.value)}
                          onFocus={e => (e.target.style.borderColor = C.orange)}
                          onBlur={e  => (e.target.style.borderColor = C.anthraciteLight)}
                        />
                      )}
                      {f.hint && <div style={s.fieldHint}>{f.hint}</div>}
                      {!f.hint && <div style={s.fieldUnit}>{f.unit}</div>}
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center" }}>
                  <button
                    style={s.btnCalc(btnHover)}
                    onMouseEnter={() => setBtnHover(true)}
                    onMouseLeave={() => setBtnHover(false)}
                    onClick={calculate}
                  >
                    Calculer
                  </button>
                  <button style={s.btnReset} onClick={() => { setVals({}); setResults(null); }}>
                    Réinitialiser
                  </button>
                </div>
              </div>

              {/* RESULTS */}
              {results ? (
                isFerr && results.type === "ferraillage" ? (
                  // ── RENDU SPÉCIAL FERRAILLAGE ──────────────────────────
                  <div>
                    {results.sections.map(sec => (
                      <div key={sec.title} style={s.ferrSection(sec.color)}>
                        <div style={s.ferrTitle(sec.color)}>{sec.title}</div>
                        <div style={s.ferrGrid}>
                          {sec.items.map((it, i) => (
                            <div key={i} style={s.ferrItem(sec.color, it.highlight)}>
                              <div style={s.ferrLbl(sec.color)}>{it.l}</div>
                              <div style={s.ferrVal(it.highlight)}>
                                {it.v}
                                <span style={s.ferrUnit(sec.color)}>{it.u}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // ── RENDU STANDARD ──────────────────────────────────────
                  <div style={s.resCard}>
                    <div style={s.resTitle}>Résultats du calcul</div>
                    <div style={s.resGrid}>
                      {(Array.isArray(results) ? results : []).map((r, i) => (
                        <div key={i} style={s.resItem}>
                          <div style={s.resLbl}>{r.l}</div>
                          <div style={s.resVal}>{r.v}<span style={s.resUnit}>{r.u}</span></div>
                          {r.n && <div style={s.resNote}>{r.n}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div style={s.resCard}>
                  <div style={s.empty}>Remplissez les champs et cliquez sur Calculer.</div>
                </div>
              )}
            </>
          ) : (
            <div style={s.empty}>Sélectionnez un calcul dans le menu.</div>
          )}
        </main>
      </div>
    </div>
  );
}
